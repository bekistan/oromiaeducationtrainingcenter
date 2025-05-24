
"use client";

import type { User as AppUser } from '@/types';
import React, { useState, useEffect, useCallback, useContext, createContext, type ReactNode, useMemo } from 'react';
import { auth, db } from '@/lib/firebase';
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
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';

interface CompanyDetails {
  companyName: string;
  name: string; // Contact person's name
  email: string;
  phone: string;
  password: string;
}

interface AdminDetails {
  name: string;
  email: string;
  password: string;
}

interface AuthState {
  user: AppUser | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<AppUser | null>;
  signupCompany: (companyDetails: CompanyDetails) => Promise<AppUser | null>;
  signupAdmin: (adminDetails: AdminDetails) => Promise<AppUser | null>;
  logout: () => Promise<void>;
  updateUserDocument: (userId: string, data: Partial<AppUser>) => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        const userDocRef = doc(db, "users", fbUser.uid);
        try {
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            const userDataFromDb = userDocSnap.data();
            const processedUserData: AppUser = {
              id: fbUser.uid,
              email: userDataFromDb.email || '',
              role: userDataFromDb.role || 'individual',
              name: userDataFromDb.name,
              companyId: userDataFromDb.companyId,
              companyName: userDataFromDb.companyName,
              approvalStatus: userDataFromDb.approvalStatus,
              phone: userDataFromDb.phone,
              createdAt: userDataFromDb.createdAt instanceof Timestamp
                ? userDataFromDb.createdAt.toDate().toISOString()
                : typeof userDataFromDb.createdAt === 'string'
                  ? userDataFromDb.createdAt
                  : undefined,
            };
            setUser(processedUserData);
          } else {
            console.warn("User document not found in Firestore for UID:", fbUser.uid);
            // If user exists in Auth but not Firestore, log them out or handle as error
            await firebaseSignOut(auth);
            setUser(null);
          }
        } catch (error) {
          console.error("Error fetching user document from Firestore:", error);
          await firebaseSignOut(auth);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const login = useCallback(async (email: string, pass: string): Promise<AppUser | null> => {
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, pass);
      const fbUserInstance = userCredential.user;
      const userDocRef = doc(db, "users", fbUserInstance.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const userDataFromDb = userDocSnap.data();
        const appUserData: AppUser = {
          id: fbUserInstance.uid,
          email: userDataFromDb.email || '',
          role: userDataFromDb.role || 'individual',
          name: userDataFromDb.name,
          companyId: userDataFromDb.companyId,
          companyName: userDataFromDb.companyName,
          approvalStatus: userDataFromDb.approvalStatus,
          phone: userDataFromDb.phone,
          createdAt: userDataFromDb.createdAt instanceof Timestamp
            ? userDataFromDb.createdAt.toDate().toISOString()
            : typeof userDataFromDb.createdAt === 'string'
              ? userDataFromDb.createdAt
              : undefined,
        };
        setUser(appUserData);
        setLoading(false);
        return appUserData;
      } else {
        // This case means user authenticated with Firebase Auth, but no corresponding Firestore doc
        console.error("Firestore document not found for logged in user:", fbUserInstance.uid);
        await firebaseSignOut(auth); // Log out the user to prevent inconsistent state
        setUser(null);
        setLoading(false);
        throw new Error("User data not found in database. Please contact support.");
      }
    } catch (error) {
      console.error("Login error:", error);
      setUser(null);
      setLoading(false);
      throw error; // Re-throw to be caught by the caller (e.g., LoginPage)
    }
  }, []);

  const signupCompany = useCallback(
    async (companyDetails: CompanyDetails): Promise<AppUser | null> => {
      setLoading(true);
      try {
        // Check if email already exists in users collection (optional, as Firebase Auth handles this too)
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("email", "==", companyDetails.email));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          // Firebase Auth's createUserWithEmailAndPassword will throw 'auth/email-already-in-use'
          // This is an additional check, but you can rely on Firebase's error too.
          throw { code: 'auth/email-already-in-use', message: 'This email address is already in use by another account.' };
        }
        
        const userCredential = await createUserWithEmailAndPassword(auth, companyDetails.email, companyDetails.password);
        const fbUserInstance = userCredential.user;

        const newCompanyUserDocData = {
          id: fbUserInstance.uid, // Storing uid for consistency, though doc ID is already uid
          email: companyDetails.email,
          name: companyDetails.name, // Contact person's name
          companyName: companyDetails.companyName,
          phone: companyDetails.phone,
          role: 'company_representative' as AppUser['role'],
          approvalStatus: 'pending' as AppUser['approvalStatus'],
          companyId: `comp-${fbUserInstance.uid.substring(0, 10)}`, // Generate a company ID
          createdAt: serverTimestamp(),
        };

        await setDoc(doc(db, "users", fbUserInstance.uid), newCompanyUserDocData);
        
        // Construct the AppUser object to return (createdAt will be a server timestamp, so we can't immediately convert it)
        const appUser: AppUser = {
            id: fbUserInstance.uid,
            email: companyDetails.email,
            name: companyDetails.name,
            companyName: companyDetails.companyName,
            phone: companyDetails.phone,
            role: 'company_representative',
            approvalStatus: 'pending',
            companyId: newCompanyUserDocData.companyId,
            createdAt: new Date().toISOString(), // Approximate, actual value is server-generated
        };
        // Don't set user state here, let onAuthStateChanged handle it to ensure consistency
        setLoading(false);
        return appUser; // Or just void if caller doesn't need immediate user object
      } catch (error) {
        console.error("Company signup error:", error);
        setLoading(false);
        throw error; // Re-throw to be caught by the caller
      }
    },
    []
  );

  const signupAdmin = useCallback(
    async (adminDetails: AdminDetails): Promise<AppUser | null> => {
      setLoading(true);
      try {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("email", "==", adminDetails.email));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          throw { code: 'auth/email-already-in-use', message: 'This email address is already in use by another account.' };
        }
        
        const userCredential = await createUserWithEmailAndPassword(auth, adminDetails.email, adminDetails.password);
        const fbUserInstance = userCredential.user;

        const newAdminUserDocData = {
          id: fbUserInstance.uid,
          email: adminDetails.email,
          name: adminDetails.name,
          role: 'admin' as AppUser['role'],
          createdAt: serverTimestamp(),
        };
        await setDoc(doc(db, "users", fbUserInstance.uid), newAdminUserDocData);

        const appUser: AppUser = {
            id: fbUserInstance.uid,
            email: adminDetails.email,
            name: adminDetails.name,
            role: 'admin',
            createdAt: new Date().toISOString(), // Approximate
        };
        setLoading(false);
        return appUser;
      } catch (error) {
        console.error("Admin signup error:", error);
        setLoading(false);
        throw error;
      }
    },
    []
  );


  const logout = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      await firebaseSignOut(auth);
      setUser(null); // Clear local user state immediately
    } catch (error) {
      console.error("Logout error:", error);
      // Optionally handle logout errors, though they are rare
    } finally {
      setLoading(false);
    }
  }, []);

  const updateUserDocument = useCallback(async (userId: string, data: Partial<AppUser>): Promise<void> => {
    const userDocRef = doc(db, "users", userId);
    try {
        await updateDoc(userDocRef, data);
        // If the updated user is the currently logged-in user, refresh local state
        if (user && user.id === userId) {
          // Re-fetch or merge data to update local user state
          const updatedUserDocSnap = await getDoc(userDocRef);
          if (updatedUserDocSnap.exists()) {
            const updatedDataFromDb = updatedUserDocSnap.data();
            const refreshedUser: AppUser = {
              id: userId,
              email: updatedDataFromDb.email || '',
              role: updatedDataFromDb.role || 'individual',
              name: updatedDataFromDb.name,
              companyId: updatedDataFromDb.companyId,
              companyName: updatedDataFromDb.companyName,
              approvalStatus: updatedDataFromDb.approvalStatus,
              phone: updatedDataFromDb.phone,
              createdAt: updatedDataFromDb.createdAt instanceof Timestamp
                ? updatedDataFromDb.createdAt.toDate().toISOString()
                : typeof updatedDataFromDb.createdAt === 'string'
                  ? updatedDataFromDb.createdAt
                  : undefined,
            };
            setUser(refreshedUser);
          }
        }
    } catch (error) {
        console.error("Error updating user document:", error);
        throw error; // Re-throw to be caught by the caller
    }
  }, [user]); // Dependency on user to allow refreshing current user's state

  const contextValue: AuthState = useMemo(() => ({
    user,
    firebaseUser,
    loading,
    login,
    signupCompany,
    signupAdmin,
    logout,
    updateUserDocument,
  }), [user, firebaseUser, loading, login, signupCompany, signupAdmin, logout, updateUserDocument]);

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

    