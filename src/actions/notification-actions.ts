
'use server';

import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { getAdminPhoneNumbers, getKeyholderPhoneNumbers, sendSms } from '@/services/sms-service';
import type { Booking, AdminNotification } from '@/types';
import { toDateObject } from '@/lib/date-utils';

// It's important to set this in your environment variables for production.
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:9002';

/**
 * Notifies relevant parties about a new booking.
 * - Sends an SMS to Admins for new FACILITY bookings.
 * - Creates a web notification for ALL new bookings.
 * @param booking - The newly created booking object.
 */
export async function notifyAdminsOfNewBooking(booking: Booking): Promise<void> {
  console.log('--- [Notification Action] START: notifyAdminsOfNewBooking ---');
  console.log('[Notification Action] Received booking object:', JSON.stringify(booking, null, 2));

  try {
    const customerName = booking.guestName || booking.companyName || 'Unknown';
    const bookingCategoryCapitalized = booking.bookingCategory.charAt(0).toUpperCase() + booking.bookingCategory.slice(1);
    
    console.log(`[Notification Action] Customer: ${customerName}, Category: ${bookingCategoryCapitalized}`);

    const notificationLink = booking.bookingCategory === 'dormitory' 
      ? `/admin/manage-dormitory-bookings#${booking.id}` 
      : `/admin/manage-facility-bookings#${booking.id}`;
    const fullLink = `${BASE_URL}${notificationLink}`;

    console.log(`[Notification Action] Generated Link: ${fullLink}`);
    
    // --- SMS Notification Logic ---
    // Only send SMS for new FACILITY bookings
    if (booking.bookingCategory === 'facility') {
        const smsMessage = `New Facility Booking from ${customerName}. Total: ${booking.totalCost} ETB. View: ${fullLink}`;
        
        console.log('[Notification Action] Facility booking detected. Getting admin phone numbers...');
        const adminPhoneNumbers = await getAdminPhoneNumbers();
        console.log(`[Notification Action] Found ${adminPhoneNumbers.length} admin phone numbers:`, adminPhoneNumbers.join(', '));

        if (adminPhoneNumbers.length > 0) {
          console.log('[Notification Action] Starting SMS loop for facility booking...');
          for (const phone of adminPhoneNumbers) {
            console.log(`[Notification Action] Preparing to send SMS to ${phone}`);
            try {
              await sendSms(phone, smsMessage);
              console.log(`[Notification Action] SMS submission to provider for ${phone} was successful.`);
            } catch (smsError: any) {
              console.error(`################################################################`);
              console.error(`##### [Notification Action] FAILED TO SEND SMS TO ADMIN: ${phone} #####`);
              console.error("The error occurred while trying to send an SMS for booking ID:", booking.id);
              console.error("The caught error object is below:");
              console.error(smsError);
              if (smsError.stack) {
                console.error("Stack trace:", smsError.stack);
              }
              console.error("####################### END OF SMS FAILURE #######################");
            }
          }
          console.log('[Notification Action] Finished SMS loop.');
        } else {
          console.log('[Notification Action] No admin phone numbers found for facility booking. Skipping SMS sending.');
        }
    } else {
        console.log(`[Notification Action] Booking category is "${booking.bookingCategory}". Admin SMS notification is only for facility bookings. Skipping.`);
    }

    // --- Web Notification Logic ---
    // Create web notification for ALL new bookings
    console.log('[Notification Action] Creating web notification in Firestore for all booking types...');
    const webMessage = `New ${bookingCategoryCapitalized} booking from ${customerName}. Total: ${booking.totalCost} ETB. ID: ${booking.id.substring(0, 6)}...`;
    const notificationType = booking.bookingCategory === 'dormitory' ? 'new_dormitory_booking' : 'new_facility_booking';
    
    const webNotification = {
      message: webMessage,
      type: notificationType,
      relatedId: booking.id,
      recipientRole: 'admin' as const,
      isRead: false,
      createdAt: serverTimestamp(),
      link: notificationLink,
    };
    await addDoc(collection(db, "notifications"), webNotification);
    console.log('[Notification Action] Web notification created successfully.');

  } catch (error: any) {
    console.error("################################################################");
    console.error("##### [Notification Action] CRITICAL UNHANDLED FAILURE IN MAIN TRY BLOCK! #####");
    console.error("################################################################");
    console.error("This error was not caught by the inner SMS loop. Error for booking ID:", booking.id);
    console.error(error);
    if (error.stack) {
      console.error("Stack trace:", error.stack);
    }
    console.error("##################### END OF CRITICAL FAILURE ####################");
  } finally {
    console.log('--- [Notification Action] END: notifyAdminsOfNewBooking ---');
  }
}


/**
 * Notifies keyholders via SMS when a dormitory booking is approved.
 * @param booking - The approved booking object.
 */
export async function notifyKeyholdersOfDormApproval(booking: Booking): Promise<void> {
  console.log('--- [Notification Action] START: notifyKeyholdersOfDormApproval ---');
  console.log('[Notification Action] Received booking object for keyholder notification:', JSON.stringify(booking, null, 2));

  if (booking.bookingCategory !== 'dormitory') {
    console.log('[Notification Action] Not a dormitory booking. Skipping keyholder notification.');
    console.log('--- [Notification Action] END: notifyKeyholdersOfDormApproval ---');
    return;
  }
  
  if (booking.approvalStatus !== 'approved') {
    console.log(`[Notification Action] Booking status is "${booking.approvalStatus}", not "approved". Skipping keyholder notification.`);
    console.log('--- [Notification Action] END: notifyKeyholdersOfDormApproval ---');
    return;
  }

  try {
    console.log('[Notification Action] Getting keyholder phone numbers...');
    const keyholderPhoneNumbers = await getKeyholderPhoneNumbers();
    if (keyholderPhoneNumbers.length === 0) {
      console.log('[Notification Action] No keyholder phone numbers found. SMS notification for dorm approval will not be sent.');
      console.log('--- [Notification Action] END: notifyKeyholdersOfDormApproval ---');
      return;
    }
    console.log(`[Notification Action] Found ${keyholderPhoneNumbers.length} keyholder phone numbers:`, keyholderPhoneNumbers.join(', '));

    const guestName = booking.guestName || 'Unknown Guest';
    const roomName = booking.items.map(i => i.name).join(', ');
    const startDate = toDateObject(booking.startDate)?.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) || 'N/A';
    const message = `Booking Approved!\nGuest: ${guestName}\nRoom: ${roomName}\nCheck-in: ${startDate}\nPlease prepare for key handover.`;

    console.log(`[Notification Action] Preparing to send approved booking SMS to keyholders. Message: "${message}"`);
    console.log('[Notification Action] Starting keyholder SMS loop...');

    for (const phone of keyholderPhoneNumbers) {
      try {
        console.log(`[Notification Action] Attempting to send SMS to keyholder ${phone}...`);
        await sendSms(phone, message);
        console.log(`[Notification Action] SMS submission to provider for keyholder ${phone} was successful.`);
      } catch (smsError: any) {
        console.error(`################################################################`);
        console.error(`##### [Notification Action] FAILED TO SEND SMS TO KEYHOLDER: ${phone} #####`);
        console.error("The error occurred while trying to send an SMS for booking ID:", booking.id);
        console.error("The caught error object is below:");
        console.error(smsError);
        if (smsError.stack) {
            console.error("Stack trace:", smsError.stack);
        }
        console.error("####################### END OF SMS FAILURE #######################");
      }
    }
    console.log('[Notification Action] Finished keyholder SMS loop.');
    
  } catch (error: any) {
    console.error("################################################################");
    console.error("##### [Notification Action] CRITICAL UNHANDLED FAILURE IN KEYHOLDER NOTIFICATION! #####");
    console.error("################################################################");
    console.error("Error for booking ID:", booking.id);
    console.error(error);
    if (error.stack) {
      console.error("Stack trace:", error.stack);
    }
    console.error("##################### END OF CRITICAL FAILURE ####################");
  } finally {
     console.log('--- [Notification Action] END: notifyKeyholdersOfDormApproval ---');
  }
}
