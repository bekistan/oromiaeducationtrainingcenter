
import { NextRequest, NextResponse } from 'next/server';
import Airtable from 'airtable';

export async function DELETE(req: NextRequest) {
  console.log('\n--- [API /delete-airtable-record] START ---');

  // --- Airtable Configuration (on-demand) ---
  const airtableApiKey = process.env.AIRTABLE_API_KEY;
  const airtableBaseId = process.env.AIRTABLE_BASE_ID;
  const airtableTableName = process.env.AIRTABLE_TABLE_NAME;

  if (!airtableApiKey || !airtableBaseId || !airtableTableName) {
    console.error('[API] FAILED: Airtable environment variables are not fully set for deletion.');
    return NextResponse.json({ error: 'Airtable configuration is missing on the server.' }, { status: 500 });
  }

  try {
    const body = await req.json();
    const { recordId } = body;

    if (!recordId) {
      return NextResponse.json({ error: 'Record ID is required' }, { status: 400 });
    }
    
    console.log(`[API] Attempting to delete Airtable record ID: ${recordId}`);
    const base = new Airtable({ apiKey: airtableApiKey }).base(airtableBaseId);

    const deletedRecords = await base(airtableTableName).destroy([recordId]);
    
    if (deletedRecords && deletedRecords.length > 0 && (deletedRecords[0] as any).id === recordId) {
        console.log(`[API] SUCCESS: Record ${recordId} deleted successfully.`);
        return NextResponse.json({ message: `Record ${recordId} deleted successfully.` }, { status: 200 });
    } else {
        console.warn(`[API] WARN: Failed to confirm deletion of record ${recordId}, or record not found.`);
        return NextResponse.json({ error: `Failed to confirm deletion of record ${recordId}, or record not found.` }, { status: 404 });
    }

  } catch (error: any) {
    console.error('############################################################');
    console.error('##### [API] UNHANDLED ERROR IN AIRTABLE DELETE ROUTE #####');
    console.error('############################################################');
    console.error('Error Object:', JSON.stringify(error, null, 2));
    if (error.stack) {
        console.error("Stack Trace:", error.stack);
    }
    let errorMessage = 'Failed to process delete request.';
    if (error.statusCode === 401 || error.statusCode === 403) {
      errorMessage = 'Airtable authentication failed. Please check your AIRTABLE_API_KEY permissions and scopes. It needs data.records:write access for deletion.';
    } else if (error.statusCode === 404) {
      errorMessage = 'Airtable resource not found. Please check your AIRTABLE_BASE_ID and AIRTABLE_TABLE_NAME.';
    }
    console.error('##################### END OF ERROR #####################');
    return NextResponse.json({ error: errorMessage, details: error.toString() }, { status: 500 });
  }
}
