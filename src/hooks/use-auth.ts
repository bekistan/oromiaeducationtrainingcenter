
"use client";

import type { User as AppUser } from '@/types';
import React, { useState, useEffect, useCallback, useContext, createContext, type ReactNode } from 'react';
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
    companyDetails: {
      companyName: string;
      name: string; // Contact person's name
      email: string;
      phone: string;
      password: string;
    }
  ) => Promise<AppUser | null>;
  signupAdmin: (
    adminDetails: {
      name: string;
      email: string;
      password: string;
    }
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
              email: userDataFromDb.email || '',
              role: userDataFromDb.role || 'individual',
              name: userDataFromDb.name,
              companyId: userDataFromDb.companyId,
              companyName: userDataFromDb.companyName,
              approvalStatus: userDataFromDb.approvalStatus,
              phone: userDataFromDb.phone,
            };
            setUser(processedUserData);
          } else {
            console.warn("User document not found in Firestore for UID:", fbUser.uid);
            // If user exists in Auth but not Firestore, log them out to avoid inconsistent state
            await firebaseSignOut(auth); 
            setUser(null);
          }
        } catch (error) {
            console.error("Error fetching user document from Firestore:", error);
            setUser(null); // Clear user state on error
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
        };
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
      throw error; // Re-throw to be caught by UI
    }
  }, []);

  const signupCompany = useCallback(
    async (
      companyDetails: {
        companyName: string;
        name: string; // Contact person's name
        email: string;
        phone: string;
        password: string;
      }
    ): Promise<AppUser | null> => {
      setLoading(true);
      try {
        // Check if email is already in use in Firestore (Auth might also throw this, but this is an extra check)
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
          approvalStatus: 'pending', // Default to pending
          companyId: `comp-${fbUserInstance.uid.substring(0, 10)}`, // Generate a simple company ID
        };

        await setDoc(doc(db, "users", fbUserInstance.uid), newCompanyUser);
        // No need to call setUser here, onAuthStateChanged will pick it up.
        setLoading(false);
        return newCompanyUser; // Return the newly created user data
      } catch (error) {
        console.error("Company signup error:", error);
        setLoading(false);
        throw error; // Re-throw to be caught by UI
      }
    },
    []
  );

  const signupAdmin = useCallback(
    async (
      adminDetails: {
        name: string;
        email: string;
        password: string;
      }
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
          role: 'admin', // Or 'superadmin' if you differentiate during creation
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
      // Optionally, inform the user about the logout error
    } finally {
      setLoading(false);
    }
  }, []);

  const updateUserDocument = useCallback(async (userId: string, data: Partial<AppUser>): Promise<void> => {
    const userDocRef = doc(db, "users", userId);
    await updateDoc(userDocRef, data);
    // If the updated user is the currently logged-in user, refresh their local state
    if (user && user.id === userId) {
      const updatedUserDocSnap = await getDoc(userDocRef);
      if (updatedUserDocSnap.exists()) {
        const updatedData = updatedUserDocSnap.data();
         const refreshedUser: AppUser = {
          id: userId,
          email: updatedData.email || '',
          role: updatedData.role || 'individual',
          name: updatedData.name,
          companyId: updatedData.companyId,
          companyName: updatedData.companyName,
          approvalStatus: updatedData.approvalStatus,
          phone: updatedData.phone,
        };
        setUser(refreshedUser);
      }
    }
  }, [user]); // Dependency on user to re-create if user object changes

  // Explicitly define the context value object
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
