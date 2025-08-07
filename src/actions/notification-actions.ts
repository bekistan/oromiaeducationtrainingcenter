
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
 * This function creates a web notification for all admins and, if configured, sends an SMS.
 * @param booking - The newly created booking object.
 */
export async function notifyAdminsOfNewBooking(booking: Booking): Promise<void> {
  if (!db) {
    console.error("--- [Notification Action] FAILED: Firebase DB not configured. Aborting notifyAdminsOfNewBooking. ---");
    return;
  }
  console.log('--- [Notification Action] START: notifyAdminsOfNewBooking ---');

  try {
    const customerName = booking.guestName || booking.companyName || 'Unknown';
    const bookingCategoryCapitalized = booking.bookingCategory.charAt(0).toUpperCase() + booking.bookingCategory.slice(1);
    
    let notificationLink = `/admin/notifications`;
    if(booking.bookingCategory === 'facility') {
        notificationLink = `/admin/manage-facility-bookings#${booking.id}`;
    } else if (booking.bookingCategory === 'dormitory') {
        notificationLink = `/admin/manage-dormitory-bookings#${booking.id}`;
    }
    
    const fullLink = `${BASE_URL}${notificationLink}`;
    
    // --- (Optional) SMS Notification Logic ---
    // This part runs only if SMS service is configured in environment variables.
    let phoneNumbers: string[] = [];
    let smsMessage = '';

    if (booking.bookingCategory === 'facility') {
        phoneNumbers = await getAdminPhoneNumbers();
        smsMessage = `New Facility Booking from ${customerName}. Total: ${booking.totalCost} ETB. View: ${fullLink}`;
    } else if (booking.bookingCategory === 'dormitory') {
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
                }
            }
        }
    }

    if (phoneNumbers.length > 0 && smsMessage) {
        for (const phone of phoneNumbers) {
            try {
                // sendSms will throw an error if not configured, which is caught below.
                await sendSms(phone, smsMessage);
                console.log(`[Notification Action] SMS submission for ${phone} was successful.`);
            } catch (smsError: any) {
                console.warn(`[Notification Action] Could not send SMS to admin ${phone}. This is expected if SMS is not configured. Error: ${smsError.message}`);
            }
        }
    }

    // --- (Primary) Web Notification Logic ---
    // This creates the free, real-time alert inside the application.
    console.log('[Notification Action] Creating web notification in Firestore...');
    const webMessage = `New ${bookingCategoryCapitalized} booking from ${customerName}. Total: ${booking.totalCost} ETB. ID: ${booking.id.substring(0, 6)}...`;
    const notificationType = booking.bookingCategory === 'dormitory' ? 'new_dormitory_booking' : 'new_facility_booking';
    
    const webNotification: Omit<AdminNotification, 'id' | 'createdAt'> & { createdAt: any } = {
      message: webMessage,
      type: notificationType,
      relatedId: booking.id,
      recipientRole: 'admin', // Targets both 'admin' and 'superadmin' roles
      isRead: false,
      createdAt: serverTimestamp(),
      link: notificationLink,
    };
    await addDoc(collection(db, "notifications"), webNotification);
    console.log('[Notification Action] Web notification created successfully.');

  } catch (error: any) {
    console.error("[Notification Action] CRITICAL FAILURE:", error);
  } finally {
    console.log('--- [Notification Action] END: notifyAdminsOfNewBooking ---');
  }
}


/**
 * Notifies keyholders when a dormitory booking is approved for key handover.
 * @param booking - The approved booking object.
 */
export async function notifyKeyholdersOfDormApproval(booking: Booking): Promise<void> {
  if (!db) return;
  console.log('--- [Notification Action] START: notifyKeyholdersOfDormApproval ---');

  if (booking.bookingCategory !== 'dormitory' || booking.approvalStatus !== 'approved') {
    return;
  }
  
  const guestName = booking.guestName || 'Unknown Guest';
  const roomName = booking.items.map(i => i.name).join(', ');
  const startDate = toDateObject(booking.startDate)?.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) || 'N/A';
  const keyholderLink = `/keyholder/assign-keys`;

  try {
    // --- (Optional) SMS Notification ---
    const keyholderPhoneNumbers = await getKeyholderPhoneNumbers();
    if (keyholderPhoneNumbers.length > 0) {
        const message = `Booking Approved!\nGuest: ${guestName}\nRoom: ${roomName}\nCheck-in: ${startDate}\nPlease prepare for key handover.`;
        for (const phone of keyholderPhoneNumbers) {
            try {
                await sendSms(phone, message);
            } catch (smsError: any) {
                 console.warn(`[Notification Action] Could not send SMS to keyholder ${phone}. Error: ${smsError.message}`);
            }
        }
    }

    // --- (Primary) Web Notification ---
    console.log('[Notification Action] Creating web notification for keyholders...');
    const webMessage = `Key assignment needed for ${guestName} in room ${roomName}. Check-in: ${startDate}.`;
    const webNotification: Omit<AdminNotification, 'id' | 'createdAt'> & { createdAt: any } = {
      message: webMessage,
      type: 'key_assignment_pending',
      relatedId: booking.id,
      recipientRole: 'keyholder',
      isRead: false,
      createdAt: serverTimestamp(),
      link: keyholderLink,
    };
    await addDoc(collection(db, "notifications"), webNotification);
    console.log('[Notification Action] Keyholder web notification created successfully.');

  } catch (error: any) {
    console.error("[Notification Action] CRITICAL FAILURE in Keyholder Notification:", error);
  } finally {
     console.log('--- [Notification Action] END: notifyKeyholdersOfDormApproval ---');
  }
}

/**
 * Notifies a company representative that their agreement is ready to be signed.
 * @param booking - The approved facility booking.
 */
export async function notifyCompanyOfAgreement(booking: Booking): Promise<void> {
  if (!db || !booking.userId) return;

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
 * Notifies admins that a company has uploaded a signed agreement.
 * @param booking - The booking with the uploaded agreement.
 */
export async function notifyAdminsOfSignedAgreement(booking: Booking): Promise<void> {
  if (!db) return;
  
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
