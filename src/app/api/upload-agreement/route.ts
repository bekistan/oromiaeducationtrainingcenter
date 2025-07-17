
import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

export async function POST(req: NextRequest) {
  console.log('\n--- [API /upload-agreement] START ---');
  
  // --- Cloudinary Configuration ---
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const cloudinaryApiKeyEnv = process.env.CLOUDINARY_API_KEY;
  const cloudinaryApiSecretEnv = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !cloudinaryApiKeyEnv || !cloudinaryApiSecretEnv) {
    console.error("[API] FAILED: Cloudinary environment variables are not set.");
    return NextResponse.json({ error: "File upload service is not configured." }, { status: 500 });
  }
  cloudinary.config({
    cloud_name: cloudName,
    api_key: cloudinaryApiKeyEnv,
    api_secret: cloudinaryApiSecretEnv,
    secure: true,
  });

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const bookingId = formData.get('bookingId') as string | null;

    if (!file) return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
    if (!bookingId) return NextResponse.json({ error: 'Booking ID is required.' }, { status: 400 });

    console.log(`[API] Received agreement file: ${file.name}, for Booking ID: ${bookingId}`);

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    console.log('[API] Uploading new asset to Cloudinary using upload_stream with resource_type: auto');
    
    const cloudinaryUploadResult = await new Promise<{ secure_url?: string; error?: any }>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          { 
            folder: 'signed_agreements', // Simplified to a single top-level folder
            resource_type: 'auto' // Crucial change to auto-detect file type (PDF, image, etc.)
          }, 
          (error, result) => {
            if (error) {
              reject(error);
            } else {
              resolve({ secure_url: result?.secure_url });
            }
          }
        );
        uploadStream.end(buffer);
    });

    if (!cloudinaryUploadResult?.secure_url) {
      console.error('[API] Cloudinary upload failed:', cloudinaryUploadResult.error);
      return NextResponse.json({ error: 'Failed to upload agreement.', details: cloudinaryUploadResult.error?.message || 'Cloudinary did not return a secure URL.' }, { status: 500 });
    }
    
    const cloudinaryUrl = cloudinaryUploadResult.secure_url;
    console.log('[API] Cloudinary upload successful. URL:', cloudinaryUrl);
    
    console.log('--- [API /upload-agreement] END: Success ---');
    return NextResponse.json({
      message: "Agreement uploaded successfully.",
      url: cloudinaryUrl,
    }, { status: 200 });

  } catch (error: any) {
    console.error('--- [API /upload-agreement] END: UNHANDLED ERROR ---');
    console.error(error);
    return NextResponse.json({ error: 'Failed to process agreement upload.', details: error.message }, { status: 500 });
  }
}
