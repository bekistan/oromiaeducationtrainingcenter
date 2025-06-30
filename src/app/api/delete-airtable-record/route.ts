
import { NextRequest, NextResponse } from 'next/server';
import Airtable from 'airtable';

export async function DELETE(req: NextRequest) {
  // --- Airtable Configuration (on-demand) ---
  const airtableApiKey = process.env.AIRTABLE_API_KEY;
  const airtableBaseId = process.env.AIRTABLE_BASE_ID;
  const airtableTableName = process.env.AIRTABLE_TABLE_NAME;

  if (!airtableApiKey || !airtableBaseId || !airtableTableName) {
    console.error('Airtable environment variables are not fully set for deletion.');
    return NextResponse.json({ error: 'Airtable configuration is missing on the server.' }, { status: 500 });
  }

  try {
    const body = await req.json();
    const { recordId } = body;

    if (!recordId) {
      return NextResponse.json({ error: 'Record ID is required' }, { status: 400 });
    }
    
    const base = new Airtable({ apiKey: airtableApiKey }).base(airtableBaseId);

    const deletedRecords = await base(airtableTableName).destroy([recordId]);
    
    if (deletedRecords && deletedRecords.length > 0 && (deletedRecords[0] as any).id === recordId) {
        return NextResponse.json({ message: `Record ${recordId} deleted successfully.` }, { status: 200 });
    } else {
        // This case might occur if the record was already deleted or never existed.
        return NextResponse.json({ error: `Failed to confirm deletion of record ${recordId}, or record not found.` }, { status: 404 });
    }

  } catch (error: any) {
    console.error('Error processing DELETE request to Airtable:', error);
    return NextResponse.json({ error: 'Failed to process delete request.', details: error.toString() }, { status: 500 });
  }
}
