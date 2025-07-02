
import { NextRequest, NextResponse } from 'next/server';

export async function DELETE(req: NextRequest) {
  // This functionality has been removed to simplify the application.
  // In a real-world scenario, if you needed to delete related Airtable records,
  // the logic would be re-implemented here securely.
  return NextResponse.json(
    { error: 'This functionality is currently disabled.' },
    { status: 501 } // 501 Not Implemented
  );
}
