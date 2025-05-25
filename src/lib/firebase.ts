
import { initializeApp, getApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
// PLEASE DOUBLE-CHECK EVERY VALUE HERE AGAINST YOUR FIREBASE PROJECT SETTINGS
const firebaseConfig = {
  apiKey: "AIzaSyDCCBk25weEefkH_hfX-Yru5RE9yJ0XtQg",
  authDomain: "oroedu-4a86c.firebaseapp.com",
  projectId: "oroedu-4a86c",
  storageBucket: "oroedu-4a86c.firebasestorage.app", // Reverted to user-provided value
  messagingSenderId: "337131238082",
  appId: "1:337131238082:web:fc94369715fbdfff96015b",
  measurementId: "G-B31H6HWF15"
};

let app;
// Ensure Firebase is initialized only once
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

const db = getFirestore(app);
const auth = getAuth(app);

export { app, db, auth };
