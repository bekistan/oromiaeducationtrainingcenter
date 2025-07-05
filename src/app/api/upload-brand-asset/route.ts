
import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { BRAND_ASSETS_DOC_PATH } from '@/constants';

export async function POST(req: NextRequest) {
  console.log('\n--- [API /upload-brand-asset] START ---');

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
  } catch (configError: any) {
    console.error('[API] FAILED: Error during Cloudinary SDK configuration:', configError);
    return NextResponse.json({ error: 'Image server configuration failed.', details: configError.message }, { status: 500 });
  }


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

    // --- Delete old asset before uploading new one ---
    const docRef = doc(db, BRAND_ASSETS_DOC_PATH);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      const fieldNameToGet = assetType === 'signature' ? 'signatureUrl' : 'stampUrl';
      const oldUrl = data[fieldNameToGet];
      
      if (oldUrl && typeof oldUrl === 'string') {
        try {
          const url = new URL(oldUrl);
          const pathParts = url.pathname.split('/');
          const uploadIndex = pathParts.indexOf('upload');

          if (uploadIndex > -1 && uploadIndex + 1 < pathParts.length) {
              const idParts = pathParts.slice(uploadIndex + 1);
              if (idParts[0].match(/^v\d+$/)) {
                  idParts.shift(); // Remove version number if present
              }
              const publicIdWithExt = idParts.join('/');
              const publicId = publicIdWithExt.substring(0, publicIdWithExt.lastIndexOf('.'));

              if (publicId) {
                  console.log(`[API] Deleting previous asset from Cloudinary. Public ID: ${publicId}`);
                  const deletionResult = await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
                  console.log("[API] Cloudinary deletion result:", deletionResult);
                  if (deletionResult.result !== 'ok' && deletionResult.result !== 'not found') {
                      console.warn(`[API] WARN: Cloudinary deletion failed for public_id ${publicId}. Result: ${deletionResult.result}`);
                  }
              }
          }
        } catch (deleteError) {
             console.error(`[API] ERROR: Exception during Cloudinary deletion. Proceeding with upload anyway.`, deleteError);
        }
      }
    }
    // --- End of deletion logic ---

    // Upload to Cloudinary
    console.log('[API] Uploading new asset to Cloudinary...');
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    const cloudinaryUploadResult = await new Promise<{ secure_url?: string; [key: string]: any; }>((resolve, reject) => {
        cloudinary.uploader.upload_stream({ folder: 'brand_assets', resource_type: 'image' }, (error, result) => {
            if (error) reject(error);
            else resolve(result as any);
        }).end(buffer);
    });

    if (!cloudinaryUploadResult?.secure_url) {
      console.error('[API] Cloudinary upload failed:', cloudinaryUploadResult);
      return NextResponse.json({ error: 'Failed to upload asset.', details: 'Cloudinary did not return a secure URL.' }, { status: 500 });
    }
    const cloudinaryUrl = cloudinaryUploadResult.secure_url;
    console.log('[API] Cloudinary upload successful. New URL:', cloudinaryUrl);
    
    // Update Firestore
    console.log('[API] Updating Firestore document with new URL...');
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
