
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
  Timestamp, // Ensure Timestamp is imported
} from 'firebase/firestore';
import type { User as AppUser } from '@/types'; // App's User type

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
  user: AppUser | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<AppUser | null>;
  signupCompany: (companyDetails: CompanyDetails) => Promise<AppUser | null>;
  signupAdmin: (adminDetails: AdminDetails) => Promise<AppUser | null>;
  logout: () => Promise<void>;
  updateUserDocument: (userId: string, data: Partial<AppUser>) => Promise<void>;
}

// Create the context with an undefined initial value
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
            
            let createdAtString: string | undefined = undefined;
            if (userDataFromDb.createdAt instanceof Timestamp) {
              createdAtString = userDataFromDb.createdAt.toDate().toISOString();
            } else if (typeof userDataFromDb.createdAt === 'string') {
              createdAtString = userDataFromDb.createdAt;
            } else if (userDataFromDb.createdAt && typeof userDataFromDb.createdAt.seconds === 'number' && typeof userDataFromDb.createdAt.nanoseconds === 'number') {
              createdAtString = new Timestamp(userDataFromDb.createdAt.seconds, userDataFromDb.createdAt.nanoseconds).toDate().toISOString();
            }

            const processedUserData: AppUser = {
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
            console.warn("User document not found in Firestore for UID:", fbUser.uid, "- Signing out to prevent inconsistent state.");
            await firebaseSignOut(auth); 
            setUser(null); 
            setFirebaseUser(null); 
          }
        } catch (error) {
          console.error("Error fetching user document from Firestore:", error);
           await firebaseSignOut(auth);
           setUser(null);
           setFirebaseUser(null);
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
        let createdAtString: string | undefined = undefined;
        if (userDataFromDb.createdAt instanceof Timestamp) {
          createdAtString = userDataFromDb.createdAt.toDate().toISOString();
        } else if (typeof userDataFromDb.createdAt === 'string') {
          createdAtString = userDataFromDb.createdAt;
        } else if (userDataFromDb.createdAt && typeof userDataFromDb.createdAt.seconds === 'number' && typeof userDataFromDb.createdAt.nanoseconds === 'number') {
           createdAtString = new Timestamp(userDataFromDb.createdAt.seconds, userDataFromDb.createdAt.nanoseconds).toDate().toISOString();
        }

        const appUserData: AppUser = {
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
        setUser(appUserData); // Set user state here
        setFirebaseUser(fbUserInstance); // Set firebase user state
        setLoading(false);
        return appUserData;
      } else {
        console.error("Firestore document not found for logged in user:", fbUserInstance.uid);
        await firebaseSignOut(auth);
        setLoading(false);
        throw new Error("User data not found in database. Please contact support.");
      }
    } catch (error) {
      console.error("Login error:", error);
      setLoading(false);
      throw error; 
    }
  }, []);

  const signupCompany = useCallback(
    async (companyDetails: CompanyDetails): Promise<AppUser | null> => {
      setLoading(true);
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, companyDetails.email, companyDetails.password);
        const fbUserInstance = userCredential.user;
        
        const companyId = `comp-${fbUserInstance.uid.substring(0, 10)}`;

        const newCompanyUserDocData: Omit<AppUser, 'id' | 'createdAt'> & { createdAt: any } = {
          email: companyDetails.email,
          name: companyDetails.name, 
          companyName: companyDetails.companyName,
          phone: companyDetails.phone,
          role: 'company_representative',
          approvalStatus: 'pending',
          companyId: companyId, 
          createdAt: serverTimestamp(), 
        };

        await setDoc(doc(db, "users", fbUserInstance.uid), newCompanyUserDocData);
        
        const registeredUser: AppUser = {
            id: fbUserInstance.uid,
            email: companyDetails.email,
            name: companyDetails.name,
            companyName: companyDetails.companyName,
            phone: companyDetails.phone,
            role: 'company_representative',
            approvalStatus: 'pending',
            companyId: companyId,
            // createdAt will be populated by serverTimestamp, not available immediately client-side as ISO string
        };
        // No need to set user/firebaseUser state here, onAuthStateChanged will handle it
        setLoading(false);
        return registeredUser;
      } catch (error) {
        console.error("Company signup error:", error);
        setLoading(false);
        throw error; 
      }
    },
    []
  );

  const signupAdmin = useCallback(
    async (adminDetails: AdminDetails): Promise<AppUser | null> => {
      setLoading(true);
      // This is a sensitive operation. In a real app, ensure this is only callable by an existing superadmin.
      // For this example, we assume authorization is handled elsewhere or this is an initial setup script.
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, adminDetails.email, adminDetails.password);
        const fbUserInstance = userCredential.user;

        const newAdminUserDocData: Omit<AppUser, 'id' | 'createdAt'> & { createdAt: any } = {
          email: adminDetails.email,
          name: adminDetails.name,
          role: 'admin',
          // No companyId, companyName, approvalStatus, phone for admins unless specified
          createdAt: serverTimestamp(),
        };
        await setDoc(doc(db, "users", fbUserInstance.uid), newAdminUserDocData);
        
        const registeredAdmin: AppUser = {
            id: fbUserInstance.uid,
            email: adminDetails.email,
            name: adminDetails.name,
            role: 'admin',
            // createdAt will be populated by serverTimestamp
        };
        // No need to set user/firebaseUser state here, onAuthStateChanged will handle it
        setLoading(false);
        return registeredAdmin;
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
    try {
        await updateDoc(userDocRef, data);
        // If updating the currently logged-in user, refresh local state
        if (user && user.id === userId) { 
          const updatedUserDocSnap = await getDoc(userDocRef);
          if (updatedUserDocSnap.exists()) {
            const updatedDataFromDb = updatedUserDocSnap.data();
            let createdAtString: string | undefined = undefined;
            if (updatedDataFromDb.createdAt instanceof Timestamp) {
              createdAtString = updatedDataFromDb.createdAt.toDate().toISOString();
            } else if (typeof updatedDataFromDb.createdAt === 'string') {
                createdAtString = updatedDataFromDb.createdAt;
            } else if (updatedDataFromDb.createdAt && typeof updatedDataFromDb.createdAt.seconds === 'number' && typeof updatedDataFromDb.createdAt.nanoseconds === 'number') {
                createdAtString = new Timestamp(updatedDataFromDb.createdAt.seconds, updatedDataFromDb.createdAt.nanoseconds).toDate().toISOString();
            }
            const refreshedUser: AppUser = {
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
  }, [user]); // Dependency on 'user' to ensure it's the latest version when updating self

  // Memoize the context value to prevent unnecessary re-renders of consumers
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

    