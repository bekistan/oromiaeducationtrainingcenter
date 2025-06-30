
import { NextRequest, NextResponse } from 'next/server';
import Airtable from 'airtable';

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { recordId } = body;

    if (!recordId) {
      return NextResponse.json({ error: 'Record ID is required' }, { status: 400 });
    }

    const apiKey = process.env.AIRTABLE_API_KEY;
    const baseId = process.env.AIRTABLE_BASE_ID;
    const tableName = process.env.AIRTABLE_TABLE_NAME;

    if (!apiKey || !baseId || !tableName) {
      console.error('Airtable environment variables are not fully set for deletion.');
      return NextResponse.json({ error: 'Airtable configuration is missing on the server.' }, { status: 500 });
    }
    
    // Configure Airtable on every request
    Airtable.configure({ apiKey: apiKey });
    const base = new Airtable().base(baseId);

    const deletedRecords = await base(tableName).destroy([recordId]);

    if (deletedRecords && deletedRecords.length > 0 && deletedRecords[0].id === recordId) {
       return NextResponse.json({ message: `Record ${recordId} deleted successfully.` }, { status: 200 });
    } else {
       return NextResponse.json({ error: `Failed to confirm deletion of record ${recordId}, or record not found.` }, { status: 404 });
    }

  } catch (error: any) {
    console.error('Error processing DELETE request:', error);
    let errorMessage = 'Failed to process delete request.';
    if (error.message) {
        errorMessage = error.message;
    }
    return NextResponse.json({ error: errorMessage, details: error.toString() }, { status: 500 });
  }
}
