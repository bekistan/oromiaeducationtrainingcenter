
import { initializeApp, getApp, getApps, type FirebaseApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
// Firebase Analytics (getAnalytics) is removed as it causes "window is not defined" error
// on the server and is not currently used by the application.
// If needed later, it should be initialized strictly on the client-side.

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDCCBk25weEefkH_hfX-Yru5RE9yJ0XtQg",
  authDomain: "oroedu-4a86c.firebaseapp.com",
  projectId: "oroedu-4a86c",
  storageBucket: "oroedu-4a86c.firebasestorage.app", // Using the value you provided
  messagingSenderId: "337131238082",
  appId: "1:337131238082:web:fc94369715fbdfff96015b",
  measurementId: "G-B31H6HWF15" // This is part of config, but Analytics won't be initialized here
};

let app: FirebaseApp;
// Ensure Firebase is initialized only once
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

const db = getFirestore(app);
const auth = getAuth(app);

// Analytics initialization removed
// let analytics;
// if (typeof window !== 'undefined') {
//   // const { getAnalytics: getAnalyticsFn } = await import("firebase/analytics"); // Dynamic import example
//   // analytics = getAnalyticsFn(app);
// }

export { app, db, auth }; // Export core Firebase services
