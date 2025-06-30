
import { NextRequest, NextResponse } from 'next/server';
import Airtable from 'airtable';
import { v2 as cloudinary } from 'cloudinary';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { getBuildingAdminPhoneNumbers } from '@/services/sms-service';
import type { Booking, Dormitory } from '@/types';

// --- Cloudinary Configuration ---
let isCloudinaryConfigured = false;
let cloudinaryConfigError: string | null = null;

const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const cloudinaryApiKeyEnv = process.env.CLOUDINARY_API_KEY;
const cloudinaryApiSecretEnv = process.env.CLOUDINARY_API_SECRET;

if (cloudName && cloudinaryApiKeyEnv && cloudinaryApiSecretEnv) {
  try {
    cloudinary.config({
      cloud_name: cloudName,
      api_key: cloudinaryApiKeyEnv,
      api_secret: cloudinaryApiSecretEnv,
      secure: true,
    });
    if (cloudinary.config().api_key && cloudinary.config().api_secret && cloudinary.config().cloud_name) {
        isCloudinaryConfigured = true;
    } else {
        cloudinaryConfigError = "Cloudinary config object incomplete after setting.";
        console.error(`Critical: ${cloudinaryConfigError}`);
    }
  } catch (error: any) {
    cloudinaryConfigError = `Error during Cloudinary SDK configuration: ${error.message || JSON.stringify(error)}`;
    console.error(`Critical: ${cloudinaryConfigError}`);
  }
} else {
  cloudinaryConfigError = "Cloudinary environment variables for screenshot upload are not fully set.";
  console.error(`Critical: ${cloudinaryConfigError}`);
}

export async function POST(req: NextRequest) {
  if (!isCloudinaryConfigured) {
    const serverConfigErrorMessage = cloudinaryConfigError || 'Cloudinary is not configured for screenshot uploads.';
    return NextResponse.json({ error: 'Image server (Cloudinary) not configured.', details: serverConfigErrorMessage }, { status: 500 });
  }
  
  const airtableApiKey = process.env.AIRTABLE_API_KEY;
  const airtableBaseId = process.env.AIRTABLE_BASE_ID;
  const airtableTableName = process.env.AIRTABLE_TABLE_NAME;

  if (!airtableApiKey || !airtableBaseId || !airtableTableName) {
    const serverConfigErrorMessage = "Airtable environment variables are not fully set.";
    return NextResponse.json({ error: 'Database (Airtable) not configured.', details: serverConfigErrorMessage }, { status: 500 });
  }

  // Robust, per-request instantiation of Airtable
  const base = new Airtable({ apiKey: airtableApiKey }).base(airtableBaseId);

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const bookingId = formData.get('bookingId') as string | null;

    if (!file || !bookingId) {
      return NextResponse.json({ error: 'File and Booking ID are required.' }, { status: 400 });
    }

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
    } catch (dbError) {
        console.error('[Airtable Upload] Error fetching data from Firestore:', dbError);
    }
    
    // 1. Upload to Cloudinary
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const cloudinaryUploadResult = await new Promise<{ secure_url?: string; error?: any }>((resolve, reject) => {
      cloudinary.uploader.upload_stream({ folder: 'payment_screenshots', resource_type: 'image' }, (error, result) => {
          if (error) reject({ error });
          else resolve({ secure_url: result?.secure_url });
        }).end(buffer);
    });

    if (cloudinaryUploadResult.error || !cloudinaryUploadResult.secure_url) {
      const details = cloudinaryUploadResult.error?.error?.message || 'Cloudinary upload failed.';
      return NextResponse.json({ error: 'Failed to upload screenshot to image server.', details }, { status: 500 });
    }
    const cloudinaryUrl = cloudinaryUploadResult.secure_url;
    
    // 2. Create Airtable record with the correct schema
    const airtableRecordFields = {
      "Booking ID": bookingId,             
      "Screenshot": [{ url: cloudinaryUrl }],
      "Original Filename": file.name,
      "Recipient Phones": recipientPhoneNumbers.join(','),
      "Date": new Date().toISOString(),
    };

    const createdRecords = await base(airtableTableName).create([{ fields: airtableRecordFields }]);

    if (!createdRecords || createdRecords.length === 0) {
        return NextResponse.json({ error: 'Failed to save screenshot info to Airtable after upload.' }, { status: 500 });
    }
    
    const airtableRecordId = createdRecords[0].id;
    
    // 3. Update the Firestore booking document
    try {
        const bookingRef = doc(db, "bookings", bookingId);
        await updateDoc(bookingRef, {
            paymentScreenshotUrl: cloudinaryUrl,
            paymentScreenshotAirtableRecordId: airtableRecordId,
            paymentStatus: 'awaiting_verification',
        });
    } catch (firestoreError) {
        return NextResponse.json({ error: 'screenshotUploadedButLinkFailed' }, { status: 500 });
    }

    return NextResponse.json({
      message: "Payment screenshot uploaded successfully.",
      cloudinaryUrl: cloudinaryUrl,
      airtableRecordId: airtableRecordId,
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error processing payment screenshot upload:', error);
    let errorMessage = 'Failed to process screenshot upload on server.';
    if (error.message) errorMessage = error.message;
    
    return NextResponse.json({ error: errorMessage, details: error.toString() }, { status: 500 });
  }
}
