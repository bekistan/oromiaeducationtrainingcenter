
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { gregorianDate } = await req.json();

    if (!gregorianDate || typeof gregorianDate !== 'string') {
      return NextResponse.json({ error: 'Invalid or missing gregorianDate field.' }, { status: 400 });
    }
    
    const apiUrl = `https://api.ethioall.com/convert/api?gc[]=${gregorianDate}`;
    
    console.log(`[API /convert-date] Calling external API: ${apiUrl}`);

    const apiResponse = await fetch(apiUrl);

    if (!apiResponse.ok) {
        const errorText = await apiResponse.text();
        console.error(`[API /convert-date] External API error: ${errorText}`);
        return NextResponse.json({ error: `External date conversion API failed with status: ${apiResponse.status}` }, { status: apiResponse.status });
    }
    
    const data = await apiResponse.json();

    // The API returns an array, we need the first element.
    const conversionResult = data[0];

    if (!conversionResult || !conversionResult.day || !conversionResult.month_name?.english || !conversionResult.year) {
        console.error('[API /convert-date] Invalid response format from external API:', data);
        return NextResponse.json({ error: 'Received invalid format from date conversion service.' }, { status: 500 });
    }
    
    const { day, month_name, year } = conversionResult;
    const ethiopianDate = `${month_name.english} ${day}, ${year}`;
    
    console.log(`[API /convert-date] Conversion successful: ${ethiopianDate}`);
    return NextResponse.json({ ethiopianDate });

  } catch (error: any) {
    console.error('[API /convert-date] Internal Error:', error);
    return NextResponse.json({ error: error.message || 'An unknown internal error occurred.' }, { status: 500 });
  }
}
