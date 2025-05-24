
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
    companyDetails: Omit<AppUser, 'id' | 'role' | 'approvalStatus' | 'companyId'> & { password: string; companyName: string; phone: string; name: string; email: string; }
  ) => Promise<AppUser | null>;
  signupAdmin: (
    adminDetails: Omit<AppUser, 'id' | 'role' | 'approvalStatus' | 'companyId' | 'companyName' | 'phone'> & { password: string; name: string; email: string; }
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
            const processedUserData: AppUser = {
              id: fbUser.uid,
              email: userDataFromDb.email,
              role: userDataFromDb.role,
              name: userDataFromDb.name,
              companyId: userDataFromDb.companyId,
              companyName: userDataFromDb.companyName,
              approvalStatus: userDataFromDb.approvalStatus,
              phone: userDataFromDb.phone,
            };
            setUser(processedUserData);
          } else {
            console.warn("User document not found in Firestore for UID:", fbUser.uid);
            await firebaseSignOut(auth);
            setUser(null);
          }
        } catch (error) {
            console.error("Error fetching user document from Firestore:", error);
            setUser(null); // Ensure user is null if there's an error
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
          email: userDataFromDb.email,
          role: userDataFromDb.role,
          name: userDataFromDb.name,
          companyId: userDataFromDb.companyId,
          companyName: userDataFromDb.companyName,
          approvalStatus: userDataFromDb.approvalStatus,
          phone: userDataFromDb.phone,
        };
        setUser(appUserData);
        setFirebaseUser(fbUserInstance);
        setLoading(false);
        return appUserData;
      } else {
        console.error("Firestore document not found for logged in user:", fbUserInstance.uid);
        await firebaseSignOut(auth); // Sign out to prevent inconsistent state
        setUser(null);
        setFirebaseUser(null);
        setLoading(false);
        throw new Error("User data not found in database. Please contact support.");
      }
    } catch (error) {
      console.error("Login error:", error);
      setUser(null); // Ensure user state is cleared on error
      setFirebaseUser(null);
      setLoading(false);
      throw error; // Re-throw to be handled by UI
    }
  }, []);

  const signupCompany = useCallback(
    async (
      companyDetails: Omit<AppUser, 'id' | 'role' | 'approvalStatus' | 'companyId'> & { password: string; companyName: string; phone: string; name: string; email: string; }
    ): Promise<AppUser | null> => {
      setLoading(true);
      try {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("email", "==", companyDetails.email));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            throw { code: 'auth/email-already-in-use', message: 'This email address is already in use by another account.' };
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
      adminDetails: Omit<AppUser, 'id' | 'role' | 'approvalStatus' | 'companyId' | 'companyName' | 'phone'> & { password: string; name: string; email: string; }
    ): Promise<AppUser | null> => {
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
        const updatedData = updatedUserDocSnap.data();
         const refreshedUser: AppUser = {
          id: userId,
          email: updatedData.email,
          role: updatedData.role,
          name: updatedData.name,
          companyId: updatedData.companyId,
          companyName: updatedData.companyName,
          approvalStatus: updatedData.approvalStatus,
          phone: updatedData.phone,
        };
        setUser(refreshedUser);
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
