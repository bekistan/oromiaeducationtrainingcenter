
import { NextRequest, NextResponse } from 'next/server';
import Airtable from 'airtable';
import { v2 as cloudinary } from 'cloudinary';

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

// --- Airtable Configuration ---
const airtableApiKey = process.env.AIRTABLE_API_KEY;
const airtableBaseId = process.env.AIRTABLE_BASE_ID;
const airtableTableName = process.env.AIRTABLE_TABLE_NAME;

let isAirtableConfigured = false;
let airtableConfigErrorMsg: string | null = null;
let airtableBase: Airtable.Base | null = null;

if (airtableApiKey && airtableBaseId && airtableTableName) {
    try {
        airtableBase = new Airtable({ apiKey: airtableApiKey }).base(airtableBaseId);
        isAirtableConfigured = true;
    } catch (error: any) {
        airtableConfigErrorMsg = `Error during Airtable SDK configuration: ${error.message || JSON.stringify(error)}`;
        console.error(`Critical: ${airtableConfigErrorMsg}`);
    }
} else {
    airtableConfigErrorMsg = "Airtable environment variables (AIRTABLE_API_KEY, AIRTABLE_BASE_ID, AIRTABLE_TABLE_NAME) are not fully set.";
    console.error(`Critical: ${airtableConfigErrorMsg}`);
}


export async function POST(req: NextRequest) {
  if (!isCloudinaryConfigured) {
    const serverConfigErrorMessage = cloudinaryConfigError || 'Cloudinary is not configured for screenshot uploads.';
    console.error(`API Call to /api/upload-payment-screenshot-to-airtable: ${serverConfigErrorMessage}`);
    return NextResponse.json({ error: 'Image server (Cloudinary) not configured. Please check server logs and environment variables.', details: serverConfigErrorMessage }, { status: 500 });
  }

  if (!isAirtableConfigured || !airtableBase) {
    const serverConfigErrorMessage = airtableConfigErrorMsg || 'Airtable is not configured for screenshot uploads.';
    console.error(`API Call to /api/upload-payment-screenshot-to-airtable: ${serverConfigErrorMessage}`);
    return NextResponse.json({ error: 'Database (Airtable) not configured for screenshots. Please check server logs and environment variables.', details: serverConfigErrorMessage }, { status: 500 });
  }

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

    // 2. Create Airtable record with the Cloudinary URL
    // **** IMPORTANT: Adjust the keys in this object to MATCH your Airtable field names ****
    const airtableRecordFields = {
      "Booking ID": bookingId,             // Example: If your field is "booking_id", change this line
      "Screenshot": [{ url: cloudinaryUrl }], // For Airtable "Attachment" field type
      "Original Filename": file.name,
      "Uploaded At": new Date().toISOString(), // Ensure "Uploaded At" is a Date field in Airtable
    };

    const createdRecords = await airtableBase(airtableTableName).create([
      { fields: airtableRecordFields }
    ]);

    if (!createdRecords || createdRecords.length === 0) {
        console.error('Failed to create record in Airtable for screenshot. Booking ID:', bookingId, 'Cloudinary URL:', cloudinaryUrl);
        return NextResponse.json({ error: 'Failed to save screenshot information to Airtable database after successful image upload.' }, { status: 500 });
    }
    
    const airtableRecordId = createdRecords[0].id;

    return NextResponse.json({
      message: "Payment screenshot uploaded and linked in Airtable successfully.",
      fileName: file.name,
      bookingId: bookingId,
      cloudinaryUrl: cloudinaryUrl,
      airtableRecordId: airtableRecordId,
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error processing payment screenshot upload to Airtable API route:', error);
    let errorMessage = 'Failed to process screenshot upload on server.';
    // Attempt to extract a more specific error message from Airtable or Cloudinary errors
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

    