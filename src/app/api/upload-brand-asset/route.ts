
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

    // Convert the file to a Base64 data URI for direct upload
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const dataUri = `data:${file.type};base64,${buffer.toString('base64')}`;

    console.log('[API] Uploading new asset to Cloudinary using direct upload method...');
    
    // Use the simpler direct upload method
    const cloudinaryUploadResult = await cloudinary.uploader.upload(dataUri, {
      folder: 'brand_assets',
      resource_type: 'image'
    });

    if (!cloudinaryUploadResult?.secure_url) {
      console.error('[API] Cloudinary upload failed:', cloudinaryUploadResult);
      return NextResponse.json({ error: 'Failed to upload asset.', details: 'Cloudinary did not return a secure URL.' }, { status: 500 });
    }
    
    const cloudinaryUrl = cloudinaryUploadResult.secure_url;
    console.log('[API] Cloudinary upload successful. New URL:', cloudinaryUrl);
    
    // Update Firestore
    console.log('[API] Updating Firestore document with new URL...');
    const docRef = doc(db, BRAND_ASSETS_DOC_PATH);
    const fieldToUpdate = assetType === 'signature' ? 'signatureUrl' : 'stampUrl';
    
    await setDoc(docRef, {
        [fieldToUpdate]: cloudinaryUrl,
        lastUpdated: serverTimestamp(),
    }, { merge: true });
    console.log('[API] Firestore update successful.');

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
