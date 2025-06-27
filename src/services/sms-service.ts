
'use server';

import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import type { User } from '@/types';

// IMPORTANT: These credentials are now read from environment variables.
// Ensure they are set in your .env or .env.local file.
const API_KEY = process.env.AFRO_MESSAGING_API_KEY;
const SENDER_ID = process.env.AFRO_MESSAGING_SENDER_ID;
const API_URL = 'https://api.afromessage.com/api/send';

/**
 * Sends an SMS using the Afro Messaging API via POST. Throws an error on failure.
 * @param to - The recipient's phone number.
 * @param message - The text message to send.
 * @returns A promise that resolves if the SMS is sent successfully.
 * @throws {Error} If sending fails at any step.
 */
export async function sendSms(to: string, message: string): Promise<void> {
  console.log(`[SMS Service] Attempting to send SMS. To: "${to}"`);

  if (!API_KEY || !SENDER_ID) {
    const errorMsg = '[SMS Service] FAILED: SMS sending is DISABLED. AFRO_MESSAGING_API_KEY and/or AFRO_MESSAGING_SENDER_ID are not set in environment variables.';
    console.error(errorMsg);
    // Throw an error to ensure the calling function knows about the failure.
    throw new Error('SMS service is not configured on the server.');
  }

  // More robust phone number normalization for Ethiopia
  let normalizedPhoneNumber = to.trim().replace(/ /g, '');
  normalizedPhoneNumber = normalizedPhoneNumber.replace(/[-()]/g, '');

  if (normalizedPhoneNumber.startsWith('0')) {
    normalizedPhoneNumber = `+251${normalizedPhoneNumber.substring(1)}`;
  } else if (normalizedPhoneNumber.startsWith('251')) {
    normalizedPhoneNumber = `+${normalizedPhoneNumber}`;
  } else if (normalizedPhoneNumber.length === 9 && (normalizedPhoneNumber.startsWith('9') || normalizedPhoneNumber.startsWith('7'))) {
    normalizedPhoneNumber = `+251${normalizedPhoneNumber}`;
  }

  // Validate the final format
  if (!/^\+251[79]\d{8}$/.test(normalizedPhoneNumber)) {
    const errorMsg = `[SMS Service] FAILED: Invalid Ethiopian phone number format. Original: "${to}", Final Normalized: "${normalizedPhoneNumber}". Expected format: +251...`;
    console.error(errorMsg);
    throw new Error(`Invalid phone number format for SMS: ${to}`);
  }

  const requestBody = {
    to: normalizedPhoneNumber,
    sender: SENDER_ID,
    message: message,
  };

  console.log('[SMS Service] Sending API POST request to Afro Messaging with body:', JSON.stringify(requestBody));

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
    console.log('[SMS Service] Raw API Response:', `Status: ${response.status}`, `Body: ${responseBodyText}`);

    if (!response.ok) {
      // Handles HTTP errors like 401, 403, 500 etc.
      const errorMsg = `[SMS Service] FAILED: Afro Messaging API returned an HTTP error. Status: ${response.status}. Body: ${responseBodyText}`;
      console.error(errorMsg);
      throw new Error(`SMS provider responded with HTTP error ${response.status}.`);
    }

    const responseData = JSON.parse(responseBodyText);

    // Check for logical errors within a 2xx response
    if (responseData.acknowledge !== 'success') {
      const failureReason = responseData.response?.message || JSON.stringify(responseData.response);
      const errorMsg = `[SMS Service] FAILED: API acknowledged the request, but reported a failure. Reason: ${failureReason}`;
      console.error(errorMsg);
      throw new Error(`SMS provider rejected the message: ${failureReason}`);
    }

    console.log(`[SMS Service] SUCCESS: SMS successfully submitted for recipient ${normalizedPhoneNumber}. Response:`, responseData);

  } catch (error) {
    // Catches network errors, JSON parsing errors, or errors thrown from the logic above.
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
