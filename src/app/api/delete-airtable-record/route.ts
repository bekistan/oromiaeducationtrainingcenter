
import { NextRequest, NextResponse } from 'next/server';
import Airtable from 'airtable';

// Ensure your environment variables are set in .env.local or your hosting environment
// AIRTABLE_API_KEY
// AIRTABLE_BASE_ID
// AIRTABLE_TABLE_NAME (or ID)

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { recordId } = body;

    if (!recordId) {
      return NextResponse.json({ error: 'Record ID is required in the request body' }, { status: 400 });
    }

    const apiKey = process.env.AIRTABLE_API_KEY;
    const baseId = process.env.AIRTABLE_BASE_ID;
    const tableName = process.env.AIRTABLE_TABLE_NAME;

    if (!apiKey || !baseId || !tableName) {
      console.error('Airtable environment variables are not fully set.');
      return NextResponse.json({ error: 'Airtable configuration is missing on the server.' }, { status: 500 });
    }

    const base = new Airtable({ apiKey }).base(baseId);
    
    // Airtable API expects an array of record IDs for deletion
    const deletedRecords = await base(tableName).destroy([recordId]);

    if (deletedRecords && deletedRecords.length > 0 && deletedRecords[0].id === recordId) {
      return NextResponse.json({ message: `Record ${recordId} deleted successfully from Airtable.` }, { status: 200 });
    } else {
      // This case might occur if the record was already deleted or ID was invalid
      console.warn(`Airtable destroy operation for ${recordId} did not confirm deletion as expected. Response:`, deletedRecords);
      return NextResponse.json({ error: `Failed to confirm deletion of record ${recordId} from Airtable, or record not found.` }, { status: 404 });
    }

  } catch (error: any) {
    console.error('Error deleting record from Airtable via API route:', error);
    // Check for specific Airtable error structures if needed
    let errorMessage = 'Failed to delete record from Airtable.';
    if (error.message) {
        errorMessage = error.message;
    } else if (typeof error === 'object' && error !== null && 'error' in error) {
        // Airtable often returns an object with an 'error' key (e.g., {error: "NOT_FOUND"})
        const airtableError = error.error;
        if (typeof airtableError === 'string') {
            errorMessage = `Airtable error: ${airtableError}`;
        } else if (typeof airtableError === 'object' && airtableError !== null && 'message' in airtableError) {
            errorMessage = `Airtable error: ${(airtableError as {message: string}).message}`;
        }
    }
    
    return NextResponse.json({ error: errorMessage, details: error.toString() }, { status: 500 });
  }
}

// Optional: Add a GET or POST handler if you want to test the route endpoint presence
// (but actual deletion should only be via DELETE method)
export async function GET() {
  return NextResponse.json({ message: 'Airtable delete API route is active. Use DELETE method to delete records.' });
}
