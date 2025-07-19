
"use client";

import React, { useState, useEffect, useCallback, useContext, createContext, type ReactNode, useMemo } from 'react';
import { auth, db, isFirebaseConfigured } from '@/lib/firebase'; // Import the flag
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User as FirebaseUser,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  Timestamp,
  collection,
  query,
  where,
  getDocs,
  limit
} from 'firebase/firestore';
import type { User as AppUserType } from '@/types';

// Interfaces for function parameters
interface CompanyDetails {
  companyName: string;
  name: string; // Contact person's name
  position: string;
  email: string;
  phone: string;
  password: string;
}

interface AdminDetails {
  name: string;
  email: string;
  password: string;
  phone?: string;
  buildingAssignment?: 'ifaboru' | 'buuraboru';
}

interface KeyholderDetails {
  name: string;
  email: string;
  password: string;
  phone?: string;
}

interface StoreManagerDetails {
    name: string;
    email: string;
    password: string;
    phone?: string;
}

// Define the shape of the context state
interface AuthState {
  user: AppUserType | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<AppUserType | null>;
  signupCompany: (companyDetails: CompanyDetails) => Promise<AppUserType | null>;
  signupAdmin: (adminDetails: AdminDetails) => Promise<AppUserType | null>;
  signupKeyholder: (keyholderDetails: KeyholderDetails) => Promise<AppUserType | null>;
  signupStoreManager: (storeManagerDetails: StoreManagerDetails) => Promise<AppUserType | null>;
  logout: () => Promise<void>;
  updateUserDocument: (userId: string, data: Partial<AppUserType>) => Promise<void>;
}

// Create the context with an undefined initial value
const AuthContext = createContext<AuthState | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<AppUserType | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // If firebase is not configured, we can't do anything.
    if (!isFirebaseConfigured || !auth) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    const unsubscribe = onAuthStateChanged(auth, async (currentFbUser) => {
      setLoading(true); // Ensure loading is true at the start of handling
      try {
        setFirebaseUser(currentFbUser);
        if (currentFbUser && db) { // Also check if db is available
          const userDocRef = doc(db, "users", currentFbUser.uid);
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists()) {
            const userDataFromDb = userDocSnap.data();
            let createdAtString: string | undefined = undefined;
            if (userDataFromDb.createdAt instanceof Timestamp) {
              createdAtString = userDataFromDb.createdAt.toDate().toISOString();
            } else if (typeof userDataFromDb.createdAt === 'string') {
              createdAtString = userDataFromDb.createdAt;
            } else if (userDataFromDb.createdAt && typeof userDataFromDb.createdAt.seconds === 'number' && typeof userDataFromDb.createdAt.nanoseconds === 'number') {
              createdAtString = new Timestamp(userDataFromDb.createdAt.seconds, userDataFromDb.createdAt.nanoseconds).toDate().toISOString();
            }

            const processedUserData: AppUserType = {
              id: currentFbUser.uid,
              email: userDataFromDb.email || '',
              role: userDataFromDb.role || 'individual',
              name: userDataFromDb.name,
              position: userDataFromDb.position,
              companyId: userDataFromDb.companyId,
              companyName: userDataFromDb.companyName,
              approvalStatus: userDataFromDb.approvalStatus,
              phone: userDataFromDb.phone,
              buildingAssignment: userDataFromDb.buildingAssignment === null ? undefined : userDataFromDb.buildingAssignment,
              createdAt: createdAtString,
            };
            setUser(processedUserData);
          } else {
            console.warn("User document not found in Firestore for UID:", currentFbUser.uid, "- Signing out to prevent inconsistent state.");
            await firebaseSignOut(auth);
            setUser(null);
          }
        } else {
          setUser(null);
        }
      } catch (error: any) {
        console.error("Auth state change error:", error);
        setUser(null);
        setFirebaseUser(null);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []); // Empty dependency array means this runs once on mount.

  const login = useCallback(async (email: string, pass: string): Promise<AppUserType | null> => {
    if (!isFirebaseConfigured || !auth || !db) {
      throw new Error("Firebase is not configured. Please check your environment variables.");
    }
    
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, pass);
      const fbUserInstance = userCredential.user;
      const userDocRef = doc(db, "users", fbUserInstance.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const userDataFromDb = userDocSnap.data();
        let createdAtString: string | undefined = undefined;
        if (userDataFromDb.createdAt instanceof Timestamp) {
          createdAtString = userDataFromDb.createdAt.toDate().toISOString();
        } else if (typeof userDataFromDb.createdAt === 'string') {
            createdAtString = userDataFromDb.createdAt;
        } else if (userDataFromDb.createdAt && typeof userDataFromDb.createdAt.seconds === 'number' && typeof userDataFromDb.createdAt.nanoseconds === 'number') {
            createdAtString = new Timestamp(userDataFromDb.createdAt.seconds, userDataFromDb.createdAt.nanoseconds).toDate().toISOString();
        }

        const appUserData: AppUserType = {
          id: fbUserInstance.uid,
          email: userDataFromDb.email || '',
          role: userDataFromDb.role || 'individual',
          name: userDataFromDb.name,
          position: userDataFromDb.position,
          companyId: userDataFromDb.companyId,
          companyName: userDataFromDb.companyName,
          approvalStatus: userDataFromDb.approvalStatus,
          phone: userDataFromDb.phone,
          buildingAssignment: userDataFromDb.buildingAssignment === null ? undefined : userDataFromDb.buildingAssignment,
          createdAt: createdAtString,
        };
        return appUserData;
      } else {
        await firebaseSignOut(auth);
        throw new Error("userDataMissing");
      }
    } catch (error: any) {
      throw error;
    }
  }, []);

  const signupCompany = useCallback(async (companyDetails: CompanyDetails): Promise<AppUserType | null> => {
    if (!isFirebaseConfigured || !auth || !db) {
        throw new Error("Firebase is not configured. Cannot sign up company.");
    }
    const userCredential = await createUserWithEmailAndPassword(auth, companyDetails.email, companyDetails.password);
    const fbUserInstance = userCredential.user;
    const companyId = `comp_${fbUserInstance.uid.substring(0, 10)}_${Date.now().toString(36)}`;
    const newCompanyUserDocData: Omit<AppUserType, 'id' | 'createdAt'> & { createdAt: any } = {
        email: companyDetails.email,
        name: companyDetails.name,
        position: companyDetails.position,
        companyName: companyDetails.companyName,
        phone: companyDetails.phone,
        role: 'company_representative' as const,
        approvalStatus: 'pending' as const,
        companyId: companyId,
        createdAt: serverTimestamp(),
    };
    await setDoc(doc(db, "users", fbUserInstance.uid), newCompanyUserDocData);
    return {
        id: fbUserInstance.uid,
        email: companyDetails.email,
        name: companyDetails.name,
        position: companyDetails.position,
        companyName: companyDetails.companyName,
        phone: companyDetails.phone,
        role: 'company_representative',
        approvalStatus: 'pending',
        companyId: companyId,
        createdAt: new Date().toISOString(),
    };
  }, []);

  const signupAdmin = useCallback(async (adminDetails: AdminDetails): Promise<AppUserType | null> => {
    if (!isFirebaseConfigured || !auth || !db) {
      throw new Error("Firebase is not configured. Cannot sign up admin.");
    }
    const currentUserDocRef = auth.currentUser ? doc(db, "users", auth.currentUser.uid) : null;
    if (!currentUserDocRef) throw new Error("Current user not found for authorization check.");
    const currentUserDocSnap = await getDoc(currentUserDocRef);
    if (!currentUserDocSnap.exists() || currentUserDocSnap.data()?.role !== 'superadmin') {
      throw new Error("Only superadmins can register new admins.");
    }

    const userCredential = await createUserWithEmailAndPassword(auth, adminDetails.email, adminDetails.password);
    const fbUserInstance = userCredential.user;
    const newAdminUserDocData: Omit<AppUserType, 'id' | 'createdAt'> & { createdAt: any } = {
        email: adminDetails.email,
        name: adminDetails.name,
        phone: adminDetails.phone || '',
        role: 'admin' as const,
        createdAt: serverTimestamp(),
        buildingAssignment: adminDetails.buildingAssignment || null,
    };
    await setDoc(doc(db, "users", fbUserInstance.uid), newAdminUserDocData);
    return {
        id: fbUserInstance.uid,
        email: adminDetails.email,
        name: adminDetails.name,
        phone: adminDetails.phone,
        role: 'admin',
        buildingAssignment: adminDetails.buildingAssignment || null,
        createdAt: new Date().toISOString(),
    };
  }, []);

  const signupKeyholder = useCallback(async (keyholderDetails: KeyholderDetails): Promise<AppUserType | null> => {
    if (!isFirebaseConfigured || !auth || !db) {
        throw new Error("Firebase is not configured. Cannot sign up keyholder.");
    }
     const currentUserDocRef = auth.currentUser ? doc(db, "users", auth.currentUser.uid) : null;
     if (!currentUserDocRef) throw new Error("Current user not found for authorization check.");
     const currentUserDocSnap = await getDoc(currentUserDocRef);
     if (!currentUserDocSnap.exists() || currentUserDocSnap.data()?.role !== 'superadmin') {
      throw new Error("Only superadmins can register new keyholders.");
    }

    const userCredential = await createUserWithEmailAndPassword(auth, keyholderDetails.email, keyholderDetails.password);
    const fbUserInstance = userCredential.user;
    const newKeyholderUserDocData: Omit<AppUserType, 'id' | 'createdAt'> & { createdAt: any } = {
      email: keyholderDetails.email,
      name: keyholderDetails.name,
      phone: keyholderDetails.phone || '',
      role: 'keyholder' as const,
      createdAt: serverTimestamp(),
    };
    await setDoc(doc(db, "users", fbUserInstance.uid), newKeyholderUserDocData);
    return {
        id: fbUserInstance.uid,
        email: keyholderDetails.email,
        name: keyholderDetails.name,
        phone: keyholderDetails.phone,
        role: 'keyholder',
        createdAt: new Date().toISOString(),
    };
  }, []);

  const signupStoreManager = useCallback(async (storeManagerDetails: StoreManagerDetails): Promise<AppUserType | null> => {
    if (!isFirebaseConfigured || !auth || !db) {
        throw new Error("Firebase is not configured. Cannot sign up store manager.");
    }
     const currentUserDocRef = auth.currentUser ? doc(db, "users", auth.currentUser.uid) : null;
     if (!currentUserDocRef) throw new Error("Current user not found for authorization check.");
     const currentUserDocSnap = await getDoc(currentUserDocRef);
     if (!currentUserDocSnap.exists() || currentUserDocSnap.data()?.role !== 'superadmin') {
      throw new Error("Only superadmins can register new store managers.");
    }

    const userCredential = await createUserWithEmailAndPassword(auth, storeManagerDetails.email, storeManagerDetails.password);
    const fbUserInstance = userCredential.user;
    const newStoreManagerDocData: Omit<AppUserType, 'id' | 'createdAt'> & { createdAt: any } = {
      email: storeManagerDetails.email,
      name: storeManagerDetails.name,
      phone: storeManagerDetails.phone || '',
      role: 'store_manager' as const,
      createdAt: serverTimestamp(),
    };
    await setDoc(doc(db, "users", fbUserInstance.uid), newStoreManagerDocData);
    return {
        id: fbUserInstance.uid,
        email: storeManagerDetails.email,
        name: storeManagerDetails.name,
        phone: storeManagerDetails.phone,
        role: 'store_manager',
        createdAt: new Date().toISOString(),
    };
  }, []);
  
  const logout = useCallback(async (): Promise<void> => {
    if (!isFirebaseConfigured || !auth) {
        console.warn("Attempted to log out, but Firebase is not configured.");
        setUser(null);
        setFirebaseUser(null);
        return;
    }
    await firebaseSignOut(auth);
  }, []);

  const updateUserDocument = useCallback(async (userId: string, data: Partial<AppUserType>): Promise<void> => {
    if (!isFirebaseConfigured || !db) {
        throw new Error("Firebase is not configured. Cannot update user document.");
    }
    const userDocRef = doc(db, "users", userId);
    const updateData = { ...data };
    if (data.hasOwnProperty('buildingAssignment') && data.buildingAssignment === undefined) {
        (updateData as any).buildingAssignment = null;
    }

    await updateDoc(userDocRef, updateData);
    if (user && user.id === userId) {
      const updatedUserSnapshot = await getDoc(userDocRef);
      if (updatedUserSnapshot.exists()) {
        const updatedDataFromDb = updatedUserSnapshot.data();
        let createdAtString: string | undefined = undefined;
        if (updatedDataFromDb.createdAt instanceof Timestamp) {
          createdAtString = updatedDataFromDb.createdAt.toDate().toISOString();
        } else if (typeof updatedDataFromDb.createdAt === 'string') {
            createdAtString = updatedDataFromDb.createdAt;
        } else if (updatedDataFromDb.createdAt && typeof updatedDataFromDb.createdAt.seconds === 'number' && typeof updatedDataFromDb.createdAt.nanoseconds === 'number') {
            createdAtString = new Timestamp(updatedDataFromDb.createdAt.seconds, updatedDataFromDb.createdAt.nanoseconds).toDate().toISOString();
        }
        const refreshedUser: AppUserType = {
          id: userId,
          email: updatedDataFromDb.email || '',
          role: updatedDataFromDb.role || 'individual',
          name: updatedDataFromDb.name,
          position: updatedDataFromDb.position,
          companyId: updatedDataFromDb.companyId,
          companyName: updatedDataFromDb.companyName,
          approvalStatus: updatedDataFromDb.approvalStatus,
          phone: updatedDataFromDb.phone,
          buildingAssignment: updatedDataFromDb.buildingAssignment === null ? undefined : updatedDataFromDb.buildingAssignment,
          createdAt: createdAtString,
        };
        setUser(refreshedUser);
      }
    }
  }, [user]);

  const contextValue = useMemo<AuthState>(() => ({
    user,
    firebaseUser,
    loading,
    login,
    signupCompany,
    signupAdmin,
    signupKeyholder,
    signupStoreManager,
    logout,
    updateUserDocument,
  }), [user, firebaseUser, loading, login, signupCompany, signupAdmin, signupKeyholder, signupStoreManager, logout, updateUserDocument]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthState => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
