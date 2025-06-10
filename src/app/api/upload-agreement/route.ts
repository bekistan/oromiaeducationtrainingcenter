
import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import type { NextRequest } from 'next/server';

let isCloudinaryConfigured = false;

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
        console.log("Cloudinary SDK configured successfully.");
    } else {
        console.error("Critical: Cloudinary config object incomplete after setting. Check variable integrity.");
    }
  } catch (error) {
    console.error("Critical: Error during Cloudinary SDK configuration:", error);
  }
} else {
  console.error("Critical: Cloudinary environment variables (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET) are not fully set. Upload API will not function.");
}


export async function POST(request: NextRequest) {
  if (!isCloudinaryConfigured) {
    console.error("API Call to /api/upload-agreement: Cloudinary is not configured due to missing or invalid environment variables.");
    return NextResponse.json({ error: 'Cloudinary not configured on server. Please check server logs and environment variable setup.' }, { status: 500 });
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

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload to Cloudinary
    const uploadResult = await new Promise<{ secure_url?: string; public_id?: string; error?: any }>((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          folder: `signed_agreements/${companyId}/${bookingId}`,
          resource_type: 'auto', 
        },
        (error, result) => {
          if (error) {
            console.error('Cloudinary upload error during stream:', error);
            reject({ error });
          } else {
            resolve({ secure_url: result?.secure_url, public_id: result?.public_id });
          }
        }
      ).end(buffer);
    });

    if (uploadResult.error || !uploadResult.secure_url) {
      console.error('Failed to upload to Cloudinary or secure_url missing:', uploadResult.error);
      return NextResponse.json({ error: 'Failed to upload file to Cloudinary.', details: uploadResult.error?.message || 'Unknown Cloudinary upload error' }, { status: 500 });
    }

    return NextResponse.json({ url: uploadResult.secure_url, publicId: uploadResult.public_id });

  } catch (error: any) {
    console.error('Error in /api/upload-agreement POST handler:', error);
    return NextResponse.json({ error: 'Internal server error during file upload.', details: error.message }, { status: 500 });
  }
}

