
'use server';

import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { getAdminPhoneNumbers, getKeyholderPhoneNumbers, sendSms, getBuildingAdminPhoneNumbers } from '@/services/sms-service';
import type { Booking, AdminNotification, Dormitory, User } from '@/types';
import { toDateObject } from '@/lib/date-utils';

// It's important to set this in your environment variables for production.
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:9002';

/**
 * Notifies relevant parties about a new booking.
 * - Sends an SMS to General Admins for new FACILITY bookings.
 * - Sends an SMS to the relevant Building Admin for new DORMITORY bookings.
 * - Creates a web notification for ALL new bookings.
 * @param booking - The newly created booking object.
 */
export async function notifyAdminsOfNewBooking(booking: Booking): Promise<void> {
  if (!db) {
    console.error("--- [Notification Action] FAILED: Firebase DB not configured. Aborting notifyAdminsOfNewBooking. ---");
    return;
  }
  console.log('--- [Notification Action] START: notifyAdminsOfNewBooking ---');
  console.log('[Notification Action] Received booking object:', JSON.stringify(booking, null, 2));

  try {
    const customerName = booking.guestName || booking.companyName || 'Unknown';
    const bookingCategoryCapitalized = booking.bookingCategory.charAt(0).toUpperCase() + booking.bookingCategory.slice(1);
    
    const notificationLink = `/admin/manage-${booking.bookingCategory}-bookings#${booking.id}`;
    const fullLink = `${BASE_URL}${notificationLink}`;

    console.log(`[Notification Action] Generated Link: ${fullLink}`);
    
    let phoneNumbers: string[] = [];
    let smsMessage = '';

    // --- SMS Notification Logic ---
    if (booking.bookingCategory === 'facility') {
        console.log('[Notification Action] Facility booking detected. Getting general admin phone numbers...');
        phoneNumbers = await getAdminPhoneNumbers();
        smsMessage = `New Facility Booking from ${customerName}. Total: ${booking.totalCost} ETB. View: ${fullLink}`;
    } else if (booking.bookingCategory === 'dormitory') {
        console.log('[Notification Action] Dormitory booking detected. Getting building-specific admin phone numbers...');
        const firstDormId = booking.items[0]?.id;
        if (firstDormId) {
            const dormRef = doc(db, "dormitories", firstDormId);
            const dormSnap = await getDoc(dormRef);
            if (dormSnap.exists()) {
                const dormData = dormSnap.data() as Dormitory;
                const buildingName = dormData.buildingName;
                if (buildingName) {
                    phoneNumbers = await getBuildingAdminPhoneNumbers(buildingName);
                    smsMessage = `New Dormitory Booking for ${dormData.roomNumber} by ${customerName}. View: ${fullLink}`;
                } else {
                    console.log('[Notification Action] Dormitory has no building name, cannot send targeted SMS.');
                }
            } else {
                 console.log(`[Notification Action] Dormitory document with ID ${firstDormId} not found.`);
            }
        } else {
            console.log('[Notification Action] No dormitory ID found in booking items.');
        }
    }

    if (phoneNumbers.length > 0 && smsMessage) {
        console.log(`[Notification Action] Found ${phoneNumbers.length} phone numbers to notify:`, phoneNumbers.join(', '));
        console.log('[Notification Action] Starting SMS loop...');
        for (const phone of phoneNumbers) {
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
    } else {
        console.log('[Notification Action] No phone numbers found or no SMS message generated. Skipping SMS sending.');
    }


    // --- Web Notification Logic ---
    console.log('[Notification Action] Creating web notification in Firestore for all booking types...');
    const webMessage = `New ${bookingCategoryCapitalized} booking from ${customerName}. Total: ${booking.totalCost} ETB. ID: ${booking.id.substring(0, 6)}...`;
    const notificationType = booking.bookingCategory === 'dormitory' ? 'new_dormitory_booking' : 'new_facility_booking';
    
    const webNotification: Omit<AdminNotification, 'id' | 'createdAt'> & { createdAt: any } = {
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
  if (!db) {
    console.error("--- [Notification Action] FAILED: Firebase DB not configured. Aborting notifyKeyholdersOfDormApproval. ---");
    return;
  }
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

/**
 * Notifies a company representative that their agreement is ready.
 * @param booking - The approved facility booking.
 */
export async function notifyCompanyOfAgreement(booking: Booking): Promise<void> {
  if (!db) {
    console.error("[Notification Action] FAILED: DB not configured for notifyCompanyOfAgreement.");
    return;
  }
  if (!booking.userId) {
    console.log("[Notification Action] No userId on booking, cannot send targeted web notification to company.");
    return;
  }

  const notification: Omit<AdminNotification, 'id' | 'createdAt'> & { createdAt: any } = {
    message: `Your agreement for booking #${booking.id.substring(0, 6)} is ready to be signed.`,
    type: 'agreement_ready_for_client',
    relatedId: booking.id,
    recipientRole: 'company_representative',
    recipientId: booking.userId, // Target the specific user
    isRead: false,
    createdAt: serverTimestamp(),
    link: `/company/bookings/${booking.id}/agreement`,
  };

  try {
    await addDoc(collection(db, 'notifications'), notification);
    console.log(`[Notification Action] Successfully created web notification for company user ${booking.userId} about agreement.`);
  } catch (error) {
    console.error("[Notification Action] Failed to create company agreement notification:", error);
  }
}

/**
 * Notifies admins that a signed agreement has been uploaded.
 * @param booking - The booking with the uploaded agreement.
 */
export async function notifyAdminsOfSignedAgreement(booking: Booking): Promise<void> {
  if (!db) {
    console.error("[Notification Action] FAILED: DB not configured for notifyAdminsOfSignedAgreement.");
    return;
  }
  
  const notificationLink = `/admin/manage-facility-bookings#${booking.id}`;
  const message = `Agreement for booking #${booking.id.substring(0, 6)} has been signed and uploaded by ${booking.companyName}.`;
  
  const notification: Omit<AdminNotification, 'id' | 'createdAt'> & { createdAt: any } = {
    message,
    type: 'agreement_signed_by_client',
    relatedId: booking.id,
    recipientRole: 'admin',
    isRead: false,
    createdAt: serverTimestamp(),
    link: notificationLink,
  };

  try {
    await addDoc(collection(db, 'notifications'), notification);
    console.log(`[Notification Action] Successfully created web notification for admins about signed agreement.`);
  } catch (error) {
    console.error("[Notification Action] Failed to create admin signed agreement notification:", error);
  }
}
