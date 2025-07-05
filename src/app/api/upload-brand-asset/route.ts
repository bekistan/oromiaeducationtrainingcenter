
import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { db } from '@/lib/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { BRAND_ASSETS_DOC_PATH } from '@/constants';

export async function POST(req: NextRequest) {
  console.log('\n--- [API /upload-brand-asset] START ---');
  
  if (!db) {
    console.error("[API] FAILED: Firebase is not configured.");
    return NextResponse.json({ error: "Database service is not configured." }, { status: 500 });
  }

  // --- Cloudinary Configuration ---
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const cloudinaryApiKeyEnv = process.env.CLOUDINARY_API_KEY;
  const cloudinaryApiSecretEnv = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !cloudinaryApiKeyEnv || !cloudinaryApiSecretEnv) {
    const errorMsg = "Cloudinary environment variables are not fully set on the server.";
    console.error(`[API] FAILED: ${errorMsg}`);
    return NextResponse.json({ error: "Configuration error: Cloudinary credentials missing." }, { status: 500 });
  }

  try {
    cloudinary.config({
      cloud_name: cloudName,
      api_key: cloudinaryApiKeyEnv,
      api_secret: cloudinaryApiSecretEnv,
      secure: true,
    });
  } catch (configError: any) {
    console.error('[API] FAILED: Error during Cloudinary SDK configuration:', configError);
    return NextResponse.json({ error: 'Image server configuration failed.', details: configError.message }, { status: 500 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const assetType = formData.get('assetType') as 'signature' | 'stamp' | null;

    if (!file) return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
    if (!assetType) return NextResponse.json({ error: 'Asset type is required.' }, { status: 400 });
    console.log(`[API] Received brand asset: ${file.name}, for asset type: ${assetType}`);

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    console.log('[API] Uploading new asset to Cloudinary using upload_stream...');
    
    const cloudinaryUploadResult = await new Promise<{ secure_url?: string; error?: any }>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          { folder: 'brand_assets', resource_type: 'image' },
          (error, result) => {
            if (error) reject(error);
            else resolve({ secure_url: result?.secure_url });
          }
        );
        uploadStream.end(buffer);
      });

    if (!cloudinaryUploadResult?.secure_url) {
      console.error('[API] Cloudinary upload failed:', cloudinaryUploadResult.error);
      return NextResponse.json({ error: 'Failed to upload asset.', details: cloudinaryUploadResult.error?.message || 'Cloudinary did not return a secure URL.' }, { status: 500 });
    }
    
    const cloudinaryUrl = cloudinaryUploadResult.secure_url;
    console.log('[API] Cloudinary upload successful. New URL:', cloudinaryUrl);
    
    // Attempt to update Firestore, with specific error handling
    try {
        console.log('[API] Updating Firestore document with new URL...');
        const docRef = doc(db, BRAND_ASSETS_DOC_PATH);
        const fieldToUpdate = assetType === 'signature' ? 'signatureUrl' : 'stampUrl';
        
        await setDoc(docRef, {
            [fieldToUpdate]: cloudinaryUrl,
            lastUpdated: serverTimestamp(),
        }, { merge: true });
        console.log('[API] Firestore update successful.');
    } catch (firestoreError: any) {
        console.error('[API] FAILED: Error during Firestore update:', firestoreError);
        // Attempt to clean up the orphaned image since the DB update failed.
        try {
            const parts = cloudinaryUrl.split('/');
            const publicIdWithExt = parts.pop();
            const folder = parts.pop();
            if (publicIdWithExt && folder === 'brand_assets') {
                const publicId = publicIdWithExt.split('.')[0];
                console.log(`[API] Attempting to clean up orphaned Cloudinary image: brand_assets/${publicId}`);
                await cloudinary.uploader.destroy(`brand_assets/${publicId}`);
            }
        } catch (cleanupError: any) {
            console.error('[API] Failed to clean up orphaned image during error handling:', cleanupError.message);
        }

        return NextResponse.json({
            error: 'Database update failed after successful image upload.',
            details: firestoreError.message || 'An unknown Firestore error occurred.'
        }, { status: 500 });
    }

    console.log('--- [API /upload-brand-asset] END: Success ---');
    return NextResponse.json({
      message: "Brand asset uploaded successfully.",
      url: cloudinaryUrl,
    }, { status: 200 });

  } catch (error: any) {
    console.error('--- [API /upload-brand-asset] END: UNHANDLED ERROR ---');
    console.error(error);
    return NextResponse.json({ error: 'Failed to process brand asset upload.', details: error.message }, { status: 500 });
  }
}
