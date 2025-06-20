
import { NextRequest, NextResponse } from 'next/server';
import Airtable from 'airtable'; // You'll need this for Airtable integration

// Ensure your environment variables are set in .env.local or your hosting environment
// AIRTABLE_API_KEY (or AIRTABLE_PAT)
// AIRTABLE_BASE_ID
// AIRTABLE_TABLE_NAME (for screenshots)

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const bookingId = formData.get('bookingId') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
    }
    if (!bookingId) {
      return NextResponse.json({ error: 'Booking ID is required.' }, { status: 400 });
    }

    // --- Airtable Upload Logic (To Be Implemented by User) ---
    // 1. Configure Airtable base
    //    const apiKey = process.env.AIRTABLE_API_KEY;
    //    const baseId = process.env.AIRTABLE_BASE_ID;
    //    const tableName = process.env.AIRTABLE_TABLE_NAME; // Should be your 'Screenshots' table
    //
    //    if (!apiKey || !baseId || !tableName) {
    //      console.error('Airtable environment variables for screenshot upload are not fully set.');
    //      return NextResponse.json({ error: 'Airtable configuration is missing on the server for screenshots.' }, { status: 500 });
    //    }
    //    const base = new Airtable({ apiKey }).base(baseId);

    // 2. Convert file to buffer or data URL if needed by Airtable SDK for attachments
    //    const fileBuffer = Buffer.from(await file.arrayBuffer());

    // 3. Find the relevant booking record (or create a new one in 'Screenshots' table)
    //    You might need to query your existing bookings table or the 'Screenshots' table
    //    to find where to attach this screenshot.
    //    For example, if 'Screenshots' table has a field linking to 'bookingId':
    //
    //    const records = await base(tableName).select({
    //      filterByFormula: `{Booking ID} = "${bookingId}"`, // Adjust field name as per your Airtable
    //      maxRecords: 1
    //    }).firstPage();
    //
    //    let recordIdToUpdate;
    //    if (records && records.length > 0) {
    //        recordIdToUpdate = records[0].id;
    //    } else {
    //        // Optionally create a new record if one doesn't exist for this bookingId
    //        const createdRecord = await base(tableName).create([{
    //            fields: {
    //                "Booking ID": bookingId, // Adjust field name
    //                // ... other fields for the new screenshot record
    //            }
    //        }]);
    //        recordIdToUpdate = createdRecord[0].id;
    //    }

    // 4. Upload the file as an attachment to the Airtable record
    //    if (recordIdToUpdate) {
    //        await base(tableName).update(recordIdToUpdate, {
    //            "Payment Screenshot": [ // Adjust field name for your attachment field
    //                {
    //                    filename: file.name,
    //                    // url: 'DIRECT_UPLOAD_TO_AIRTABLE_CDN_NOT_TYPICALLY_DONE_THIS_WAY'
    //                    // For Airtable attachments, you usually provide the file content or a public URL
    //                    // if you've uploaded it elsewhere first.
    //                    // The 'airtable' JS client might handle Buffers directly or require specific formats.
    //                    // Consult Airtable JS client documentation for attaching local files/buffers.
    //                    // One common pattern is to upload to a service like Cloudinary first,
    //                    // then link the Cloudinary URL in Airtable. But if Airtable's API supports direct
    //                    // upload of the file buffer via their SDK, use that.
    //                    // This part needs careful implementation based on Airtable's API capabilities for attachments.
    //                }
    //            ]
    //        });
    //    } else {
    //        throw new Error("Could not find or create a record in Airtable for this booking ID.");
    //    }

    // For now, returning a placeholder success response.
    // Replace this with actual Airtable upload logic and response.
    console.log(`Received payment screenshot for booking ID: ${bookingId}, File: ${file.name}`);
    const airtableRecordUrl = `https://airtable.com/${process.env.AIRTABLE_BASE_ID}/${process.env.AIRTABLE_TABLE_NAME}/some-record-id-placeholder`; // Placeholder

    return NextResponse.json({
      message: "File received by server. Airtable upload logic needs implementation.",
      fileName: file.name,
      bookingId: bookingId,
      // airtableRecordUrl: airtableRecordUrl, // Uncomment and use actual URL after upload
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error processing payment screenshot upload:', error);
    return NextResponse.json({ error: 'Failed to process screenshot upload on server.', details: error.message }, { status: 500 });
  }
}

// Optional: Add a GET handler if you want to test the route endpoint presence
export async function GET() {
  return NextResponse.json({ message: 'Payment screenshot upload API route is active. Use POST method to upload files.' });
}
    