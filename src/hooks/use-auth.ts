
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
    adminDetails: Omit<AppUser, 'id' | 'role' | 'approvalStatus' | 'companyId' | 'companyName' | 'phone'> & { password?: string }
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
            // If user exists in Auth but not in Firestore users collection, sign them out.
            // This can happen if a user was deleted from Firestore but not from Auth.
            await firebaseSignOut(auth); 
            setUser(null);
          }
        } catch (error) {
            console.error("Error fetching user document from Firestore:", error);
            setUser(null); // Set user to null on error to avoid inconsistent state
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
        // This case should ideally not happen if signup ensures Firestore doc creation.
        // If it does, it's a data inconsistency.
        console.error("Firestore document not found for logged in user:", fbUserInstance.uid);
        await firebaseSignOut(auth); // Sign out to prevent partial login state
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
      throw error; // Re-throw the error to be caught by the caller
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
        // Check if email already exists in 'users' collection (more robust than just Firebase Auth check)
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("email", "==", companyDetails.email));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            // Firestore check indicates email is in use, even if Firebase Auth might allow it (e.g. if linked to another provider)
            throw { code: 'auth/email-already-in-use', message: 'This email address is already in use by another account (Firestore check).' };
        }

        const userCredential = await createUserWithEmailAndPassword(auth, companyDetails.email, companyDetails.password);
        const fbUserInstance = userCredential.user;

        // Create user document in Firestore
        const newCompanyUser: AppUser = {
          id: fbUserInstance.uid,
          email: companyDetails.email,
          name: companyDetails.name, // Contact person's name
          companyName: companyDetails.companyName,
          phone: companyDetails.phone, // Company's phone
          role: 'company_representative',
          approvalStatus: 'pending', // Companies start as pending
          companyId: `comp-${fbUserInstance.uid.substring(0, 10)}`, // Generate a simple companyId
        };

        await setDoc(doc(db, "users", fbUserInstance.uid), newCompanyUser);
        // No need to set user/firebaseUser state here, onAuthStateChanged will handle it.
        setLoading(false);
        return newCompanyUser; // Return the created user profile
      } catch (error) {
        console.error("Company signup error:", error);
        setLoading(false);
        throw error; // Re-throw
      }
    },
    []
  );
  
  // Function for superadmin to register a new admin
  const signupAdmin = useCallback(
    async (
      adminDetails: Omit<AppUser, 'id' | 'role' | 'approvalStatus' | 'companyId' | 'companyName' | 'phone'> & { password?: string }
    ): Promise<AppUser | null> => {
      if (!adminDetails.email || !adminDetails.password) {
        throw new Error("Email and password are required for admin signup.");
      }
      // Note: Add a check here to ensure the current user is a superadmin before allowing this action.
      // This check should ideally happen in the component calling signupAdmin.
      setLoading(true);
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, adminDetails.email, adminDetails.password);
        const fbUserInstance = userCredential.user;

        const newAdminUser: AppUser = {
          id: fbUserInstance.uid,
          email: adminDetails.email,
          name: adminDetails.name,
          role: 'admin', // New users created via this function are admins
          // Admins typically don't have companyName, companyId, approvalStatus in this context
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
    setLoading(true); // Indicate loading state during logout
    try {
      await firebaseSignOut(auth);
      // setUser and setFirebaseUser will be set to null by onAuthStateChanged
    } catch (error) {
      console.error("Logout error:", error);
      // Potentially handle logout errors if needed
    } finally {
      setLoading(false); // Reset loading state
    }
  }, []);

  const updateUserDocument = useCallback(async (userId: string, data: Partial<AppUser>): Promise<void> => {
    const userDocRef = doc(db, "users", userId);
    await updateDoc(userDocRef, data);
    // If the updated user is the currently logged-in user, refresh their local state
    if (user && user.id === userId) {
      // Re-fetch or merge: For simplicity, merging the updated data.
      // A re-fetch (getDoc) would be more robust for complex updates.
      const updatedUserDocSnap = await getDoc(userDocRef);
      if (updatedUserDocSnap.exists()) {
        setUser({ id: userId, ...updatedUserDocSnap.data() } as AppUser);
      }
    }
  }, [user]); // Dependency on `user` to ensure it's the latest when updating current user

  // Define the context value object
  const authContextValue: AuthState = {
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
    <AuthContext.Provider value={authContextValue}>
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
