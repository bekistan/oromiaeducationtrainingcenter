
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

    if (!file) return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
    if (!bookingId) return NextResponse.json({ error: 'Booking ID is required.' }, { status: 400 });
    console.log(`[API] Received agreement file: ${file.name}, for Booking ID: ${bookingId}`);

    // Fetch companyId from the booking document to create a nested folder structure.
    if (!db) {
        console.error('[API] FAILED: Database not configured.');
        return NextResponse.json({ error: 'Database service is not configured.' }, { status: 500 });
    }
    const bookingRef = doc(db, 'bookings', bookingId);
    const bookingSnap = await getDoc(bookingRef);
    if (!bookingSnap.exists()) {
        console.error(`[API] FAILED: Booking document not found for ID: ${bookingId}`);
        return NextResponse.json({ error: 'Booking not found.' }, { status: 404 });
    }
    const companyId = bookingSnap.data()?.companyId;
    if (!companyId) {
        console.error(`[API] FAILED: Booking ${bookingId} does not have a companyId.`);
        return NextResponse.json({ error: 'Booking is not associated with a company.' }, { status: 400 });
    }

    // --- Upload to Cloudinary using a stream with a nested folder path ---
    console.log('[API] Converting file to buffer and uploading to Cloudinary via stream...');
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const cloudinaryUploadResult = await new Promise<{ secure_url?: string; error?: any }>((resolve, reject) => {
      // Create a unique folder path for each agreement
      const folderPath = `signed_agreements/${companyId}/${bookingId}`;
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: folderPath, resource_type: 'auto' },
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
