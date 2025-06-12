
import { initializeApp, getApp, getApps, type FirebaseApp } from "firebase/app";
import { getFirestore, collection, addDoc } from "firebase/firestore";
import { getAuth, signInAnonymously } from "firebase/auth";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
// USER MUST VERIFY ALL THESE ARE THE CORRECT AND INTENDED CREDENTIALS FOR PROJECT oromiaedurent-hm4zc.
const firebaseConfig = {
  apiKey: "AIzaSyDsw6ox_fmME37xw9qQhmv6MJW53CD7O68", // From error log
  authDomain: "oromiaedurent-hm4zc.firebaseapp.com", // Updated to match new projectId
  projectId: "oromiaedurent-hm4zc", // From error log
  storageBucket: "oromiaedurent-hm4zc.appspot.com", // Updated to match new projectId
  messagingSenderId: "337131238082", // Placeholder - VERIFY if this is correct for oromiaedurent-hm4zc
  appId: "1:337131238082:web:fc94369715fbdfff96015b", // Placeholder - VERIFY if this is correct for oromiaedurent-hm4zc
  measurementId: "G-B31H6HWF15" // Placeholder - VERIFY if this is correct for oromiaedurent-hm4zc
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
  console.log("[uploadFileToFirebaseStorage] Attempting to upload file:", file.name, "to path:", path);
  if (!file) {
    console.error("[uploadFileToFirebaseStorage] No file provided for upload.");
    throw new Error("No file provided for upload.");
  }
  if (!path.endsWith('/')) {
    console.warn(`[uploadFileToFirebaseStorage] Storage path "${path}" does not end with a slash. Appending one.`);
    path += '/';
  }
  
  const uniqueFileName = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`; // Make filename URL-friendly
  const fullStoragePath = `${path}${uniqueFileName}`;
  const fileStorageRef = storageRef(storage, fullStoragePath);
  console.log("[uploadFileToFirebaseStorage] Full storage reference path:", fileStorageRef.fullPath);

  try {
    console.log("[uploadFileToFirebaseStorage] Starting upload for:", file.name);
    const snapshot = await uploadBytes(fileStorageRef, file);
    console.log("[uploadFileToFirebaseStorage] Upload successful for:", file.name, "Snapshot:", snapshot);
    const downloadURL = await getDownloadURL(snapshot.ref);
    console.log("[uploadFileToFirebaseStorage] Got download URL:", downloadURL);
    return downloadURL;
  } catch (error: any) {
    console.error("[uploadFileToFirebaseStorage] Error uploading file:", file.name, "to path:", fullStoragePath, "Error object:", error);
    // Log more details if available, e.g., error.code or error.message from Firebase
    if (error.code) console.error("[uploadFileToFirebaseStorage] Firebase error code:", error.code);
    if (error.message) console.error("[uploadFileToFirebaseStorage] Firebase error message:", error.message);
    throw error; // Re-throw to be handled by the caller
  }
};

export { app, db, auth, storage };
