
import { NextRequest, NextResponse } from 'next/server';
import Airtable from 'airtable';
import type { FieldSet, Record as AirtableRecord } from 'airtable';
import { v2 as cloudinary } from 'cloudinary';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { getBuildingAdminPhoneNumbers } from '@/services/sms-service';
import type { Booking, Dormitory } from '@/types';

export async function POST(req: NextRequest) {
  console.log('\n--- [API /upload-payment-screenshot] START ---');

  // --- Cloudinary Configuration (on-demand) ---
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const cloudinaryApiKeyEnv = process.env.CLOUDINARY_API_KEY;
  const cloudinaryApiSecretEnv = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !cloudinaryApiKeyEnv || !cloudinaryApiSecretEnv) {
    const errorMsg = "Cloudinary environment variables are not fully set on the server.";
    console.error(`[API] FAILED: ${errorMsg}`);
    return NextResponse.json({ error: errorMsg, details: "Check CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET." }, { status: 500 });
  }
  try {
    cloudinary.config({
      cloud_name: cloudName,
      api_key: cloudinaryApiKeyEnv,
      api_secret: cloudinaryApiSecretEnv,
      secure: true,
    });
     console.log('[API] Cloudinary configured successfully on-demand.');
  } catch (configError: any) {
    console.error('[API] FAILED: Error during Cloudinary SDK configuration:', configError);
    return NextResponse.json({ error: 'Image server configuration failed.', details: configError.message }, { status: 500 });
  }

  // --- Airtable Configuration (on-demand) ---
  const airtableApiKey = process.env.AIRTABLE_API_KEY;
  const airtableBaseId = process.env.AIRTABLE_BASE_ID;
  const airtableTableName = process.env.AIRTABLE_TABLE_NAME;

  if (!airtableApiKey || !airtableBaseId || !airtableTableName) {
    const errorMsg = "Airtable environment variables are not fully set on the server.";
    console.error(`[API] FAILED: ${errorMsg}`);
    return NextResponse.json({ error: errorMsg, details: "Check AIRTABLE_API_KEY, AIRTABLE_BASE_ID, AIRTABLE_TABLE_NAME." }, { status: 500 });
  }
  
  if (!db) {
    const errorMsg = "Firebase is not configured. Database is unavailable.";
    console.error(`[API] FAILED: ${errorMsg}`);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }


  try {
    const base = new Airtable({ apiKey: airtableApiKey }).base(airtableBaseId);
    console.log('[API] Airtable configured successfully on-demand.');

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const bookingId = formData.get('bookingId') as string | null;

    if (!file) return NextResponse.json({ error: 'No file provided for screenshot upload.' }, { status: 400 });
    if (!bookingId) return NextResponse.json({ error: 'Booking ID is required for screenshot upload.' }, { status: 400 });
    console.log(`[API] Received file: ${file.name}, for Booking ID: ${bookingId}`);

    // --- Recipient Phone Number Logic ---
    let recipientPhoneNumbers: string[] = [];
    try {
        const bookingRef = doc(db, "bookings", bookingId);
        const bookingSnap = await getDoc(bookingRef);
        if (bookingSnap.exists()) {
            const bookingData = bookingSnap.data() as Booking;
            if (bookingData.bookingCategory === 'dormitory' && bookingData.items.length > 0) {
                const firstDormId = bookingData.items[0].id;
                const dormRef = doc(db, "dormitories", firstDormId);
                const dormSnap = await getDoc(dormRef);
                if (dormSnap.exists()) {
                    const dormData = dormSnap.data() as Dormitory;
                    if (dormData.buildingName) {
                        recipientPhoneNumbers = await getBuildingAdminPhoneNumbers(dormData.buildingName);
                    }
                }
            }
        }
    } catch (dbError: any) {
        console.warn('[API] Warning: Failed to look up booking details to notify admin. Error:', dbError.message);
    }
    
    // 1. Upload to Cloudinary
    console.log('[API] Uploading to Cloudinary...');
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const cloudinaryUploadResult = await new Promise<{ secure_url?: string; error?: any }>((resolve, reject) => {
      cloudinary.uploader.upload_stream({ folder: 'payment_screenshots', resource_type: 'image' }, (error, result) => {
          if (error) {
            console.error('[API] Cloudinary upload_stream callback error:', JSON.stringify(error, null, 2));
            reject({ error: error });
          } else {
            resolve({ secure_url: result?.secure_url });
          }
        }).end(buffer);
    });

    if ('error' in cloudinaryUploadResult || !cloudinaryUploadResult.secure_url) {
      const details = (cloudinaryUploadResult as { error: any })?.error?.message || 'Cloudinary upload failed or did not return a URL.';
      console.error('[API] FAILED: Cloudinary upload failed. Details:', details);
      return NextResponse.json({ error: 'Failed to upload screenshot to image server.', details }, { status: 500 });
    }
    
    const cloudinaryUrl = cloudinaryUploadResult.secure_url;
    console.log('[API] Cloudinary upload successful. URL:', cloudinaryUrl);
    
    // 2. Create Airtable record
    console.log('[API] Creating Airtable record...');
    // The type for creating an attachment in Airtable is just { url: string }.
    // The library's `FieldSet` type is overly strict and expects a full Attachment object.
    // We cast to `any` to bypass this TypeScript error, as the runtime API call is correct.
    const airtableRecordFields: FieldSet = {
      "Booking ID": bookingId,             
      "Screenshot": [{ url: cloudinaryUrl }] as any,
      "Original Filename": file.name,
      "Recipient phones": recipientPhoneNumbers.join(','),
      "Date": new Date().toISOString(),
    };

    const createdRecords: readonly AirtableRecord<FieldSet>[] = await base(airtableTableName).create([
      { fields: airtableRecordFields }
    ]);
    
    if (!createdRecords || createdRecords.length === 0) {
        throw new Error('Airtable record creation returned no records.');
    }
    
    const airtableRecordId = createdRecords[0].id;
    console.log('[API] Airtable record created successfully. Record ID:', airtableRecordId);
    
    // 3. Update Firestore document
    console.log('[API] Updating Firestore document...');
    const bookingRef = doc(db, "bookings", bookingId);
    await updateDoc(bookingRef, {
        paymentScreenshotUrl: cloudinaryUrl,
        paymentScreenshotAirtableRecordId: airtableRecordId,
        paymentStatus: 'awaiting_verification',
    });
    console.log('[API] Firestore document updated successfully.');

    console.log('--- [API /upload-payment-screenshot] END: Success ---');
    return NextResponse.json({
      message: "Payment screenshot uploaded successfully.",
      cloudinaryUrl: cloudinaryUrl,
      airtableRecordId: airtableRecordId,
    }, { status: 200 });

  } catch (error: any) {
    console.error('[API] FAILED: Unhandled error in POST handler. Error:', error);
    let errorMessage = 'Failed to process screenshot upload on server.';
    if (error.message) {
        errorMessage = error.message;
    }
    
    // Provide more specific error feedback for common Airtable issues
    if (error.statusCode === 401 || error.statusCode === 403) {
      errorMessage = 'Airtable authentication failed. Please check your AIRTABLE_API_KEY.';
    } else if (error.statusCode === 404) {
      errorMessage = 'Airtable resource not found. Please check your AIRTABLE_BASE_ID and AIRTABLE_TABLE_NAME.';
    } else if (error.statusCode === 422) {
      errorMessage = 'Airtable schema mismatch. Please check your column names (e.g., "Booking ID", "Screenshot", "Recipient phones") and field types in your Airtable base.';
    }

    console.log('--- [API /upload-payment-screenshot] END: Failure ---');
    return NextResponse.json({ error: errorMessage, details: error.toString() }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return NextResponse.json({ message: 'Payment screenshot upload API route (Airtable integration) is active. Use POST method to upload files.' });
}
