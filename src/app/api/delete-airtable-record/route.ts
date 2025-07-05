
import { NextRequest, NextResponse } from 'next/server';

export async function DELETE(req: NextRequest) {
  // This functionality has been removed as Airtable integration was deprecated.
  return NextResponse.json(
    { error: 'This functionality is no longer supported.' },
    { status: 410 } // 410 Gone
  );
}
