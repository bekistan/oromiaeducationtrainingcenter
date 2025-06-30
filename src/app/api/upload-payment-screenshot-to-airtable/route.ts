
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  return NextResponse.json(
    {
      error: 'File upload service is not configured or has been disabled.',
      details: 'The Cloudinary service was removed from this application.',
    },
    { status: 501 } // 501 Not Implemented
  );
}

export async function GET(req: NextRequest) {
  return NextResponse.json({ message: 'Payment screenshot upload API route is inactive.' });
}
