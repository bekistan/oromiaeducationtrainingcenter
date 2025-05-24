
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
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, serverTimestamp } from 'firebase/firestore';

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
            };
            setUser(processedUserData);
          } else {
            console.warn("User document not found in Firestore for UID:", fbUser.uid);
            // If user doc doesn't exist, could be an orphaned auth user or mid-registration state
            // For now, treat as logged out until full profile is available.
            // In a more complex scenario, you might try to create a default profile or redirect.
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
        };
        setUser(appUserData);
        // setFirebaseUser is handled by onAuthStateChanged
        setLoading(false);
        return appUserData;
      } else {
        console.error("Firestore document not found for logged in user:", fbUserInstance.uid);
        await firebaseSignOut(auth);
        setUser(null);
        setLoading(false);
        throw new Error("User data not found in database. Please contact support.");
      }
    } catch (error) {
      console.error("Login error:", error);
      setUser(null);
      setLoading(false);
      throw error;
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
          // createdAt: serverTimestamp() // Uncomment if you add this field to your User type/Firestore
        };

        await setDoc(doc(db, "users", fbUserInstance.uid), newCompanyUser);
        // User state will be updated by onAuthStateChanged
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
      adminDetails: {
        name: string;
        email: string;
        password: string;
      }
    ): Promise<AppUser | null> => {
      setLoading(true);
      // This function would typically be called by a superadmin from a secure environment
      // For this app, it's called from a superadmin-only page
      try {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("email", "==", adminDetails.email));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
           throw { code: 'auth/email-already-in-use', message: 'This email address is already in use by another account.' };
        }
        
        // Create user in Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(auth, adminDetails.email, adminDetails.password);
        const fbUserInstance = userCredential.user;

        // Store user details in Firestore
        const newAdminUser: AppUser = {
          id: fbUserInstance.uid,
          email: adminDetails.email,
          name: adminDetails.name,
          role: 'admin', // Or 'superadmin' based on further logic if needed
          // approvalStatus is not typically needed for admins
          // createdAt: serverTimestamp()
        };

        await setDoc(doc(db, "users", fbUserInstance.uid), newAdminUser);
        // User state will be updated by onAuthStateChanged if this new admin logs in
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
      // firebaseUser will be set to null by onAuthStateChanged
    } catch (error) {
      console.error("Logout error:", error);
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
