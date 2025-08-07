
'use client';

import { useEffect } from 'react';
import { messaging } from '@/lib/firebase';
import { getToken } from 'firebase/messaging';
import { useAuth } from '@/hooks/use-auth';

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

export const FirebaseMessagingProvider = ({ children }: { children: React.ReactNode }) => {
  const { user, updateUserDocument } = useAuth();

  useEffect(() => {
    const requestPermission = async () => {
      if (!messaging || !VAPID_KEY || !user) return;

      try {
        // 1. Get permission
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          console.log('Notification permission not granted.');
          return;
        }

        // 2. Get token
        const currentToken = await getToken(messaging, { vapidKey: VAPID_KEY });
        if (currentToken) {
          console.log('FCM Token received:', currentToken);
          
          // 3. Save token to user's document if it's new or different
          if (user.fcmToken !== currentToken) {
            console.log('New or updated FCM token found, updating user document...');
            await updateUserDocument(user.id, { fcmToken: currentToken });
          }
        } else {
          console.log('No registration token available. Request permission to generate one.');
        }
      } catch (err) {
        console.error('An error occurred while retrieving token. ', err);
      }
    };

    if (user) {
      requestPermission();
    }
  }, [user, updateUserDocument]);

  return <>{children}</>;
};
