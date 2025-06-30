
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  return NextResponse.json(
    {
      error: 'File upload service is not configured or has been disabled.',
      details: 'The Cloudinary service was removed from this application.',
    },
    { status: 501 } // 501 Not Implemented
  );
}
