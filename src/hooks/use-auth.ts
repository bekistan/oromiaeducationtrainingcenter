
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
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, Timestamp } from 'firebase/firestore';

interface AuthState {
  user: AppUser | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<AppUser | null>;
  signupCompany: (
    companyDetails: Omit<AppUser, 'id' | 'role' | 'approvalStatus' | 'companyId'> & { password?: string; companyName: string; phone: string; }
  ) => Promise<AppUser | null>;
  signupAdmin: (
    adminDetails: Omit<AppUser, 'id' | 'role' | 'approvalStatus' | 'companyId' | 'companyName' | 'phone' > & { password?: string }
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
            const userDataFromDb = userDocSnap.data();
            const processedUserData = { ...userDataFromDb };
            // Example for timestamp conversion if you add date fields later:
            // if (processedUserData.createdAt instanceof Timestamp) {
            //   processedUserData.createdAt = processedUserData.createdAt.toDate().toISOString();
            // }
            setUser({ id: fbUser.uid, ...processedUserData } as AppUser);
          } else {
            console.warn("User document not found in Firestore for UID:", fbUser.uid);
            await firebaseSignOut(auth); 
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
      const fbUserInstance = userCredential.user;
      const userDocRef = doc(db, "users", fbUserInstance.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const appUserData = { id: fbUserInstance.uid, ...userDocSnap.data() } as AppUser;
        setUser(appUserData);
        setFirebaseUser(fbUserInstance);
        setLoading(false);
        return appUserData;
      } else {
        console.error("Firestore document not found for logged in user:", fbUserInstance.uid);
        await firebaseSignOut(auth); 
        setUser(null);
        setFirebaseUser(null);
        setLoading(false);
        throw new Error("User data not found in database. Please contact support.");
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
      companyDetails: Omit<AppUser, 'id' | 'role' | 'approvalStatus' | 'companyId'> & { password?: string; companyName: string; phone: string; }
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
            throw { code: 'auth/email-already-in-use', message: 'This email address is already in use.' };
        }
        
        const userCredential = await createUserWithEmailAndPassword(auth, companyDetails.email, companyDetails.password);
        const fbUserInstance = userCredential.user;

        const newCompanyUser: AppUser = {
          id: fbUserInstance.uid,
          email: companyDetails.email,
          name: companyDetails.name, 
          companyName: companyDetails.companyName,
          phone: companyDetails.phone,
          role: 'company_representative',
          approvalStatus: 'pending',
          companyId: `comp-${fbUserInstance.uid.substring(0, 10)}`, 
        };

        await setDoc(doc(db, "users", fbUserInstance.uid), newCompanyUser);
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
      adminDetails: Omit<AppUser, 'id' | 'role' | 'approvalStatus' | 'companyId' | 'companyName' | 'phone' > & { password?: string }
    ): Promise<AppUser | null> => {
      if (!adminDetails.email || !adminDetails.password) {
        throw new Error("Email and password are required for admin signup.");
      }
      setLoading(true);
      try {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("email", "==", adminDetails.email));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            throw { code: 'auth/email-already-in-use', message: 'This email address is already in use.' };
        }

        const userCredential = await createUserWithEmailAndPassword(auth, adminDetails.email, adminDetails.password);
        const fbUserInstance = userCredential.user;

        const newAdminUser: AppUser = {
          id: fbUserInstance.uid,
          email: adminDetails.email,
          name: adminDetails.name,
          role: 'admin', 
        };

        await setDoc(doc(db, "users", fbUserInstance.uid), newAdminUser);
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

  const contextValue: AuthState = {
    user,
    firebaseUser,
    loading,
    login,
    signupCompany,
    signupAdmin,
    logout,
    updateUserDocument,
  };

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
