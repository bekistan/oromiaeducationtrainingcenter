
import { initializeApp, getApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
// import { getAuth } from "firebase/auth"; // Will be needed for Firebase Auth

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDCCBk25weEefkH_hfX-Yru5RE9yJ0XtQg",
  authDomain: "oroedu-4a86c.firebaseapp.com",
  projectId: "oroedu-4a86c",
  storageBucket: "oroedu-4a86c.appspot.com", // Corrected from firebasestorage.app
  messagingSenderId: "337131238082",
  appId: "1:337131238082:web:fc94369715fbdfff96015b",
  measurementId: "G-B31H6HWF15"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
// const auth = getAuth(app); // Will be needed for Firebase Auth

export { app, db };
// export { app, db, auth };
