
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
  console.log(`[SMS Service] Attempting to send SMS via POST. To: "${to}"`);

  if (!API_KEY || !SENDER_ID) {
    const errorMsg = '[SMS Service] FAILED: SMS sending is DISABLED. AFRO_MESSAGING_API_KEY and/or AFRO_MESSAGING_SENDER_ID are not set in environment variables.';
    console.error(errorMsg);
    throw new Error('SMS service is not configured on the server. API Key or Sender ID missing.');
  }

  // Robust phone number normalization for Ethiopia
  let normalizedPhoneNumber = to.trim().replace(/[-() ]/g, ''); // Remove spaces, hyphens, parentheses

  if (normalizedPhoneNumber.startsWith('0')) {
    normalizedPhoneNumber = `+251${normalizedPhoneNumber.substring(1)}`;
  } else if (normalizedPhoneNumber.startsWith('251')) {
    normalizedPhoneNumber = `+${normalizedPhoneNumber}`;
  } else if (normalizedPhoneNumber.length === 9 && (normalizedPhoneNumber.startsWith('9') || normalizedPhoneNumber.startsWith('7'))) {
    normalizedPhoneNumber = `+251${normalizedPhoneNumber}`;
  }

  if (!/^\+251[79]\d{8}$/.test(normalizedPhoneNumber)) {
    const errorMsg = `[SMS Service] FAILED: Invalid Ethiopian phone number format. Original: "${to}", Final Normalized: "${normalizedPhoneNumber}". Expected format: +251...`;
    console.error(errorMsg);
    throw new Error(`Invalid phone number format for SMS: ${to}`);
  }

  // Construct the request body as per the documentation
  const requestBody: {
    to: string;
    sender: string;
    message: string;
    from?: string;
  } = {
    to: normalizedPhoneNumber,
    sender: SENDER_ID,
    message: message,
  };

  // Only include the 'from' identifier if it's provided.
  if (IDENTIFIER_ID) {
    requestBody.from = IDENTIFIER_ID;
  } else {
    console.warn('[SMS Service] AFRO_MESSAGING_IDENTIFIER_ID is not set. The default identifier will be used by the API.');
  }


  console.log('[SMS Service] Sending API POST request with body:', JSON.stringify(requestBody));

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
    console.log(`[SMS Service] Raw API Response - Status: ${response.status}, Body: ${responseBodyText}`);

    let responseData;
    try {
        responseData = JSON.parse(responseBodyText);
    } catch (e) {
        console.error(`[SMS Service] FAILED: Could not parse JSON response from API. Raw text: ${responseBodyText}`);
        throw new Error(`SMS provider returned non-JSON response. Status: ${response.status}.`);
    }

    if (!response.ok) {
      const failureReason = responseData.response?.message || JSON.stringify(responseData.response) || 'Unknown error';
      const errorMsg = `[SMS Service] FAILED: API returned an HTTP error. Status: ${response.status}. Reason: ${failureReason}`;
      console.error(errorMsg);
      throw new Error(`SMS provider responded with HTTP error ${response.status}: ${failureReason}`);
    }

    if (responseData.acknowledge !== 'success') {
      const failureReason = responseData.response?.message || JSON.stringify(responseData.response);
      const errorMsg = `[SMS Service] FAILED: API acknowledged the request, but reported a failure. Reason: ${failureReason}`;
      console.error(errorMsg);
      throw new Error(`SMS provider rejected the message: ${failureReason}`);
    }

    console.log(`[SMS Service] SUCCESS: SMS successfully submitted for recipient ${normalizedPhoneNumber}. Response:`, responseData);

  } catch (error) {
    console.error('[SMS Service] FAILED: An exception occurred in the sendSms function.', error);
    // Re-throw the error so the calling function's catch block is triggered.
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
