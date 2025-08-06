
import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { db } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';

export async function POST(req: NextRequest) {
  console.log('\n--- [API /upload-payment-proof] START ---');

  // --- Cloudinary and DB Configuration Check (Pre-flight) ---
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const cloudinaryApiKeyEnv = process.env.CLOUDINARY_API_KEY;
  const cloudinaryApiSecretEnv = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !cloudinaryApiKeyEnv || !cloudinaryApiSecretEnv) {
    const errorMsg = "Cloudinary environment variables are not fully set on the server.";
    console.error(`[API] FAILED: ${errorMsg}`);
    return NextResponse.json({ error: "File upload service is not configured correctly on the server." }, { status: 500 });
  }
  
  if (!db) {
    const errorMsg = "Firebase is not configured. Database is unavailable.";
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

  // --- Main Logic ---
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const bookingId = formData.get('bookingId') as string | null;

    if (!file) return NextResponse.json({ error: 'No file provided for upload.' }, { status: 400 });
    if (!bookingId) return NextResponse.json({ error: 'Booking ID is required for upload.' }, { status: 400 });
    console.log(`[API] Received file: ${file.name}, for Booking ID: ${bookingId}`);

    // 1. Upload to Cloudinary using data URI
    console.log('[API] Step 1: Uploading to Cloudinary...');
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const dataUri = `data:${file.type};base64,${buffer.toString('base64')}`;
    
    const cloudinaryUploadResult = await cloudinary.uploader.upload(dataUri, {
        folder: 'payment_proofs',
        resource_type: 'image',
    });


    if (!cloudinaryUploadResult?.secure_url) {
      console.error('[API] FAILED at Step 1: Cloudinary upload failed.', cloudinaryUploadResult);
      return NextResponse.json({ error: 'Failed to upload image to server.', details: "Cloudinary did not return a secure URL." }, { status: 500 });
    }
    
    const cloudinaryUrl = cloudinaryUploadResult.secure_url;
    console.log('[API] Step 1 COMPLETE. Cloudinary URL:', cloudinaryUrl);
    
    // 2. Update Firestore document
    console.log('[API] Step 2: Updating Firestore document...');
    const bookingRef = doc(db, "bookings", bookingId);
    await updateDoc(bookingRef, {
        paymentScreenshotUrl: cloudinaryUrl,
        paymentStatus: 'awaiting_verification',
    });
    console.log('[API] Step 2 COMPLETE. Firestore document updated successfully.');

    console.log('--- [API /upload-payment-proof] END: Success ---');
    return NextResponse.json({
      message: "Payment proof uploaded successfully.",
      cloudinaryUrl: cloudinaryUrl,
    }, { status: 200 });

  } catch (error: any) {
    console.error('--- [API /upload-payment-proof] END: UNHANDLED ERROR ---');
    console.error(error);
    return NextResponse.json({ error: 'Failed to process upload.', details: error.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return NextResponse.json({ message: 'Payment proof upload API route is active. Use POST method to upload files.' });
}
