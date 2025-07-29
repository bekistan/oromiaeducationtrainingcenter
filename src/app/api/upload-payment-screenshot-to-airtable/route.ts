
import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { db } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';

// This API route is now responsible for ONLY uploading to Cloudinary and returning the URL.
// The client-side will handle the Firestore update.

export async function POST(req: NextRequest) {
  console.log('\n--- [API /upload-payment-proof] START ---');

  // --- Cloudinary Configuration ---
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const cloudinaryApiKeyEnv = process.env.CLOUDINARY_API_KEY;
  const cloudinaryApiSecretEnv = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !cloudinaryApiKeyEnv || !cloudinaryApiSecretEnv) {
    const errorMsg = "Cloudinary environment variables are not fully set on the server.";
    console.error(`[API] FAILED: ${errorMsg}`);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
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

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const bookingId = formData.get('bookingId') as string | null; // Kept for logging

    if (!file) return NextResponse.json({ error: 'No file provided for upload.' }, { status: 400 });
    if (!bookingId) return NextResponse.json({ error: 'Booking ID is required for upload.' }, { status: 400 });
    console.log(`[API] Received file: ${file.name}, for Booking ID: ${bookingId}`);

    // Upload to Cloudinary
    console.log('[API] Uploading to Cloudinary...');
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const cloudinaryUploadResult = await new Promise<{ secure_url?: string; error?: any }>((resolve, reject) => {
      cloudinary.uploader.upload_stream({ folder: 'payment_proofs', resource_type: 'image' }, (error, result) => {
          if (error) reject(error);
          else resolve({ secure_url: result?.secure_url });
        }).end(buffer);
    });

    if (!cloudinaryUploadResult.secure_url) {
      console.error('[API] FAILED: Cloudinary upload failed.', cloudinaryUploadResult.error);
      return NextResponse.json({ error: 'Failed to upload image to server.', details: cloudinaryUploadResult.error?.message }, { status: 500 });
    }
    
    const cloudinaryUrl = cloudinaryUploadResult.secure_url;
    console.log('[API] Cloudinary URL obtained:', cloudinaryUrl);
    
    // Send URL back to client
    console.log('--- [API /upload-payment-proof] END: Success ---');
    return NextResponse.json({
      message: "Payment proof uploaded to cloud successfully.",
      cloudinaryUrl: cloudinaryUrl, // IMPORTANT: Return URL to client
    }, { status: 200 });

  } catch (error: any)
    {
    console.error('--- [API /upload-payment-proof] END: UNHANDLED ERROR ---');
    console.error(error);
    return NextResponse.json({ error: 'Failed to process upload.', details: error.message }, { status: 500 });
  }
}
