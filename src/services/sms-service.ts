
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
 * Sends an SMS using the Afro Messaging API.
 * @param to - The recipient's phone number. Handles formats like 09..., +2519..., 07..., etc.
 * @param message - The text message to send.
 * @returns A promise that resolves if the SMS is sent successfully.
 */
export async function sendSms(to: string, message: string): Promise<void> {
  console.log(`[SMS Service] sendSms called. To: "${to}", Message: "${message}"`);
  if (!API_KEY || !SENDER_ID) {
    console.warn('[SMS Service] SMS sending is disabled. Please configure AFRO_MESSAGING_API_KEY and AFRO_MESSAGING_SENDER_ID in your environment variables.');
    return;
  }

  let normalizedPhoneNumber = to.trim().replace(/\s/g, ""); // Remove spaces
  
  if (normalizedPhoneNumber.startsWith('09')) {
    normalizedPhoneNumber = `+2519${normalizedPhoneNumber.substring(2)}`;
  } else if (normalizedPhoneNumber.startsWith('9')) {
    normalizedPhoneNumber = `+2519${normalizedPhoneNumber.substring(1)}`;
  } else if (normalizedPhoneNumber.startsWith('07')) {
    normalizedPhoneNumber = `+2517${normalizedPhoneNumber.substring(2)}`;
  } else if (normalizedPhoneNumber.startsWith('7')) {
    normalizedPhoneNumber = `+2517${normalizedPhoneNumber.substring(1)}`;
  }

  // Final validation check for E.164 format for Ethiopia (covers both 9... and 7... prefixes)
  if (!/^\+251[79]\d{8}$/.test(normalizedPhoneNumber)) {
      console.warn(`[SMS Service] SMS not sent. Invalid or unhandled phone number format. Original: "${to}", Normalized to: "${normalizedPhoneNumber}". Expected +251...`);
      return;
  }

  const payload = {
    to: normalizedPhoneNumber,
    from: SENDER_ID,
    message: message,
  };
  
  console.log('[SMS Service] Attempting to send SMS with payload:', JSON.stringify(payload, null, 2));

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const responseBodyText = await response.text();
    let responseData;
    try {
        responseData = JSON.parse(responseBodyText);
    } catch (e) {
        console.error('[SMS Service] Failed to parse JSON response from Afro Messaging. Raw response:', responseBodyText);
        // Do not re-throw, just log the error.
        return;
    }

    if (!response.ok) {
      console.error('[SMS Service] Failed to send SMS via Afro Messaging API.', { status: response.status, body: responseData, recipient: normalizedPhoneNumber });
    } else {
        if (responseData.acknowledge === 'success') {
            console.log('[SMS Service] SMS successfully submitted to Afro Messaging for', normalizedPhoneNumber, 'Response:', responseData);
        } else {
            console.warn('[SMS Service] SMS submission to Afro Messaging was not successful.', { recipient: normalizedPhoneNumber, response: responseData });
        }
    }
  } catch (error) {
    console.error('[SMS Service] Network or other error in sendSms function:', error);
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
