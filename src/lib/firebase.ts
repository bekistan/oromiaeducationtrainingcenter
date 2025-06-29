
import { initializeApp, getApp, getApps, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getAuth, type Auth } from "firebase/auth";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL, type FirebaseStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;

// This flag will be exported to be used in other parts of the app
export const isFirebaseConfigured = !!(firebaseConfig.apiKey && firebaseConfig.projectId);

if (isFirebaseConfigured) {
  try {
    app = getApps().length ? getApp() : initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
  } catch (error) {
    console.error("Firebase initialization failed:", error);
    app = null;
    auth = null;
    db = null;
    storage = null;
  }
} else {
  // Only log this warning if not in production environment
  if (process.env.NODE_ENV !== 'production') {
    console.warn("Firebase configuration is missing or incomplete. Firebase services are disabled.");
  }
}

/**
 * Uploads a file to Firebase Storage and returns its download URL.
 * @param file The file to upload.
 * @param path The storage path (e.g., "id_scans/"). Must end with a slash.
 * @returns A promise that resolves with the download URL of the uploaded file.
 */
export const uploadFileToFirebaseStorage = async (file: File, path: string): Promise<string> => {
  if (!storage) {
    console.error("[uploadFileToFirebaseStorage] Firebase Storage is not initialized due to missing config.");
    throw new Error("Firebase Storage is not configured.");
  }
  
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
