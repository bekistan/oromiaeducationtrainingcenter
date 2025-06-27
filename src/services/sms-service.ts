
'use server';

import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import type { User } from '@/types';

// Read all credentials from environment variables.
const API_KEY = process.env.AFRO_MESSAGING_API_KEY;
const SENDER_ID = process.env.AFRO_MESSAGING_SENDER_ID;
const IDENTIFIER_ID = process.env.AFRO_MESSAGING_IDENTIFIER_ID;
const API_URL = 'https://api.afromessage.com/api/send';

/**
 * Sends an SMS using the Afro Messaging POST API. Throws an error on failure.
 * @param to - The recipient's phone number.
 * @param message - The text message to send.
 * @returns A promise that resolves if the SMS is sent successfully.
 * @throws {Error} If sending fails at any step.
 */
export async function sendSms(to: string, message: string): Promise<void> {
  console.log(`\n--- [SMS Service] START: Attempting to send SMS to: "${to}" ---`);

  if (!API_KEY || !SENDER_ID || !IDENTIFIER_ID) {
    const errorMsg = `[SMS Service] FAILED: SMS sending is DISABLED. One or more required environment variables are not set. 
      - AFRO_MESSAGING_API_KEY: ${API_KEY ? 'SET' : 'MISSING'}
      - AFRO_MESSAGING_SENDER_ID: ${SENDER_ID ? 'SET' : 'MISSING'}
      - AFRO_MESSAGING_IDENTIFIER_ID: ${IDENTIFIER_ID ? 'SET' : 'MISSING'}`;
    console.error(errorMsg);
    throw new Error('SMS service is not configured on the server. Check server logs for details.');
  }
  console.log('[SMS Service] Environment variables check PASSED.');

  let normalizedPhoneNumber = to.trim().replace(/[-() ]/g, '');

  if (normalizedPhoneNumber.startsWith('0')) {
    normalizedPhoneNumber = `+251${normalizedPhoneNumber.substring(1)}`;
  } else if (normalizedPhoneNumber.startsWith('251')) {
    normalizedPhoneNumber = `+${normalizedPhoneNumber}`;
  } else if (normalizedPhoneNumber.length === 9 && (normalizedPhoneNumber.startsWith('9') || normalizedPhoneNumber.startsWith('7'))) {
    normalizedPhoneNumber = `+251${normalizedPhoneNumber}`;
  }

  if (!/^\+251[79]\d{8}$/.test(normalizedPhoneNumber)) {
    const errorMsg = `[SMS Service] FAILED: Invalid Ethiopian phone number format. Original: "${to}", Final Normalized: "${normalizedPhoneNumber}". Expected format starting with +251...`;
    console.error(errorMsg);
    throw new Error(`Invalid phone number format for SMS: ${to}`);
  }
  console.log(`[SMS Service] Phone number normalized successfully. Original: "${to}", Normalized: "${normalizedPhoneNumber}"`);

  const requestBody = {
    from: IDENTIFIER_ID,
    sender: SENDER_ID,
    to: normalizedPhoneNumber,
    message: message,
  };
  
  console.log('[SMS Service] Preparing to send API POST request.');
  console.log('[SMS Service] URL:', API_URL);
  console.log('[SMS Service] Request Body:', JSON.stringify(requestBody, null, 2));

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const responseBodyText = await response.text();
    console.log(`--- [SMS Service] API RESPONSE RECEIVED ---`);
    console.log(`[SMS Service] Response Status: ${response.status} ${response.statusText}`);
    console.log(`[SMS Service] Raw Response Body: ${responseBodyText}`);
    console.log(`----------------------------------------`);

    if (!response.ok) {
      const errorMsg = `[SMS Service] FAILED: API returned a non-2xx HTTP error. Status: ${response.status}. Body: ${responseBodyText}`;
      console.error(errorMsg);
      throw new Error(`SMS provider responded with HTTP error ${response.status}. See server logs for full response.`);
    }

    let responseData;
    try {
      responseData = JSON.parse(responseBodyText);
    } catch (e) {
      const errorMsg = `[SMS Service] FAILED: Could not parse JSON response from API, although status was OK. Raw text: ${responseBodyText}`;
      console.error(errorMsg);
      throw new Error(`SMS provider returned a non-JSON response. See server logs for details.`);
    }

    if (responseData.acknowledge !== 'success') {
      const failureReason = responseData.response?.message || JSON.stringify(responseData.response) || 'Unknown reason.';
      const errorMsg = `[SMS Service] FAILED: API acknowledged the request, but reported a failure. Reason: ${failureReason}`;
      console.error(errorMsg);
      throw new Error(`SMS provider rejected the message: ${failureReason}`);
    }

    console.log(`[SMS Service] SUCCESS: SMS successfully submitted for recipient ${normalizedPhoneNumber}.`);
    console.log(`--- [SMS Service] END ---`);

  } catch (error: any) {
    console.error('[SMS Service] FAILED: An exception occurred during the fetch call.', error.message, error.stack);
    // Re-throw the error to be caught by the calling action.
    throw error;
  }
}

/**
 * Retrieves the phone numbers of all admins and superadmins.
 * @returns A promise that resolves to an array of phone numbers.
 */
export async function getAdminPhoneNumbers(): Promise<string[]> {
  const q = query(collection(db, "users"), where("role", "in", ["admin", "superadmin"]));
  const querySnapshot = await getDocs(q);
  const phoneNumbers = querySnapshot.docs
    .map(doc => {
        const user = doc.data() as User;
        console.log(`[SMS Service] Checking user for admin phone: ${user.email}, Phone: ${user.phone}`);
        return user.phone;
    })
    .filter((phone): phone is string => !!phone && phone.trim() !== '');
  
  console.log(`[SMS Service] Found ${phoneNumbers.length} unique admin/superadmin phone numbers for notification.`);
  return [...new Set(phoneNumbers)]; // Return unique phone numbers
}

/**
 * Retrieves the phone numbers of all keyholders.
 * @returns A promise that resolves to an array of phone numbers.
 */
export async function getKeyholderPhoneNumbers(): Promise<string[]> {
    const q = query(collection(db, "users"), where("role", "==", "keyholder"));
    const querySnapshot = await getDocs(q);
    const phoneNumbers = querySnapshot.docs
      .map(doc => {
          const user = doc.data() as User;
          console.log(`[SMS Service] Checking user for keyholder phone: ${user.email}, Phone: ${user.phone}`);
          return user.phone;
      })
      .filter((phone): phone is string => !!phone && phone.trim() !== '');
  
    console.log(`[SMS Service] Found ${phoneNumbers.length} unique keyholder phone numbers for notification.`);
    return [...new Set(phoneNumbers)];
}
