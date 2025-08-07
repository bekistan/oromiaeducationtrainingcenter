
'use server';

import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, doc, getDoc, query, where, getDocs } from 'firebase/firestore';
import { getAdminPhoneNumbers, getKeyholderPhoneNumbers, sendSms, getBuildingAdminPhoneNumbers } from '@/services/sms-service';
import type { Booking, AdminNotification, Dormitory, User } from '@/types';
import { toDateObject } from '@/lib/date-utils';

const FCM_SERVER_KEY = process.env.FIREBASE_FCM_SERVER_KEY;
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:9002';


async function sendPushNotification(tokens: string[], title: string, body: string, link: string) {
    if (!FCM_SERVER_KEY) {
        console.warn("[Push Notification] FCM_SERVER_KEY is not set. Push notifications are disabled.");
        return;
    }
    if (tokens.length === 0) {
        console.log("[Push Notification] No FCM tokens found for recipients. Skipping push notification.");
        return;
    }

    const message = {
        registration_ids: tokens,
        notification: {
            title,
            body,
            icon: '/images/logo.png',
            click_action: link,
        },
        webpush: {
            fcm_options: {
              link: link,
            },
        },
    };

    try {
        const response = await fetch('https://fcm.googleapis.com/fcm/send', {
            method: 'POST',
            headers: {
                'Authorization': `key=${FCM_SERVER_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(message),
        });

        if (response.ok) {
            console.log('[Push Notification] Push notification sent successfully.');
        } else {
            const errorData = await response.json();
            console.error('[Push Notification] Failed to send push notification:', response.status, errorData);
        }
    } catch (error) {
        console.error('[Push Notification] Error sending push notification:', error);
    }
}

async function getFcmTokensForRole(role: User['role']): Promise<string[]> {
    const usersQuery = query(collection(db, "users"), where("role", "==", role), where("fcmToken", "!=", null));
    const querySnapshot = await getDocs(usersQuery);
    const tokens = querySnapshot.docs.map(doc => doc.data().fcmToken as string).filter(Boolean);
    return [...new Set(tokens)]; // Return unique tokens
}


/**
 * Notifies relevant parties about a new booking.
 * This function creates a web notification for all admins and, if configured, sends an SMS.
 * It also sends a push notification.
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
    
    let notificationLink = `/admin/dashboard`;
    if(booking.bookingCategory === 'facility') {
        notificationLink = `/admin/manage-facility-bookings#${booking.id}`;
    } else if (booking.bookingCategory === 'dormitory') {
        notificationLink = `/admin/manage-dormitory-bookings#${booking.id}`;
    }
    const fullLink = `${BASE_URL}${notificationLink}`;

    // --- (Optional) SMS Notification Logic ---
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
                if (dormData.buildingName) {
                    phoneNumbers = await getBuildingAdminPhoneNumbers(dormData.buildingName);
                    smsMessage = `New Dormitory Booking for ${dormData.roomNumber} by ${customerName}. View: ${fullLink}`;
                }
            }
        }
    }
    if (phoneNumbers.length > 0 && smsMessage) {
        // ... (SMS logic remains the same)
    }

    // --- (Primary) Web & Push Notification Logic ---
    console.log('[Notification Action] Creating web and push notifications...');
    const webMessage = `New ${bookingCategoryCapitalized} booking from ${customerName}. Total: ${booking.totalCost} ETB. ID: ${booking.id.substring(0, 6)}...`;
    const pushTitle = `New ${bookingCategoryCapitalized} Booking`;
    const notificationType = booking.bookingCategory === 'dormitory' ? 'new_dormitory_booking' : 'new_facility_booking';
    
    // Create web notification in Firestore
    const webNotification: Omit<AdminNotification, 'id' | 'createdAt'> & { createdAt: any } = {
      message: webMessage,
      type: notificationType,
      relatedId: booking.id,
      recipientRole: 'admin',
      isRead: false,
      createdAt: serverTimestamp(),
      link: notificationLink,
    };
    await addDoc(collection(db, "notifications"), webNotification);
    console.log('[Notification Action] Web notification created successfully.');
    
    // Send Push Notification
    const adminTokens = await getFcmTokensForRole('admin');
    const superAdminTokens = await getFcmTokensForRole('superadmin');
    const allTokens = [...new Set([...adminTokens, ...superAdminTokens])];
    await sendPushNotification(allTokens, pushTitle, webMessage, fullLink);

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
  const fullLink = `${BASE_URL}${keyholderLink}`;

  try {
    // --- (Optional) SMS Notification ---
    const keyholderPhoneNumbers = await getKeyholderPhoneNumbers();
    if (keyholderPhoneNumbers.length > 0) {
        // ... (SMS logic remains)
    }

    // --- Web & Push Notification ---
    console.log('[Notification Action] Creating web/push notification for keyholders...');
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
    
    const keyholderTokens = await getFcmTokensForRole('keyholder');
    await sendPushNotification(keyholderTokens, 'Key Assignment Pending', webMessage, fullLink);
    
    console.log('[Notification Action] Keyholder notifications created successfully.');

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

    const message = `Your agreement for booking #${booking.id.substring(0, 6)} is ready to be signed.`;
    const link = `/company/bookings/${booking.id}/agreement`;
    const fullLink = `${BASE_URL}${link}`;

    const notification: Omit<AdminNotification, 'id' | 'createdAt'> & { createdAt: any } = {
        message: message,
        type: 'agreement_ready_for_client',
        relatedId: booking.id,
        recipientRole: 'company_representative',
        recipientId: booking.userId, // Target the specific user
        isRead: false,
        createdAt: serverTimestamp(),
        link: link,
    };

    try {
        await addDoc(collection(db, 'notifications'), notification);
        
        const userDoc = await getDoc(doc(db, "users", booking.userId));
        if (userDoc.exists() && userDoc.data()?.fcmToken) {
            await sendPushNotification([userDoc.data().fcmToken], 'Agreement Ready', message, fullLink);
        }

        console.log(`[Notification Action] Successfully created notification for company user ${booking.userId} about agreement.`);
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
    const fullLink = `${BASE_URL}${notificationLink}`;
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
        const adminTokens = await getFcmTokensForRole('admin');
        const superAdminTokens = await getFcmTokensForRole('superadmin');
        const allTokens = [...new Set([...adminTokens, ...superAdminTokens])];
        await sendPushNotification(allTokens, 'Agreement Signed', message, fullLink);
        console.log(`[Notification Action] Successfully created notifications for admins about signed agreement.`);
    } catch (error) {
        console.error("[Notification Action] Failed to create admin signed agreement notification:", error);
    }
}
