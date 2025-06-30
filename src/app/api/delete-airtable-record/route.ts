
import { NextRequest, NextResponse } from 'next/server';

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
    
    const airtableApiUrl = `https://api.airtable.com/v0/${baseId}/${tableName}?records[]=${recordId}`;
    
    const response = await fetch(airtableApiUrl, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (response.ok) {
      const responseData = await response.json();
      const deletedRecordId = responseData.records?.[0]?.id;
      if (deletedRecordId === recordId) {
        return NextResponse.json({ message: `Record ${recordId} deleted successfully.` }, { status: 200 });
      } else {
        return NextResponse.json({ error: `Failed to confirm deletion of record ${recordId}, or record not found.` }, { status: 404 });
      }
    } else {
        const errorData = await response.json();
        const errorMessage = errorData?.error?.message || `Airtable API returned status ${response.status}`;
        console.error('Error deleting record from Airtable:', errorMessage, errorData);
        return NextResponse.json({ error: errorMessage, details: errorData }, { status: response.status });
    }

  } catch (error: any) {
    console.error('Error processing DELETE request:', error);
    return NextResponse.json({ error: 'Failed to process delete request.', details: error.toString() }, { status: 500 });
  }
}
