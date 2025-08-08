
// This service worker file must be in the public folder.

// Scripts for firebase and firebase messaging
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDCCBk25weEefkH_hfX-Yru5RE9yJ0XtQgY",
  authDomain: "oroedu-4a86c.firebaseapp.com",
  projectId: "oroedu-4a86c",
  storageBucket: "oroedu-4a86c.appspot.com",
  messagingSenderId: "337131238082",
  appId: "1:337131238082:web:fc94369715fbdfff96015b",
  measurementId: "YOUR_NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID"
};

// IMPORTANT: Replace the placeholder values above with your actual Firebase config values from your .env.local file.
// Do NOT use process.env here as service workers run in a different context.

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: payload.notification.icon || '/images/logo.png',
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
