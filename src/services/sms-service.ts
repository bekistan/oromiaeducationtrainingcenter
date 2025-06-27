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
 * Sends an SMS using the Afro Messaging API via POST.
 * @param to - The recipient's phone number. Handles formats like 09..., +2519..., etc.
 * @param message - The text message to send.
 * @returns A promise that resolves if the SMS is sent successfully.
 */
export async function sendSms(to: string, message: string): Promise<void> {
  console.log(`[SMS Service] Preparing to send SMS. To: "${to}", Message: "${message}"`);

  if (!API_KEY || !SENDER_ID) {
    console.error('[SMS Service] SMS sending is DISABLED. AFRO_MESSAGING_API_KEY and/or AFRO_MESSAGING_SENDER_ID are not set in environment variables. Please configure them to enable SMS notifications.');
    return;
  }

  // More robust phone number normalization for Ethiopia
  let normalizedPhoneNumber = to.trim().replace(/ /g, ''); // Remove spaces
  normalizedPhoneNumber = normalizedPhoneNumber.replace(/[-()]/g, ''); // Remove brackets and dashes

  if (normalizedPhoneNumber.startsWith('09')) {
    normalizedPhoneNumber = `+2519${normalizedPhoneNumber.substring(2)}`;
  } else if (normalizedPhoneNumber.startsWith('9')) {
    normalizedPhoneNumber = `+2519${normalizedPhoneNumber.substring(1)}`;
  } else if (normalizedPhoneNumber.startsWith('2519')) {
     normalizedPhoneNumber = `+${normalizedPhoneNumber}`;
  } else if (normalizedPhoneNumber.startsWith('07')) {
    normalizedPhoneNumber = `+2517${normalizedPhoneNumber.substring(2)}`;
  } else if (normalizedPhoneNumber.startsWith('7')) {
    normalizedPhoneNumber = `+2517${normalizedPhoneNumber.substring(1)}`;
  } else if (normalizedPhoneNumber.startsWith('2517')) {
     normalizedPhoneNumber = `+${normalizedPhoneNumber}`;
  }

  if (!/^\+251[79]\d{8}$/.test(normalizedPhoneNumber)) {
    console.warn(`[SMS Service] SMS not sent. Invalid or unhandled Ethiopian phone number format. Original: "${to}", Normalized to: "${normalizedPhoneNumber}". Expected format: +251...`);
    return;
  }
  
  const requestBody = {
    to: normalizedPhoneNumber,
    sender: SENDER_ID, // Use 'sender' for the Sender Name as per docs
    message: message,
  };

  console.log('[SMS Service] Sending API POST request to Afro Messaging. URL:', API_URL, 'Body:', JSON.stringify(requestBody));

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
    let responseData;

    try {
      responseData = JSON.parse(responseBodyText);
    } catch (e) {
      console.error('[SMS Service] Failed to parse JSON response from Afro Messaging. Status:', response.status, 'Raw response:', responseBodyText);
      responseData = { rawResponse: responseBodyText };
    }

    if (!response.ok) {
      console.error(`[SMS Service] Afro Messaging API returned an error (Status: ${response.status}).`, {
        requestBody: requestBody,
        response: responseData,
      });
      return;
    }

    if (responseData.acknowledge === 'success') {
      console.log(`[SMS Service] SMS successfully submitted for recipient ${normalizedPhoneNumber}. Afro Messaging Response:`, responseData);
    } else {
      console.warn(`[SMS Service] SMS submission to Afro Messaging was not successful for ${normalizedPhoneNumber}. Response:`, responseData);
    }
  } catch (error) {
    console.error('[SMS Service] Network or other unexpected error in sendSms function:', error);
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
