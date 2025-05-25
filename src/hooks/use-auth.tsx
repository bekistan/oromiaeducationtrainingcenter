
"use client";

import React, { useState, useEffect, useCallback, useContext, createContext, type ReactNode, useMemo } from 'react';
import { auth, db } from '@/lib/firebase'; // Firebase init
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
} from 'firebase/firestore';
import type { User as AppUserType } from '@/types'; // App's User type

// Interfaces for function parameters
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

// Define the shape of the context state
interface AuthState {
  user: AppUserType | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<AppUserType | null>;
  signupCompany: (companyDetails: CompanyDetails) => Promise<AppUserType | null>;
  signupAdmin: (adminDetails: AdminDetails) => Promise<AppUserType | null>;
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
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        const userDocRef = doc(db, "users", fbUser.uid);
        try {
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            const userDataFromDb = userDocSnap.data();
            
            let createdAtString: string | undefined = undefined;
            if (userDataFromDb.createdAt instanceof Timestamp) {
              createdAtString = userDataFromDb.createdAt.toDate().toISOString();
            } else if (typeof userDataFromDb.createdAt === 'string') {
              // If it's already a string (e.g., from a previous incorrect save or mock)
              createdAtString = userDataFromDb.createdAt; 
            } else if (userDataFromDb.createdAt && typeof userDataFromDb.createdAt.seconds === 'number' && typeof userDataFromDb.createdAt.nanoseconds === 'number') {
              // Handle object representation of Timestamp if directly from Firestore REST API or similar
              createdAtString = new Timestamp(userDataFromDb.createdAt.seconds, userDataFromDb.createdAt.nanoseconds).toDate().toISOString();
            }

            const processedUserData: AppUserType = {
              id: fbUser.uid,
              email: userDataFromDb.email || '',
              role: userDataFromDb.role || 'individual', // Default role
              name: userDataFromDb.name,
              companyId: userDataFromDb.companyId,
              companyName: userDataFromDb.companyName,
              approvalStatus: userDataFromDb.approvalStatus,
              phone: userDataFromDb.phone, 
              createdAt: createdAtString, 
            };
            setUser(processedUserData);
          } else {
            console.warn("User document not found in Firestore for UID:", fbUser.uid, "- Signing out to prevent inconsistent state.");
            // If user exists in Firebase Auth but not in Firestore, something is wrong. Sign them out.
            await firebaseSignOut(auth); 
            setUser(null); 
            setFirebaseUser(null);
          }
        } catch (error) {
          console.error("Error fetching user document from Firestore:", error);
           // Sign out on error to prevent inconsistent states
           await firebaseSignOut(auth);
           setUser(null);
           setFirebaseUser(null);
        }
      } else {
        setUser(null);
        setFirebaseUser(null); 
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const login = useCallback(async (email: string, pass: string): Promise<AppUserType | null> => {
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, pass);
      const fbUserInstance = userCredential.user;
      // onAuthStateChanged will handle setting the user state from Firestore
      // We just need to ensure login was successful and return the user data if needed immediately
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
          companyId: userDataFromDb.companyId,
          companyName: userDataFromDb.companyName,
          approvalStatus: userDataFromDb.approvalStatus,
          phone: userDataFromDb.phone,
          createdAt: createdAtString,
        };
        // setUser(appUserData); // No need to set user here, onAuthStateChanged does it
        setLoading(false);
        return appUserData;
      } else {
        // This case should ideally not happen if registration creates the Firestore doc
        console.error("Firestore document not found for logged in user:", fbUserInstance.uid);
        await firebaseSignOut(auth); // Sign out to prevent inconsistent state
        setLoading(false);
        throw new Error("User data not found in database. Please contact support.");
      }
    } catch (error) {
      console.error("Login error:", error);
      setLoading(false);
      throw error; // Re-throw for the login page to handle
    }
  }, []);

  const signupCompany = useCallback(
    async (companyDetails: CompanyDetails): Promise<AppUserType | null> => {
      setLoading(true);
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, companyDetails.email, companyDetails.password);
        const fbUserInstance = userCredential.user;
        
        // Create a unique company ID, e.g., using part of UID and timestamp
        const companyId = `comp_${fbUserInstance.uid.substring(0, 10)}_${Date.now().toString(36)}`;

        const newCompanyUserDocData: Omit<AppUserType, 'id' | 'createdAt'> & { createdAt: any } = {
          email: companyDetails.email,
          name: companyDetails.name, // Contact person's name
          companyName: companyDetails.companyName,
          phone: companyDetails.phone,
          role: 'company_representative' as const,
          approvalStatus: 'pending' as const, // Companies start as pending
          companyId: companyId, // Link user to their company
          createdAt: serverTimestamp(), // Use Firestore server timestamp
        };

        await setDoc(doc(db, "users", fbUserInstance.uid), newCompanyUserDocData);
        
        // Construct the AppUserType for immediate return (createdAt will be null/undefined until fetched)
        const registeredUser: AppUserType = {
            id: fbUserInstance.uid,
            email: companyDetails.email,
            name: companyDetails.name,
            companyName: companyDetails.companyName,
            phone: companyDetails.phone,
            role: 'company_representative',
            approvalStatus: 'pending',
            companyId: companyId,
            createdAt: new Date().toISOString(), // Placeholder, will be updated on next fetch
        };
        // setUser(registeredUser); // onAuthStateChanged will handle this
        setLoading(false);
        return registeredUser;
      } catch (error) {
        console.error("Company signup error:", error);
        setLoading(false);
        throw error; // Re-throw for the registration page to handle
      }
    },
    []
  );

  const signupAdmin = useCallback(
    async (adminDetails: AdminDetails): Promise<AppUserType | null> => {
      // This check should ideally be done with more robust server-side validation
      // or by protecting the route/function that calls this.
      if (user?.role !== 'superadmin') {
        console.error("Unauthorized attempt to sign up admin.");
        throw new Error("Only superadmins can register new admins.");
      }
      setLoading(true);
      try {
        // Note: This creates the user in Firebase Auth. You might want to use Firebase Admin SDK for this
        // if you are calling this from a secure backend environment, to avoid client-side admin creation.
        const userCredential = await createUserWithEmailAndPassword(auth, adminDetails.email, adminDetails.password);
        const fbUserInstance = userCredential.user;

        const newAdminUserDocData: Omit<AppUserType, 'id' | 'createdAt'> & { createdAt: any } = {
          email: adminDetails.email,
          name: adminDetails.name,
          role: 'admin' as const, // New users registered here are admins
          createdAt: serverTimestamp(),
        };
        await setDoc(doc(db, "users", fbUserInstance.uid), newAdminUserDocData);
        
        const registeredAdmin: AppUserType = {
            id: fbUserInstance.uid,
            email: adminDetails.email,
            name: adminDetails.name,
            role: 'admin',
            createdAt: new Date().toISOString(), // Placeholder
        };
        // setUser(registeredAdmin); // onAuthStateChanged will handle this
        setLoading(false);
        return registeredAdmin;
      } catch (error) {
        console.error("Admin signup error:", error);
        setLoading(false);
        throw error; // Re-throw for the registration page to handle
      }
    },
    [user?.role] // Re-run if current user's role changes (e.g., promoting someone)
  );

  const logout = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      await firebaseSignOut(auth);
      // onAuthStateChanged will set user and firebaseUser to null
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      // Ensure states are cleared even if onAuthStateChanged takes time or fails
      setUser(null); 
      setFirebaseUser(null);
      setLoading(false);
    }
  }, []);

  // Function to update a user's document in Firestore (e.g., for admin to approve company)
  const updateUserDocument = useCallback(async (userId: string, data: Partial<AppUserType>): Promise<void> => {
    const userDocRef = doc(db, "users", userId);
    try {
        await updateDoc(userDocRef, data);
        // If updating the currently logged-in user, refresh their local state
        if (user && user.id === userId) { 
          // Fetch the updated document to refresh local state
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
              companyId: updatedDataFromDb.companyId,
              companyName: updatedDataFromDb.companyName,
              approvalStatus: updatedDataFromDb.approvalStatus,
              phone: updatedDataFromDb.phone,
              createdAt: createdAtString,
            };
            setUser(refreshedUser);
          }
        }
    } catch (error) {
        console.error("Error updating user document:", error);
        throw error;
    }
  }, [user]); // `user` dependency to refresh current user if their own doc is updated.

  // Memoize the context value to prevent unnecessary re-renders of consumers
  // if the AuthProvider's props don't change identity (which they don't here)
  const contextValue = useMemo<AuthState>(() => ({
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

// Custom hook to use the auth context
export const useAuth = (): AuthState => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

    
    