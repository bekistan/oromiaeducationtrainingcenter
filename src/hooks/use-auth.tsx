
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
  collection, 
  query,       
  where,       
  getDocs,     
  limit        
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
  signupAdmin: (adminDetails: AdminDetails) => Promise<AppUserType | null>; // For superadmin to create admins
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
              createdAtString = userDataFromDb.createdAt; 
            } else if (userDataFromDb.createdAt && typeof userDataFromDb.createdAt.seconds === 'number' && typeof userDataFromDb.createdAt.nanoseconds === 'number') {
              // Handle cases where createdAt might be a plain object from Firestore (e.g., from direct console edits)
              createdAtString = new Timestamp(userDataFromDb.createdAt.seconds, userDataFromDb.createdAt.nanoseconds).toDate().toISOString();
            }

            const processedUserData: AppUserType = {
              id: fbUser.uid,
              email: userDataFromDb.email || '',
              role: userDataFromDb.role || 'individual',
              name: userDataFromDb.name,
              companyId: userDataFromDb.companyId,
              companyName: userDataFromDb.companyName,
              approvalStatus: userDataFromDb.approvalStatus,
              phone: userDataFromDb.phone, 
              createdAt: createdAtString, 
            };
            setUser(processedUserData);
          } else {
            // If user exists in Auth but not in Firestore, it's an inconsistent state.
            // Log them out from Firebase Auth to prevent issues.
            console.warn("User document not found in Firestore for UID:", fbUser.uid, "- Signing out to prevent inconsistent state.");
            await firebaseSignOut(auth); // This will trigger onAuthStateChanged again with fbUser = null
            setUser(null); // Explicitly clear local app user state
            setFirebaseUser(null); // Explicitly clear local firebase user state
          }
        } catch (error) {
          console.error("Error fetching user document from Firestore:", error);
           // Sign out in case of other errors during profile fetch
           await firebaseSignOut(auth);
           setUser(null);
           setFirebaseUser(null);
        }
      } else {
        setUser(null);
        // firebaseUser is already null here due to onAuthStateChanged
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
      
      // Fetch Firestore document to ensure user profile exists, as onAuthStateChanged does
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
        // setUser(appUserData); // Let onAuthStateChanged handle this for consistency
        setLoading(false);
        return appUserData;
      } else {
        console.error("Firestore document not found for logged in user:", fbUserInstance.uid);
        await firebaseSignOut(auth); // Sign out the user from Auth as their profile is incomplete
        setLoading(false);
        throw new Error("userDataMissing"); // Specific error key for login page to catch
      }
    } catch (error: any) {
      console.error("Login error in useAuth:", error);
      setLoading(false);
      // Re-throw Firebase specific auth errors, or the custom one from above
      throw error;
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

        const newCompanyUserDocData: Omit<AppUserType, 'id' | 'createdAt'> & { createdAt: any } = { // Ensure createdAt is compatible with serverTimestamp
          email: companyDetails.email,
          name: companyDetails.name, // This is the contact person's name
          companyName: companyDetails.companyName,
          phone: companyDetails.phone,
          role: 'company_representative' as const,
          approvalStatus: 'pending' as const,
          companyId: companyId, // Link user to their company
          createdAt: serverTimestamp(),
        };

        await setDoc(doc(db, "users", fbUserInstance.uid), newCompanyUserDocData);
        
        // The user state will be updated by onAuthStateChanged
        // For immediate use, we can construct and return the user object
        const registeredUser: AppUserType = {
            id: fbUserInstance.uid,
            email: companyDetails.email,
            name: companyDetails.name,
            companyName: companyDetails.companyName,
            phone: companyDetails.phone,
            role: 'company_representative',
            approvalStatus: 'pending',
            companyId: companyId,
            createdAt: new Date().toISOString(), // Approximate, Firestore will have server time
        };
        // setUser(registeredUser); // Let onAuthStateChanged handle this
        setLoading(false);
        return registeredUser;
      } catch (error) {
        console.error("Company signup error:", error);
        setLoading(false);
        throw error; // Re-throw to be caught by the form
      }
    },
    []
  );
  
  // For superadmin to register new admins
  const signupAdmin = useCallback(
    async (adminDetails: AdminDetails): Promise<AppUserType | null> => {
      // This check should ideally be more robust, e.g., checking current user's role from state
      if (user?.role !== 'superadmin') { 
        console.error("Unauthorized attempt to sign up admin by user:", user?.email, "with role:", user?.role);
        setLoading(false);
        throw new Error("Only superadmins can register new admins.");
      }
      setLoading(true);
      try {
        // Create user in Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(auth, adminDetails.email, adminDetails.password);
        const fbUserInstance = userCredential.user;

        // Add user to Firestore 'users' collection
        const newAdminUserDocData: Omit<AppUserType, 'id' | 'createdAt'> & { createdAt: any } = {
          email: adminDetails.email,
          name: adminDetails.name,
          role: 'admin' as const,
          createdAt: serverTimestamp(),
        };
        await setDoc(doc(db, "users", fbUserInstance.uid), newAdminUserDocData);
        
        const registeredAdmin: AppUserType = {
            id: fbUserInstance.uid,
            email: adminDetails.email,
            name: adminDetails.name,
            role: 'admin',
            createdAt: new Date().toISOString(), 
        };
        setLoading(false);
        return registeredAdmin;
      } catch (error) {
        console.error("Admin signup error:", error);
        setLoading(false);
        throw error;
      }
    },
    [user?.role] // Depend on user role to re-evaluate if needed, though this check is primarily for initial call
  );


  const logout = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      await firebaseSignOut(auth);
      // onAuthStateChanged will set user and firebaseUser to null
      setUser(null); 
      setFirebaseUser(null);
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateUserDocument = useCallback(async (userId: string, data: Partial<AppUserType>): Promise<void> => {
    const userDocRef = doc(db, "users", userId);
    try {
        await updateDoc(userDocRef, data);
        // If the updated user is the currently logged-in user, refresh their local state
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
  }, [user, setUser]); // Added setUser to dependency array

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

export const useAuth = (): AuthState => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
