
"use client";

import type { User as AppUser } from '@/types';
import React, { useState, useEffect, useCallback, useContext, createContext, ReactNode } from 'react';
import { auth, db } from '@/lib/firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';

interface AuthState {
  user: AppUser | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<AppUser | null>;
  signupCompany: (
    companyDetails: Omit<AppUser, 'id' | 'role' | 'approvalStatus' | 'companyId'> & { password?: string }
  ) => Promise<AppUser | null>;
  signupAdmin: (
    adminDetails: Omit<AppUser, 'id' | 'role' | 'approvalStatus' | 'companyId' | 'companyName'> & { password?: string }
  ) => Promise<AppUser | null>;
  logout: () => Promise<void>;
  updateUserDocument: (userId: string, data: Partial<AppUser>) => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
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
            setUser({ id: fbUser.uid, ...userDocSnap.data() } as AppUser);
          } else {
            console.warn("User document not found in Firestore for UID:", fbUser.uid);
            setUser(null);
          }
        } catch (error) {
            console.error("Error fetching user document from Firestore:", error);
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
      const fbUser = userCredential.user;
      const userDocRef = doc(db, "users", fbUser.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const appUserData = { id: fbUser.uid, ...userDocSnap.data() } as AppUser;
        setUser(appUserData);
        setFirebaseUser(fbUser);
        setLoading(false);
        return appUserData;
      } else {
        console.error("Firestore document not found for logged in user:", fbUser.uid);
        await firebaseSignOut(auth);
        setUser(null);
        setFirebaseUser(null);
        setLoading(false);
        throw new Error("User data not found in database.");
      }
    } catch (error) {
      console.error("Login error:", error);
      setUser(null);
      setFirebaseUser(null);
      setLoading(false);
      throw error;
    }
  }, []);

  const signupCompany = useCallback(
    async (
      companyDetails: Omit<AppUser, 'id' | 'role' | 'approvalStatus' | 'companyId'> & { password?: string }
    ): Promise<AppUser | null> => {
      if (!companyDetails.email || !companyDetails.password) {
        throw new Error("Email and password are required for signup.");
      }
      setLoading(true);
      try {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("email", "==", companyDetails.email));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            throw { code: 'auth/email-already-in-use', message: 'This email address is already in use by another account (Firestore check).' };
        }

        const userCredential = await createUserWithEmailAndPassword(auth, companyDetails.email, companyDetails.password);
        const fbUser = userCredential.user;

        const newCompanyUser: AppUser = {
          id: fbUser.uid,
          email: companyDetails.email,
          name: companyDetails.name, 
          companyName: companyDetails.companyName,
          phone: companyDetails.phone,
          role: 'company_representative',
          approvalStatus: 'pending',
          companyId: `comp-${fbUser.uid.substring(0, 10)}`,
        };

        await setDoc(doc(db, "users", fbUser.uid), newCompanyUser);
        setLoading(false);
        return newCompanyUser;
      } catch (error) {
        console.error("Company signup error:", error);
        setLoading(false);
        throw error;
      }
    },
    []
  );

  const signupAdmin = useCallback(
    async (
      adminDetails: Omit<AppUser, 'id' | 'role' | 'approvalStatus' | 'companyId' | 'companyName'> & { password?: string }
    ): Promise<AppUser | null> => {
      if (!adminDetails.email || !adminDetails.password) {
        throw new Error("Email and password are required for admin signup.");
      }
      setLoading(true);
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, adminDetails.email, adminDetails.password);
        const fbUser = userCredential.user;

        const newAdminUser: AppUser = {
          id: fbUser.uid,
          email: adminDetails.email,
          name: adminDetails.name,
          role: 'admin',
        };

        await setDoc(doc(db, "users", fbUser.uid), newAdminUser);
        setLoading(false);
        return newAdminUser;
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
      setUser(null);
      setFirebaseUser(null);
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateUserDocument = useCallback(async (userId: string, data: Partial<AppUser>): Promise<void> => {
    const userDocRef = doc(db, "users", userId);
    await updateDoc(userDocRef, data);
    if (user && user.id === userId) {
      const updatedUserDocSnap = await getDoc(userDocRef);
      if (updatedUserDocSnap.exists()) {
        setUser({ id: userId, ...updatedUserDocSnap.data() } as AppUser);
      }
    }
  }, [user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        firebaseUser,
        loading,
        login,
        signupCompany,
        signupAdmin,
        logout,
        updateUserDocument,
      }}
    >
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
