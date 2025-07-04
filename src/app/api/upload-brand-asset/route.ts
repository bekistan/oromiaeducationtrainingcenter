
import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { db } from '@/lib/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { BRAND_ASSETS_DOC_PATH } from '@/constants';

export async function POST(req: NextRequest) {
  console.log('\n--- [API /upload-brand-asset] START ---');

  // --- Cloudinary Configuration ---
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });

  if (!db) {
     console.error("[API] FAILED: Firebase is not configured.");
    return NextResponse.json({ error: "Database service is not configured." }, { status: 500 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const assetType = formData.get('assetType') as 'signature' | 'stamp' | null;

    if (!file) return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
    if (!assetType) return NextResponse.json({ error: 'Asset type is required.' }, { status: 400 });
    console.log(`[API] Received brand asset: ${file.name}, for asset type: ${assetType}`);

    // Upload to Cloudinary
    console.log('[API] Uploading to Cloudinary...');
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    const cloudinaryUploadResult = await new Promise<{ secure_url?: string; error?: any }>((resolve, reject) => {
        cloudinary.uploader.upload_stream({ folder: 'brand_assets', resource_type: 'image' }, (error, result) => {
            if (error) reject(error);
            else resolve({ secure_url: result?.secure_url });
        }).end(buffer);
    });

    if (!cloudinaryUploadResult.secure_url) {
      console.error('[API] Cloudinary upload failed:', cloudinaryUploadResult.error);
      return NextResponse.json({ error: 'Failed to upload asset.', details: cloudinaryUploadResult.error?.message }, { status: 500 });
    }
    const cloudinaryUrl = cloudinaryUploadResult.secure_url;
    console.log('[API] Cloudinary upload successful. URL:', cloudinaryUrl);
    
    // Update Firestore
    console.log('[API] Updating Firestore document...');
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
