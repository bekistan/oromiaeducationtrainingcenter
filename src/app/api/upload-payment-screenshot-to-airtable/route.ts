
import { NextRequest, NextResponse } from 'next/server';
import Airtable from 'airtable';
import { v2 as cloudinary } from 'cloudinary';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { getBuildingAdminPhoneNumbers } from '@/services/sms-service'; // Use the more specific function
import type { Booking, Dormitory } from '@/types'; // Import necessary types

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
        cloudinaryConfigError = "Cloudinary config object incomplete after setting. Check CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET.";
        console.error(`Critical: ${cloudinaryConfigError}`);
    }
  } catch (error: any) {
    cloudinaryConfigError = `Error during Cloudinary SDK configuration: ${error.message || JSON.stringify(error)}`;
    console.error(`Critical: ${cloudinaryConfigError}`);
  }
} else {
  cloudinaryConfigError = "Cloudinary environment variables for screenshot upload are not fully set (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET).";
  console.error(`Critical: ${cloudinaryConfigError}`);
}

export async function POST(req: NextRequest) {
  if (!isCloudinaryConfigured) {
    const serverConfigErrorMessage = cloudinaryConfigError || 'Cloudinary is not configured for screenshot uploads.';
    console.error(`API Call to /api/upload-payment-screenshot-to-airtable: ${serverConfigErrorMessage}`);
    return NextResponse.json({ error: 'Image server (Cloudinary) not configured. Please check server logs and environment variables.', details: serverConfigErrorMessage }, { status: 500 });
  }
  
  // --- Airtable Configuration (Read fresh on every request) ---
  const airtableApiKey = process.env.AIRTABLE_API_KEY;
  const airtableBaseId = process.env.AIRTABLE_BASE_ID;
  const airtableTableName = process.env.AIRTABLE_TABLE_NAME;

  if (!airtableApiKey || !airtableBaseId || !airtableTableName) {
    const serverConfigErrorMessage = "Airtable environment variables (AIRTABLE_API_KEY, AIRTABLE_BASE_ID, AIRTABLE_TABLE_NAME) are not fully set.";
    console.error(`API Call to /api/upload-payment-screenshot-to-airtable: ${serverConfigErrorMessage}`);
    return NextResponse.json({ error: 'Database (Airtable) not configured for screenshots. Please check server logs and environment variables.', details: serverConfigErrorMessage }, { status: 500 });
  }

  // **FIX:** Instantiate Airtable with the API key on every request for reliability.
  const base = new Airtable({ apiKey: airtableApiKey }).base(airtableBaseId);

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const bookingId = formData.get('bookingId') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided for screenshot upload.' }, { status: 400 });
    }
    if (!bookingId) {
      return NextResponse.json({ error: 'Booking ID is required for screenshot upload.' }, { status: 400 });
    }

    // --- START: New logic to find the correct recipient phone number ---
    let recipientPhoneNumbers: string[] = [];
    try {
        const bookingRef = doc(db, "bookings", bookingId);
        const bookingSnap = await getDoc(bookingRef);

        if (bookingSnap.exists()) {
            const bookingData = bookingSnap.data() as Booking;
            // Only proceed if it's a dormitory booking with items
            if (bookingData.bookingCategory === 'dormitory' && bookingData.items.length > 0) {
                const firstDormId = bookingData.items[0].id;
                const dormRef = doc(db, "dormitories", firstDormId);
                const dormSnap = await getDoc(dormRef);

                if (dormSnap.exists()) {
                    const dormData = dormSnap.data() as Dormitory;
                    const buildingName = dormData.buildingName;
                    if (buildingName) {
                        console.log(`[Airtable Upload] Found building "${buildingName}" for dorm ${firstDormId}. Fetching admin phone...`);
                        recipientPhoneNumbers = await getBuildingAdminPhoneNumbers(buildingName);
                        console.log(`[Airtable Upload] Found ${recipientPhoneNumbers.length} phone numbers for building admin:`, recipientPhoneNumbers.join(', '));
                    } else {
                        console.warn(`[Airtable Upload] Dormitory ${firstDormId} does not have a building name assigned.`);
                    }
                } else {
                     console.warn(`[Airtable Upload] Could not find dormitory document with ID: ${firstDormId}`);
                }
            }
        } else {
             console.warn(`[Airtable Upload] Could not find booking document with ID: ${bookingId}`);
        }
    } catch (dbError) {
        console.error('[Airtable Upload] Error fetching data from Firestore to determine recipient:', dbError);
        return NextResponse.json({ error: 'Failed to look up booking details to notify the correct admin.' }, { status: 500 });
    }
    
    if (recipientPhoneNumbers.length === 0) {
        console.warn(`[Airtable Upload] No specific building admin phone number found for booking ${bookingId}. An SMS will not be sent via Airtable automation for this upload.`);
    }
    // --- END: New logic ---

    // 1. Upload to Cloudinary
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const cloudinaryUploadResult = await new Promise<{ secure_url?: string; public_id?: string; error?: any }>((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          folder: 'payment_screenshots', 
          resource_type: 'image',
          access_mode: 'public',
        },
        (error, result) => {
          if (error) {
            console.error('Cloudinary upload_stream error for payment screenshot:', JSON.stringify(error, null, 2));
            reject({ error });
          } else {
            resolve({ secure_url: result?.secure_url, public_id: result?.public_id });
          }
        }
      ).end(buffer);
    });

    if (cloudinaryUploadResult.error || !cloudinaryUploadResult.secure_url) {
      const details = cloudinaryUploadResult.error?.error?.message || cloudinaryUploadResult.error?.message || 'Cloudinary upload failed or did not return a URL.';
      console.error('Failed to upload payment screenshot to Cloudinary:', details, 'Full error object:', JSON.stringify(cloudinaryUploadResult.error, null, 2));
      return NextResponse.json({ error: 'Failed to upload screenshot to image server.', details }, { status: 500 });
    }

    const cloudinaryUrl = cloudinaryUploadResult.secure_url;
    
    // **FIX:** Ensure all specified column names are used.
    const airtableRecordFields = {
      "Booking ID": bookingId,             
      "Screenshot": [{ url: cloudinaryUrl }],
      "Original Filename": file.name,
      "Recipient Phones": recipientPhoneNumbers.join(','),
      "Date": new Date().toISOString(),
    };

    const createdRecords = await base(airtableTableName).create([
      { fields: airtableRecordFields }
    ]);

    if (!createdRecords || createdRecords.length === 0) {
        console.error('Failed to create record in Airtable for screenshot. Booking ID:', bookingId, 'Cloudinary URL:', cloudinaryUrl);
        return NextResponse.json({ error: 'Failed to save screenshot information to Airtable database after successful image upload.' }, { status: 500 });
    }
    
    const airtableRecordId = createdRecords[0].id;
    
    // 3. Update the Firestore booking document with the screenshot URL and new status
    try {
        const bookingRef = doc(db, "bookings", bookingId);
        await updateDoc(bookingRef, {
            paymentScreenshotUrl: cloudinaryUrl,
            paymentScreenshotAirtableRecordId: airtableRecordId,
            paymentStatus: 'awaiting_verification', // Update status to show it's ready for verification
        });
    } catch (firestoreError) {
        console.error('Failed to update Firestore booking document:', firestoreError);
        // This is tricky. The file is in Cloudinary/Airtable but not linked in Firebase.
        // For now, we'll return an error to the user so they know something went wrong.
        // A more robust solution might involve a cleanup function or a retry mechanism.
        return NextResponse.json({
            error: 'screenshotUploadedButLinkFailed',
        }, { status: 500 });
    }


    return NextResponse.json({
      message: "Payment screenshot uploaded and recipient identified successfully.",
      fileName: file.name,
      bookingId: bookingId,
      cloudinaryUrl: cloudinaryUrl,
      airtableRecordId: airtableRecordId,
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error processing payment screenshot upload to Airtable API route:', error);
    let errorMessage = 'Failed to process screenshot upload on server.';
    if (error.message) {
        errorMessage = error.message;
    } else if (error.error && typeof error.error === 'object' && error.error.message) {
        errorMessage = error.error.message;
    } else if (typeof error.error === 'string') {
        errorMessage = error.error;
    }
    
    return NextResponse.json({ error: errorMessage, details: error.toString() }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return NextResponse.json({ message: 'Payment screenshot upload API route (Airtable integration) is active. Use POST method to upload files.' });
}
