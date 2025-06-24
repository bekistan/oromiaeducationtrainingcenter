
'use server';

import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { getAdminPhoneNumbers, getKeyholderPhoneNumbers, sendSms } from '@/services/sms-service';
import type { Booking, AdminNotification } from '@/types';
import { toDateObject } from '@/lib/date-utils';

/**
 * Notifies admins via SMS and web notification about a new booking.
 * @param booking - The newly created booking object.
 */
export async function notifyAdminsOfNewBooking(booking: Booking): Promise<void> {
  console.log('[ACTION] notifyAdminsOfNewBooking triggered for booking ID:', booking.id);
  try {
    const customerName = booking.guestName || booking.companyName || 'Unknown';
    const itemName = booking.items.map(i => i.name).join(', ');
    
    // --- 1. Construct messages ---
    const webMessage = `New booking from ${customerName} for ${itemName}. Total: ${booking.totalCost} ETB. ID: ${booking.id.substring(0, 6)}...`;
    const smsMessage = `New Booking!\nID: ${booking.id.substring(0, 6)}...\nItem: ${itemName}\nCustomer: ${customerName}\nTotal: ${booking.totalCost} ETB`;

    // --- 2. Send SMS notification ---
    const adminPhoneNumbers = await getAdminPhoneNumbers();
    if (adminPhoneNumbers.length > 0) {
      console.log(`[ACTION] Preparing to send new booking SMS to ${adminPhoneNumbers.length} admins. Message: "${smsMessage}"`);
      const smsPromises = adminPhoneNumbers.map(phone => sendSms(phone, smsMessage));
      await Promise.all(smsPromises);
    } else {
      console.log('[ACTION] No admin phone numbers found. SMS notification for new booking will not be sent.');
    }

    // --- 3. Create web notification in Firestore ---
    const notificationType = booking.bookingCategory === 'dormitory' ? 'new_dormitory_booking' : 'new_facility_booking';
    const notificationLink = booking.bookingCategory === 'dormitory' 
      ? `/admin/manage-dormitory-bookings#${booking.id}` 
      : `/admin/manage-facility-bookings#${booking.id}`;

    const webNotification: Omit<AdminNotification, 'id'> = {
      message: webMessage,
      type: notificationType,
      relatedId: booking.id,
      recipientRole: 'admin',
      isRead: false,
      createdAt: serverTimestamp(),
      link: notificationLink,
    };
    await addDoc(collection(db, "notifications"), webNotification);
    console.log('[ACTION] Web notification created in Firestore for new booking.');

    console.log('[ACTION] notifyAdminsOfNewBooking finished successfully.');
  } catch (error) {
    console.error('[ACTION] Failed to execute notifyAdminsOfNewBooking:', error);
  }
}


/**
 * Notifies keyholders via SMS when a dormitory booking is approved.
 * @param booking - The approved booking object.
 */
export async function notifyKeyholdersOfDormApproval(booking: Booking): Promise<void> {
  console.log('[ACTION] notifyKeyholdersOfDormApproval triggered for booking ID:', booking.id);
  // Ensure it's a dormitory booking
  if (booking.bookingCategory !== 'dormitory') {
    console.log('[ACTION] Not a dormitory booking. Skipping keyholder notification.');
    return;
  }

  try {
    const keyholderPhoneNumbers = await getKeyholderPhoneNumbers();
    if (keyholderPhoneNumbers.length === 0) {
      console.log('[ACTION] No keyholder phone numbers found. SMS notification for dorm approval will not be sent.');
      return;
    }
    console.log(`[ACTION] Found ${keyholderPhoneNumbers.length} keyholder phone numbers:`, keyholderPhoneNumbers);

    const guestName = booking.guestName || 'Unknown Guest';
    const roomName = booking.items.map(i => i.name).join(', ');
    const startDate = toDateObject(booking.startDate)?.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) || 'N/A';
    const message = `Booking Approved!\nGuest: ${guestName}\nRoom: ${roomName}\nCheck-in: ${startDate}\nPlease prepare for key handover.`;

    console.log(`[ACTION] Preparing to send approved booking SMS to keyholders. Message: "${message}"`);

    const smsPromises = keyholderPhoneNumbers.map(phone => sendSms(phone, message));
    await Promise.all(smsPromises);
    
    console.log('[ACTION] notifyKeyholdersOfDormApproval finished.');
  } catch (error) {
    console.error('[ACTION] Failed to execute notifyKeyholdersOfDormApproval:', error);
  }
}
