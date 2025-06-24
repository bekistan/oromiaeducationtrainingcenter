
'use server';

import { getAdminPhoneNumbers, getKeyholderPhoneNumbers, sendSms } from '@/services/sms-service';
import type { Booking } from '@/types';
import { toDateObject } from '@/lib/date-utils';

/**
 * Notifies admins via SMS about a new booking.
 * @param booking - The newly created booking object.
 */
export async function notifyAdminsOfNewBooking(booking: Booking): Promise<void> {
  try {
    const adminPhoneNumbers = await getAdminPhoneNumbers();
    if (adminPhoneNumbers.length === 0) {
      console.log('No admin phone numbers found to send new booking notification.');
      return;
    }

    const customerName = booking.guestName || booking.companyName || 'Unknown';
    const itemName = booking.items.map(i => i.name).join(', ');
    const message = `New Booking Alert!\nID: ${booking.id.substring(0, 6)}...\nItem: ${itemName}\nCustomer: ${customerName}\nTotal: ${booking.totalCost} ETB`;
    
    console.log(`Preparing to send new booking SMS to ${adminPhoneNumbers.length} admins.`);
    
    const smsPromises = adminPhoneNumbers.map(phone => sendSms(phone, message));
    await Promise.all(smsPromises);

  } catch (error) {
    console.error('Failed to execute notifyAdminsOfNewBooking:', error);
  }
}

/**
 * Notifies keyholders via SMS when a dormitory booking is approved.
 * @param booking - The approved booking object.
 */
export async function notifyKeyholdersOfDormApproval(booking: Booking): Promise<void> {
  // Ensure it's a dormitory booking
  if (booking.bookingCategory !== 'dormitory') {
    return;
  }

  try {
    const keyholderPhoneNumbers = await getKeyholderPhoneNumbers();
    if (keyholderPhoneNumbers.length === 0) {
      console.log('No keyholder phone numbers found to send approval notification.');
      return;
    }

    const guestName = booking.guestName || 'Unknown Guest';
    const roomName = booking.items.map(i => i.name).join(', ');
    const startDate = toDateObject(booking.startDate)?.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) || 'N/A';
    const message = `Booking Approved!\nGuest: ${guestName}\nRoom: ${roomName}\nCheck-in: ${startDate}\nPlease prepare for key handover.`;

    console.log(`Preparing to send approved booking SMS to ${keyholderPhoneNumbers.length} keyholders.`);

    const smsPromises = keyholderPhoneNumbers.map(phone => sendSms(phone, message));
    await Promise.all(smsPromises);
    
  } catch (error) {
    console.error('Failed to execute notifyKeyholdersOfDormApproval:', error);
  }
}
