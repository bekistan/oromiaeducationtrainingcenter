
import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { db } from '@/lib/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { getAuth } from 'firebase/auth'; // Not used for server-side validation here, but could be

// This is a placeholder for a secure session validation mechanism
// In a real app, you'd use something like Next-Auth.js or Firebase Auth server-side validation
async function validateUserSession(req: NextRequest): Promise<{ isValid: boolean; userId?: string }> {
  // For now, we'll assume the request is valid if it reaches here.
  // This should be replaced with actual session validation logic.
  return { isValid: true };
}


export async function POST(req: NextRequest) {
  console.log('\n--- [API /upload-agreement] START ---');
  
  if (!db) {
    console.error("[API] FAILED: Firebase is not configured.");
    return NextResponse.json({ error: "Database service is not configured." }, { status: 500 });
  }

  // Securely validate user session
  const { isValid } = await validateUserSession(req);
  if (!isValid) {
    return NextResponse.json({ error: 'Unauthorized: Invalid session.' }, { status: 401 });
  }

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

    // Upload to Cloudinary
    console.log('[API] Uploading to Cloudinary...');
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    const cloudinaryUploadResult = await new Promise<{ secure_url?: string; error?: any }>((resolve, reject) => {
        cloudinary.uploader.upload_stream({ folder: 'signed_agreements', resource_type: 'auto' }, (error, result) => {
            if (error) reject(error);
            else resolve({ secure_url: result?.secure_url });
        }).end(buffer);
    });

    if (!cloudinaryUploadResult.secure_url) {
      console.error('[API] Cloudinary upload failed:', cloudinaryUploadResult.error);
      return NextResponse.json({ error: 'Failed to upload agreement.', details: cloudinaryUploadResult.error?.message }, { status: 500 });
    }
    const cloudinaryUrl = cloudinaryUploadResult.secure_url;
    console.log('[API] Cloudinary upload successful. URL:', cloudinaryUrl);
    
    // Update Firestore
    console.log('[API] Updating Firestore document...');
    const bookingRef = doc(db, "bookings", bookingId);
    await updateDoc(bookingRef, {
        signedAgreementUrl: cloudinaryUrl,
        agreementStatus: 'signed_by_client',
        agreementSignedAt: serverTimestamp(),
    });
    console.log('[API] Firestore update successful.');

    console.log('--- [API /upload-agreement] END: Success ---');
    return NextResponse.json({
      message: "Agreement uploaded successfully.",
      cloudinaryUrl: cloudinaryUrl,
    }, { status: 200 });

  } catch (error: any) {
    console.error('--- [API /upload-agreement] END: UNHANDLED ERROR ---');
    console.error(error);
    return NextResponse.json({ error: 'Failed to process agreement upload.', details: error.message }, { status: 500 });
  }
}
