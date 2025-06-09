
import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import type { NextRequest } from 'next/server';

// Configure Cloudinary
if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
  console.error("Cloudinary environment variables are not set!");
  // In a real app, you might throw an error or handle this more gracefully
} else {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true,
    });
}


export async function POST(request: NextRequest) {
  if (!cloudinary.config().api_secret) { // Check if cloudinary is configured
    return NextResponse.json({ error: 'Cloudinary not configured on server.' }, { status: 500 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const bookingId = formData.get('bookingId') as string | null;
    const companyId = formData.get('companyId') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
    }
    if (!bookingId || !companyId) {
        return NextResponse.json({ error: 'Missing bookingId or companyId.' }, { status: 400 });
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload to Cloudinary
    // Use a public_id that's unique and identifiable, e.g., within a folder structure
    const uploadResult = await new Promise<{ secure_url?: string; public_id?: string; error?: any }>((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          folder: `signed_agreements/${companyId}/${bookingId}`,
          // public_id: file.name.split('.')[0], // You can customize the public_id
          resource_type: 'auto', // Or 'raw' if you want to store as raw file
        },
        (error, result) => {
          if (error) {
            console.error('Cloudinary upload error:', error);
            reject({ error });
          } else {
            resolve({ secure_url: result?.secure_url, public_id: result?.public_id });
          }
        }
      ).end(buffer);
    });

    if (uploadResult.error || !uploadResult.secure_url) {
      console.error('Failed to upload to Cloudinary:', uploadResult.error);
      return NextResponse.json({ error: 'Failed to upload file to Cloudinary.', details: uploadResult.error?.message }, { status: 500 });
    }

    return NextResponse.json({ url: uploadResult.secure_url, publicId: uploadResult.public_id });

  } catch (error: any) {
    console.error('Error in /api/upload-agreement:', error);
    return NextResponse.json({ error: 'Internal server error during file upload.', details: error.message }, { status: 500 });
  }
}
