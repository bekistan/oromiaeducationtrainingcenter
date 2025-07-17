
import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

// This API route is now responsible ONLY for uploading to Cloudinary and returning the URL.
// The authenticated client-side component will handle the Firestore database write.

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
    const companyId = formData.get('companyId') as string | null;

    if (!file) return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
    if (!bookingId) return NextResponse.json({ error: 'Booking ID is required.' }, { status: 400 });
    if (!companyId) return NextResponse.json({ error: 'Company ID is required.' }, { status: 400 });

    console.log(`[API] Received agreement file: ${file.name}, for Booking ID: ${bookingId}`);

    // Convert file to a base64 string for direct upload
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const dataUri = `data:${file.type};base64,${buffer.toString('base64')}`;

    console.log('[API] Uploading new asset to Cloudinary using data URI...');
    
    const cloudinaryUploadResult = await cloudinary.uploader.upload(dataUri, {
      folder: `signed_agreements/${companyId}/${bookingId}`,
      resource_type: 'auto', // This is the critical change to auto-detect file type
      use_filename: true, // Use the original filename
      unique_filename: false, // Prevent Cloudinary from adding random characters
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
