
import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

export async function POST(req: NextRequest) {
  console.log('\n--- [API /upload-blog-image] START ---');

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

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided for upload.' }, { status: 400 });
    }
    console.log(`[API] Received blog image: ${file.name}`);

    // Convert file to data URI for Cloudinary upload
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const dataUri = `data:${file.type};base64,${buffer.toString('base64')}`;

    const cloudinaryUploadResult = await cloudinary.uploader.upload(dataUri, {
        folder: 'blog_images',
        resource_type: 'image',
    });

    if (!cloudinaryUploadResult?.secure_url) {
      console.error('[API] Cloudinary upload failed:', cloudinaryUploadResult);
      return NextResponse.json({ error: 'Failed to upload image to server.', details: "Cloudinary did not return a secure URL." }, { status: 500 });
    }

    const cloudinaryUrl = cloudinaryUploadResult.secure_url;
    console.log('[API] Cloudinary upload successful. URL:', cloudinaryUrl);

    console.log('--- [API /upload-blog-image] END: Success ---');
    return NextResponse.json({
      message: "Blog image uploaded successfully.",
      url: cloudinaryUrl,
    }, { status: 200 });

  } catch (error: any) {
    console.error('--- [API /upload-blog-image] END: UNHANDLED ERROR ---');
    console.error(error);
    return NextResponse.json({ error: 'Failed to process blog image upload.', details: error.message }, { status: 500 });
  }
}
