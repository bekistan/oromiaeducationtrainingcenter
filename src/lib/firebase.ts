
import { initializeApp, getApp, getApps, type FirebaseApp } from "firebase/app";
import { getFirestore, collection, addDoc } from "firebase/firestore";
import { getAuth, signInAnonymously } from "firebase/auth";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDCCBk25weEefkH_hfX-Yru5RE9yJ0XtQg",
  authDomain: "oroedu-4a86c.firebaseapp.com",
  projectId: "oroedu-4a86c",
  storageBucket: "oroedu-4a86c.appspot.com", // Corrected to .appspot.com for default bucket
  messagingSenderId: "337131238082",
  appId: "1:337131238082:web:fc94369715fbdfff96015b",
  measurementId: "G-B31H6HWF15"
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
const storage = getStorage(app); // Initialize Firebase Storage

/**
 * Uploads a file to Firebase Storage and returns its download URL.
 * @param file The file to upload.
 * @param path The storage path (e.g., "id_scans/"). Must end with a slash.
 * @returns A promise that resolves with the download URL of the uploaded file.
 */
export const uploadFileToFirebaseStorage = async (file: File, path: string): Promise<string> => {
  if (!file) throw new Error("No file provided for upload.");
  if (!path.endsWith('/')) {
    console.warn(`Storage path "${path}" does not end with a slash. Appending one.`);
    path += '/';
  }
  
  const uniqueFileName = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`; // Make filename URL-friendly
  const fileStorageRef = storageRef(storage, `${path}${uniqueFileName}`);

  try {
    const snapshot = await uploadBytes(fileStorageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
  } catch (error) {
    console.error("Error uploading file to Firebase Storage:", error);
    throw error; // Re-throw to be handled by the caller
  }
};


// Firebase Analytics is not initialized here to prevent "window is not defined" errors
// during server-side rendering or build, as it's not currently a core feature.
// If needed later, it should be initialized strictly on the client-side.
// let analytics;
// if (typeof window !== 'undefined') {
//   const { getAnalytics: getAnalyticsFn } = await import("firebase/analytics"); // Dynamic import example
//   analytics = getAnalyticsFn(app);
// }

export { app, db, auth, storage };
