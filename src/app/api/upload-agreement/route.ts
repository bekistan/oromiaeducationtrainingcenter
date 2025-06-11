
import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import type { NextRequest } from 'next/server';

let isCloudinaryConfigured = false;
let cloudinaryConfigError: string | null = null;

// Attempt to configure Cloudinary at the module level
if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
  try {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true,
    });
    if (cloudinary.config().api_key && cloudinary.config().api_secret && cloudinary.config().cloud_name) {
        isCloudinaryConfigured = true;
        console.log("Cloudinary SDK configured successfully at module level.");
    } else {
        cloudinaryConfigError = "Cloudinary config object incomplete after setting. Check variable integrity.";
        console.error(`Critical: ${cloudinaryConfigError}`);
    }
  } catch (error: any) {
    cloudinaryConfigError = `Error during Cloudinary SDK configuration: ${error.message || JSON.stringify(error)}`;
    console.error(`Critical: ${cloudinaryConfigError}`);
  }
} else {
  cloudinaryConfigError = "Cloudinary environment variables (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET) are not fully set. Upload API will not function.";
  console.error(`Critical: ${cloudinaryConfigError}`);
}


export async function POST(request: NextRequest) {
  if (!isCloudinaryConfigured) {
    const serverConfigErrorMessage = cloudinaryConfigError || 'Cloudinary is not configured due to missing or invalid environment variables.';
    console.error(`API Call to /api/upload-agreement: ${serverConfigErrorMessage}`);
    return NextResponse.json({ error: 'Cloudinary not configured on server. Please check server logs and environment variable setup. Ensure CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET are correct in .env.local and the server was restarted.', details: serverConfigErrorMessage }, { status: 500 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const bookingId = formData.get('bookingId') as string | null;
    const companyId = formData.get('companyId') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
    }
    if (!bookingId || !companyId) {
        return NextResponse.json({ error: 'Missing bookingId or companyId.' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadResult = await new Promise<{ secure_url?: string; public_id?: string; error?: any; full_result?: any }>((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          folder: `signed_agreements/${companyId}/${bookingId}`,
          resource_type: 'auto',
        },
        (error, result) => {
          if (error) {
            console.error('Cloudinary upload_stream error object:', JSON.stringify(error, null, 2));
            if (error.http_code === 401 || (error.message && error.message.toLowerCase().includes('authentication failed'))) {
                console.error('Cloudinary returned an authentication error (401). This usually means your API Key, API Secret, or Cloud Name is incorrect. Please double-check these values in your .env.local file and ensure the server was restarted after any changes.');
            }
            reject({ error });
          } else {
            console.log('Cloudinary upload_stream successful result object:', JSON.stringify(result, null, 2)); // Log successful result
            resolve({ secure_url: result?.secure_url, public_id: result?.public_id, full_result: result });
          }
        }
      ).end(buffer);
    });

    if (uploadResult.error || !uploadResult.secure_url) {
      console.error('Failed to upload to Cloudinary or secure_url missing. Upload result error:', JSON.stringify(uploadResult.error, null, 2));
      let detailMessage = 'Unknown Cloudinary upload error';
      if (uploadResult.error) {
        detailMessage = typeof uploadResult.error === 'string' ? uploadResult.error : uploadResult.error.message || JSON.stringify(uploadResult.error);
        if (uploadResult.error.http_code === 401) {
            detailMessage = 'Cloudinary authentication failed (401). Check credentials in .env.local and restart server. ' + detailMessage;
        }
      }
      return NextResponse.json({ error: 'Failed to upload file to Cloudinary.', details: detailMessage }, { status: 500 });
    }

    return NextResponse.json({ url: uploadResult.secure_url, publicId: uploadResult.public_id });

  } catch (error: any) {
    // Log the full error structure if it's an object, otherwise log as is
    const errorDetails = (typeof error === 'object' && error !== null) ? JSON.stringify(error, Object.getOwnPropertyNames(error)) : String(error);
    console.error('Full error object in /api/upload-agreement POST handler:', errorDetails);
    
    let detailMessage = 'Unknown server error during upload process.';
    if (error.error && typeof error.error === 'object' && error.error !== null && error.error.message) {
      detailMessage = error.error.message;
    } else if (error.message) {
      detailMessage = error.message;
    } else if (typeof error.error === 'string') {
      detailMessage = error.error;
    }
    
    return NextResponse.json({ error: 'Internal server error during file upload.', details: detailMessage }, { status: 500 });
  }
}
