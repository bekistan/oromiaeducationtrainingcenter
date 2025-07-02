
import { NextRequest, NextResponse } from 'next/server';
import Airtable from 'airtable';
import type { FieldSet, Record as AirtableRecord } from 'airtable';
import { v2 as cloudinary } from 'cloudinary';
import { db } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';

export async function POST(req: NextRequest) {
  console.log('\n--- [API /upload-payment-screenshot] START ---');

  // --- Cloudinary Configuration ---
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
     console.log('[API] Cloudinary configured successfully.');
  } catch (configError: any) {
    console.error('[API] FAILED: Error during Cloudinary SDK configuration:', configError);
    return NextResponse.json({ error: 'Image server configuration failed.', details: configError.message }, { status: 500 });
  }

  // --- Airtable Configuration ---
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

  let step = 'START';
  try {
    step = 'CONFIG_AIRTABLE';
    const base = new Airtable({ apiKey: airtableApiKey }).base(airtableBaseId);
    console.log('[API] Airtable configured.');

    step = 'READ_FORM_DATA';
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const bookingId = formData.get('bookingId') as string | null;

    if (!file) return NextResponse.json({ error: 'No file provided for screenshot upload.' }, { status: 400 });
    if (!bookingId) return NextResponse.json({ error: 'Booking ID is required for screenshot upload.' }, { status: 400 });
    console.log(`[API] Received file: ${file.name}, for Booking ID: ${bookingId}`);

    // 1. Upload to Cloudinary
    step = 'UPLOAD_TO_CLOUDINARY';
    console.log('[API] Step 1: Uploading to Cloudinary...');
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
      throw new Error(`Cloudinary upload failed: ${details}`);
    }
    
    const cloudinaryUrl = cloudinaryUploadResult.secure_url;
    console.log('[API] Step 1 COMPLETE. Cloudinary upload successful. URL:', cloudinaryUrl);
    
    // 2. Create Airtable record
    step = 'CREATE_AIRTABLE_RECORD';
    console.log('[API] Step 2: Creating Airtable record...');
    const airtableRecordFields: FieldSet = {
      "Booking ID": bookingId,             
      "Screenshot": [{ url: cloudinaryUrl }],
      "Original Filename": file.name,
    };
    
    console.log('[API] Airtable Payload to be sent:', JSON.stringify(airtableRecordFields, null, 2));

    const createdRecords: readonly AirtableRecord<FieldSet>[] = await base(airtableTableName).create([
      { fields: airtableRecordFields }
    ], { typecast: true }); // Use typecast to help with data conversion
    
    if (!createdRecords || createdRecords.length === 0) {
        throw new Error('Airtable record creation returned no records.');
    }
    
    const airtableRecordId = createdRecords[0].id;
    console.log('[API] Step 2 COMPLETE. Airtable record created successfully. Record ID:', airtableRecordId);
    
    // 3. Update Firestore document
    step = 'UPDATE_FIRESTORE';
    console.log('[API] Step 3: Updating Firestore document...');
    const bookingRef = doc(db, "bookings", bookingId);
    await updateDoc(bookingRef, {
        paymentScreenshotUrl: cloudinaryUrl,
        paymentScreenshotAirtableRecordId: airtableRecordId,
        paymentStatus: 'awaiting_verification',
    });
    console.log('[API] Step 3 COMPLETE. Firestore document updated successfully.');

    step = 'SUCCESS';
    console.log('--- [API /upload-payment-screenshot] END: Success ---');
    return NextResponse.json({
      message: "Payment screenshot uploaded successfully.",
      cloudinaryUrl: cloudinaryUrl,
      airtableRecordId: airtableRecordId,
    }, { status: 200 });

  } catch (error: any) {
    console.error('############################################################');
    console.error(`##### [API] UNHANDLED ERROR IN SCREENSHOT UPLOAD ROUTE AT STEP: ${step} #####`);
    console.error('############################################################');
    console.error('Error Object:', JSON.stringify(error, null, 2));
    if (error.stack) {
        console.error("Stack Trace:", error.stack);
    }
    
    let errorMessage = `Failed to process screenshot upload on server at step: ${step}.`;
    if (error.message) {
        errorMessage = error.message;
    }
    
    // Check for specific Airtable error codes
    if (error.statusCode === 401 || error.statusCode === 403) {
      errorMessage = 'Airtable authentication failed. Please check your AIRTABLE_API_KEY permissions and scopes. It needs data.records:write access.';
    } else if (error.statusCode === 404) {
      errorMessage = 'Airtable resource not found. Please check your AIRTABLE_BASE_ID and AIRTABLE_TABLE_NAME.';
    } else if (error.statusCode === 422) {
      errorMessage = 'Airtable schema mismatch. Please check your column names (e.g., "Booking ID", "Screenshot", "Original Filename") and their field types in your Airtable base.';
    }

    console.log('--- [API /upload-payment-screenshot] END: Failure ---');
    return NextResponse.json({ error: errorMessage, details: error.toString() }, { status: 500 });
  }
}
