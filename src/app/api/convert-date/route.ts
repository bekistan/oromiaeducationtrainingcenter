
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { gregorianDate } = await req.json();

    if (!gregorianDate || typeof gregorianDate !== 'string') {
      return NextResponse.json({ error: 'Invalid or missing gregorianDate field.' }, { status: 400 });
    }
    
    // The gregorianDate is expected in 'YYYY-MM-DD' format.
    // The API expects year, month, and day as separate query parameters.
    const [year, month, day] = gregorianDate.split('-');

    if (!year || !month || !day) {
        return NextResponse.json({ error: 'Date must be in YYYY-MM-DD format.' }, { status: 400 });
    }

    const apiUrl = `https://api.ethioall.com/date/api?year=${year}&month=${month}&day=${day}`;
    
    console.log(`[API /convert-date] Calling external API: ${apiUrl}`);

    const apiResponse = await fetch(apiUrl);

    if (!apiResponse.ok) {
        const errorText = await apiResponse.text();
        console.error(`[API /convert-date] External API error: ${errorText}`);
        return NextResponse.json({ error: `External date conversion API failed with status: ${apiResponse.status}` }, { status: apiResponse.status });
    }
    
    const data = await apiResponse.json();

    if (!data.month_english || !data.date || !data.year) {
        console.error('[API /convert-date] Invalid response format from external API:', data);
        return NextResponse.json({ error: 'Received invalid format from date conversion service.' }, { status: 500 });
    }

    const ethiopianDate = `${data.month_english} ${data.date}, ${data.year}`;
    
    console.log(`[API /convert-date] Conversion successful: ${ethiopianDate}`);
    return NextResponse.json({ ethiopianDate });

  } catch (error: any) {
    console.error('[API /convert-date] Internal Error:', error);
    return NextResponse.json({ error: error.message || 'An unknown internal error occurred.' }, { status: 500 });
  }
}
