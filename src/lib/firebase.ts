
import { initializeApp, getApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth"; // Import getAuth

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDCCBk25weEefkH_hfX-Yru5RE9yJ0XtQg",
  authDomain: "oroedu-4a86c.firebaseapp.com",
  projectId: "oroedu-4a86c",
  storageBucket: "oroedu-4a86c.appspot.com", // Corrected
  messagingSenderId: "337131238082",
  appId: "1:337131238082:web:fc94369715fbdfff96015b",
  measurementId: "G-B31H6HWF15"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app); // Initialize and export auth

export { app, db, auth };
