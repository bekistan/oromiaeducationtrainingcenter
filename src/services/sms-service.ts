
'use server';

import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import type { User } from '@/types';

// Read all credentials from environment variables.
// IMPORTANT: Ensure these are set in your .env.local file for local development
// and in your deployment environment (e.g., Vercel, Netlify) for production.
const API_KEY = process.env.AFRO_MESSAGING_API_KEY;
const IDENTIFIER_ID = process.env.AFRO_MESSAGING_IDENTIFIER_ID; // Used as 'from' and as default 'sender'
const API_URL = 'https://api.afromessage.com/api/send'; // Afro Message POST API endpoint

/**
 * Sends an SMS using the Afro Messaging API. Throws an error on failure.
 * @param to - The recipient's phone number.
 * @param message - The text message to send.
 * @returns A promise that resolves if the SMS is sent successfully.
 * @throws {Error} If sending fails at any step.
 */
export async function sendSms(to: string, message: string): Promise<void> {
  console.log(`\n--- [SMS Service] START: Attempting to send SMS to: "${to}" ---`);

  if (!API_KEY || !IDENTIFIER_ID) {
    const errorMsg = `[SMS Service] FAILED: SMS sending is DISABLED because one or more required environment variables are not set.
      - AFRO_MESSAGING_API_KEY: ${API_KEY ? 'SET' : 'MISSING'}
      - AFRO_MESSAGING_IDENTIFIER_ID: ${IDENTIFIER_ID ? 'SET' : 'MISSING'}`;
    console.error(errorMsg);
    throw new Error('SMS service is not configured. Please check your environment variables and server logs.');
  }
  console.log('[SMS Service] Environment variables check PASSED.');

  const senderName = IDENTIFIER_ID;
  console.log(`[SMS Service] Using Identifier ID as Sender Name for reliability check: "${senderName}"`);


  let normalizedPhoneNumber = to.trim().replace(/[-() ]/g, '');

  if (normalizedPhoneNumber.startsWith('0')) {
    normalizedPhoneNumber = `+251${normalizedPhoneNumber.substring(1)}`;
  } else if (!normalizedPhoneNumber.startsWith('+251')) {
    if (normalizedPhoneNumber.length === 9 && (normalizedPhoneNumber.startsWith('7') || normalizedPhoneNumber.startsWith('9'))) {
        normalizedPhoneNumber = `+251${normalizedPhoneNumber}`;
    } else if (normalizedPhoneNumber.startsWith('251')) {
        normalizedPhoneNumber = `+${normalizedPhoneNumber}`;
    }
  }

  if (!/^\+251[79]\d{8}$/.test(normalizedPhoneNumber)) {
    const errorMsg = `[SMS Service] FAILED: Invalid Ethiopian phone number format after normalization. Original: "${to}", Final Normalized: "${normalizedPhoneNumber}". Expected format starting with +2517... or +2519...`;
    console.error(errorMsg);
    throw new Error(`Invalid phone number format for SMS: ${to}`);
  }
  console.log(`[SMS Service] Phone number normalized successfully. Original: "${to}", Normalized: "${normalizedPhoneNumber}"`);

  const requestBody = {
    from: IDENTIFIER_ID, 
    to: [normalizedPhoneNumber],
    message: message,
    sender: senderName,
  };

  console.log('[SMS Service] Preparing to send API POST request.');
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
      throw new Error(`SMS provider returned a non-2xx HTTP error. Status: ${response.status}. Body: ${responseBodyText}`);
    }

    let responseData;
    try {
      responseData = JSON.parse(responseBodyText);
    } catch (e) {
      throw new Error(`SMS provider returned a non-JSON response, although status was OK. Raw text: ${responseBodyText}`);
    }

    if (responseData.acknowledge !== 'success') {
      const failureReason = responseData.response?.message || JSON.stringify(responseData.response) || 'Unknown reason.';
      throw new Error(`SMS provider rejected the message: ${failureReason}`);
    }

    console.log(`[SMS Service] SUCCESS: SMS successfully submitted for recipient ${normalizedPhoneNumber}.`);
    console.log(`--- [SMS Service] END ---`);

  } catch (error: any) {
    console.error('[SMS Service] CRITICAL FAILURE:', error.message);
    throw error;
  }
}

/**
 * Retrieves the phone numbers of all general admins and superadmins.
 * @returns A promise that resolves to an array of phone numbers.
 */
export async function getAdminPhoneNumbers(): Promise<string[]> {
  const q = query(collection(db, "users"), where("role", "in", ["admin", "superadmin"]), where("buildingAssignment", "==", null));
  const querySnapshot = await getDocs(q);
  const phoneNumbers = querySnapshot.docs
    .map(doc => {
        const user = doc.data() as User;
        console.log(`[SMS Service] Checking user for general admin phone: ${user.email}, Phone: ${user.phone}`);
        return user.phone;
    })
    .filter((phone): phone is string => !!phone && phone.trim() !== '');
  
  console.log(`[SMS Service] Found ${phoneNumbers.length} unique general admin/superadmin phone numbers for notification.`);
  return [...new Set(phoneNumbers)];
}

/**
 * Retrieves the phone numbers of admins for a specific building.
 * @param buildingName - The name of the building ('ifaboru' or 'buuraboru').
 * @returns A promise that resolves to an array of phone numbers.
 */
export async function getBuildingAdminPhoneNumbers(buildingName: string): Promise<string[]> {
    const q = query(
        collection(db, "users"),
        where("role", "==", "admin"),
        where("buildingAssignment", "==", buildingName)
    );
    const querySnapshot = await getDocs(q);
    const phoneNumbers = querySnapshot.docs
        .map(doc => {
            const user = doc.data() as User;
            console.log(`[SMS Service] Checking user for building admin phone: ${user.email}, Phone: ${user.phone}`);
            return user.phone;
        })
        .filter((phone): phone is string => !!phone && phone.trim() !== '');

    console.log(`[SMS Service] Found ${phoneNumbers.length} phone numbers for building: ${buildingName}`);
    return [...new Set(phoneNumbers)];
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
