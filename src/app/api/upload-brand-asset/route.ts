
import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

// This API route is now responsible ONLY for uploading to Cloudinary and returning the URL.
// The authenticated client-side component will handle the Firestore database write.

export async function POST(req: NextRequest) {
  console.log('\n--- [API /upload-brand-asset] START ---');
  
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

    if (!file) {
        return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
    }
    
    console.log(`[API] Received brand asset: ${file.name}`);

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
    
    console.log('--- [API /upload-brand-asset] END: Success ---');
    return NextResponse.json({
      message: "Brand asset uploaded successfully.",
      url: cloudinaryUrl, // Return the URL to the client
    }, { status: 200 });

  } catch (error: any) {
    console.error('--- [API /upload-brand-asset] END: UNHANDLED ERROR ---');
    console.error(error);
    return NextResponse.json({ error: 'Failed to process brand asset upload.', details: error.message }, { status: 500 });
  }
}
