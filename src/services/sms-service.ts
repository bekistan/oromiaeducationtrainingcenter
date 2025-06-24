'use server';

import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import type { User } from '@/types';

// IMPORTANT: Replace these placeholders with your actual Afro Messaging credentials.
// For better security, it is highly recommended to use environment variables.
const API_KEY = process.env.AFRO_MESSAGING_API_KEY || 'eyJhbGciOiJIUzI1NiJ9.eyJpZGVudGlmaWVyIjoiNEc0VWlBdkpOYmhuN3FreGlkTW1kanNjdUpmNWVmcmQiLCJleHAiOjE5MDg1MjI1MzYsImlhdCI6MTc1MDc1NjEzNiwianRpIjoiNDhlMTYzNTEtNWMwMS00YjRhLThjNDMtNzIwYzQxMzU0MWJkIn0.nCIxiBKSupkf-ry1AnY6cHjz4P9OgZuL-_OrwGpiQC0';
const SENDER_ID = process.env.AFRO_MESSAGING_SENDER_ID || 'YourSenderID';
const API_URL = 'https://api.afromessage.com/api/send';

/**
 * Sends an SMS using the Afro Messaging API.
 * @param to - The recipient's phone number in E.164 format (e.g., +2519...).
 * @param message - The text message to send.
 * @returns A promise that resolves if the SMS is sent successfully.
 */
export async function sendSms(to: string, message: string): Promise<void> {
  if (API_KEY === 'YOUR_AFRO_MESSAGING_API_KEY' || SENDER_ID === 'YourSenderID') {
    console.warn('SMS sending is disabled. Please configure your Afro Messaging API Key and Sender ID in src/services/sms-service.ts');
    return;
  }

  // Basic validation for Ethiopian numbers
  if (!/^\+251[79]\d{8}$/.test(to)) {
      console.warn(`SMS not sent. Invalid phone number format for recipient: ${to}. Expected +251...`);
      return;
  }

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        to: to,
        from: SENDER_ID,
        message: message,
      }),
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error('Failed to send SMS via Afro Messaging API.', { status: response.status, body: responseData });
      throw new Error(`Afro Messaging API Error: ${responseData.message || 'Unknown error'}`);
    }

    console.log('SMS sent successfully to', to, 'Response:', responseData);
  } catch (error) {
    console.error('Error in sendSms function:', error);
    // Do not re-throw to prevent breaking user-facing flows
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
    .map(doc => (doc.data() as User).phone)
    .filter((phone): phone is string => !!phone && phone.trim() !== '');
  
  return [...new Set(phoneNumbers)]; // Return unique phone numbers
}

/**
 * Retrieves the phone numbers of all keyholders.
 * @returns A promise that resolves to an array of phone numbers.
 */
export async function getKeyholderPhoneNumbers(): Promise<string[]> {
    const q = query(collection(db, "users"), where("role", "===", "keyholder"));
    const querySnapshot = await getDocs(q);
    const phoneNumbers = querySnapshot.docs
      .map(doc => (doc.data() as User).phone)
      .filter((phone): phone is string => !!phone && phone.trim() !== '');
  
    return [...new Set(phoneNumbers)];
}
