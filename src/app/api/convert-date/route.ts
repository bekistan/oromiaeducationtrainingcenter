
import { NextRequest, NextResponse } from 'next/server';
import { convertToEthiopianDate } from '@/ai/flows/convert-date-flow';

export async function POST(req: NextRequest) {
  try {
    const { gregorianDate } = await req.json();

    if (!gregorianDate || typeof gregorianDate !== 'string') {
      return NextResponse.json({ error: 'Invalid or missing gregorianDate field.' }, { status: 400 });
    }
    
    console.log(`[API /convert-date] Received date for conversion: ${gregorianDate}`);
    
    // Call the Genkit flow to perform the conversion
    const ethiopianDate = await convertToEthiopianDate({ gregorianDate });

    if (!ethiopianDate) {
        console.error(`[API /convert-date] AI flow returned null for input: ${gregorianDate}`);
        return NextResponse.json({ error: 'Date conversion failed to produce a result.' }, { status: 500 });
    }

    console.log(`[API /convert-date] Conversion successful: ${ethiopianDate}`);
    return NextResponse.json({ ethiopianDate });

  } catch (error: any) {
    console.error('[API /convert-date] Error:', error);
    // Check if the error is from Genkit schema validation
    if (error.name === 'GenkitError' && error.message.includes('Schema validation failed')) {
        return NextResponse.json({ error: `AI model returned an invalid format. ${error.message}` }, { status: 500 });
    }
    return NextResponse.json({ error: error.message || 'An unknown error occurred.' }, { status: 500 });
  }
}
