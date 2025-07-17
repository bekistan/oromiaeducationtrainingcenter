
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

    // Convert file to a base64 string for direct upload
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64String = buffer.toString('base64');
    const dataUri = `data:${file.type};base64,${base64String}`;

    console.log('[API] Uploading new asset to Cloudinary with resource_type: auto...');
    
    // Using cloudinary.uploader.upload is more robust for various file types
    const cloudinaryUploadResult = await cloudinary.uploader.upload(dataUri, {
      folder: 'signed_agreements',
      resource_type: 'auto', // This is the crucial part to handle PDFs and other file types correctly
    });

    if (!cloudinaryUploadResult?.secure_url) {
      console.error('[API] Cloudinary upload failed:', cloudinaryUploadResult);
      return NextResponse.json({ error: 'Failed to upload agreement.', details: 'Cloudinary did not return a secure URL.' }, { status: 500 });
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
