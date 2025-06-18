
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
  buildingAssignment?: 'ifaboru' | 'buuraboru'; 
}

interface KeyholderDetails {
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
  signupKeyholder: (keyholderDetails: KeyholderDetails) => Promise<AppUserType | null>;
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

  const handleAuthChange = useCallback(async (currentFbUser: FirebaseUser | null) => {
    try {
      setFirebaseUser(currentFbUser);
      if (currentFbUser) {
        const userDocRef = doc(db, "users", currentFbUser.uid);
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

          const processedUserData: AppUserType = {
            id: currentFbUser.uid,
            email: userDataFromDb.email || '',
            role: userDataFromDb.role || 'individual',
            name: userDataFromDb.name,
            companyId: userDataFromDb.companyId,
            companyName: userDataFromDb.companyName,
            approvalStatus: userDataFromDb.approvalStatus,
            phone: userDataFromDb.phone,
            buildingAssignment: userDataFromDb.buildingAssignment === null ? undefined : userDataFromDb.buildingAssignment, // Handle null from DB
            createdAt: createdAtString,
          };
          setUser(processedUserData);
        } else {
          console.warn("User document not found in Firestore for UID:", currentFbUser.uid, "- Signing out to prevent inconsistent state.");
          await firebaseSignOut(auth);
          setUser(null); 
        }
      } else {
        setUser(null);
      }
    } catch (error: any) {
      if (error === true) {
        console.error("Auth Error: Caught boolean 'true' in handleAuthChange try-catch.", error);
        throw new Error("Original error was true: handleAuthChange try-catch");
      }
      console.error("Error processing auth state change in handleAuthChange:", error);
      if (auth.currentUser) {
        try {
          await firebaseSignOut(auth);
        } catch (signOutError) {
          console.error("Error during fallback sign out in handleAuthChange (inner catch):", signOutError);
        }
      }
      setUser(null); 
      setFirebaseUser(null); 
      throw error; 
    } 
  }, []);


  useEffect(() => {
    setLoading(true); 
    const unsubscribe = onAuthStateChanged(auth, (fbUserInstance) => {
      handleAuthChange(fbUserInstance)
        .catch(e => {
          if (e === true) {
            console.error("Auth Error: Caught boolean 'true' from handleAuthChange promise in onAuthStateChanged.", e);
          } else {
            console.error("Unhandled error from handleAuthChange promise chain in onAuthStateChanged:", e);
          }
          setUser(null);
          setFirebaseUser(null);
        })
        .finally(() => {
          setLoading(false); 
        });
    });

    return () => {
      unsubscribe();
      setLoading(false); 
    }
  }, [handleAuthChange]);


  const login = useCallback(async (email: string, pass: string): Promise<AppUserType | null> => {
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

        const appUserData: AppUserType = {
          id: fbUserInstance.uid,
          email: userDataFromDb.email || '',
          role: userDataFromDb.role || 'individual',
          name: userDataFromDb.name,
          companyId: userDataFromDb.companyId,
          companyName: userDataFromDb.companyName,
          approvalStatus: userDataFromDb.approvalStatus,
          phone: userDataFromDb.phone,
          buildingAssignment: userDataFromDb.buildingAssignment === null ? undefined : userDataFromDb.buildingAssignment,
          createdAt: createdAtString,
        };
        return appUserData; 
      } else {
        console.error("Firestore document not found for logged in user:", fbUserInstance.uid);
        await firebaseSignOut(auth); 
        throw new Error("userDataMissing");
      }
    } catch (error: any) {
      if (error === true) {
        console.error("Auth Error: Caught boolean 'true' in login.", error);
        throw new Error("Original error was true: login");
      }
      console.error("Login error in useAuth:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const signupCompany = useCallback(
    async (companyDetails: CompanyDetails): Promise<AppUserType | null> => {
      setLoading(true);
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, companyDetails.email, companyDetails.password);
        const fbUserInstance = userCredential.user;
        const companyId = `comp_${fbUserInstance.uid.substring(0, 10)}_${Date.now().toString(36)}`;
        const newCompanyUserDocData: Omit<AppUserType, 'id' | 'createdAt'> & { createdAt: any } = {
          email: companyDetails.email,
          name: companyDetails.name,
          companyName: companyDetails.companyName,
          phone: companyDetails.phone,
          role: 'company_representative' as const,
          approvalStatus: 'pending' as const,
          companyId: companyId,
          createdAt: serverTimestamp(),
        };
        await setDoc(doc(db, "users", fbUserInstance.uid), newCompanyUserDocData);
        return {
            id: fbUserInstance.uid,
            email: companyDetails.email,
            name: companyDetails.name,
            companyName: companyDetails.companyName,
            phone: companyDetails.phone,
            role: 'company_representative',
            approvalStatus: 'pending',
            companyId: companyId,
            createdAt: new Date().toISOString(),
        };
      } catch (error: any) {
        if (error === true) {
            console.error("Auth Error: Caught boolean 'true' in signupCompany.", error);
            throw new Error("Original error was true: signupCompany");
        }
        console.error("Company signup error:", error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const signupAdmin = useCallback(
    async (adminDetails: AdminDetails): Promise<AppUserType | null> => {
      setLoading(true);
      try {
        // Ensure the current user (performing the action) is a superadmin
        const currentUserDocRef = auth.currentUser ? doc(db, "users", auth.currentUser.uid) : null;
        if (!currentUserDocRef) throw new Error("Current user not found for authorization check.");
        const currentUserDocSnap = await getDoc(currentUserDocRef);
        if (!currentUserDocSnap.exists() || currentUserDocSnap.data()?.role !== 'superadmin') {
          console.error("Unauthorized attempt to sign up admin by user:", auth.currentUser?.email);
          throw new Error("Only superadmins can register new admins.");
        }
        
        const userCredential = await createUserWithEmailAndPassword(auth, adminDetails.email, adminDetails.password);
        const fbUserInstance = userCredential.user;
        
        const newAdminUserDocData: Omit<AppUserType, 'id' | 'createdAt'> & { createdAt: any } = {
          email: adminDetails.email,
          name: adminDetails.name,
          role: 'admin' as const,
          createdAt: serverTimestamp(),
          ...(adminDetails.buildingAssignment && { buildingAssignment: adminDetails.buildingAssignment }),
        };
        if (!adminDetails.buildingAssignment) {
          (newAdminUserDocData as AppUserType).buildingAssignment = null; // Explicitly set to null for general admin
        }

        await setDoc(doc(db, "users", fbUserInstance.uid), newAdminUserDocData);
        
        return {
            id: fbUserInstance.uid,
            email: adminDetails.email,
            name: adminDetails.name,
            role: 'admin',
            buildingAssignment: adminDetails.buildingAssignment || null,
            createdAt: new Date().toISOString(),
        };
      } catch (error: any) {
        if (error === true) {
            console.error("Auth Error: Caught boolean 'true' in signupAdmin.", error);
            throw new Error("Original error was true: signupAdmin");
        }
        console.error("Admin signup error:", error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [] 
  );

  const signupKeyholder = useCallback(
    async (keyholderDetails: KeyholderDetails): Promise<AppUserType | null> => {
      setLoading(true);
      try {
         const currentUserDocRef = auth.currentUser ? doc(db, "users", auth.currentUser.uid) : null;
         if (!currentUserDocRef) throw new Error("Current user not found for authorization check.");
         const currentUserDocSnap = await getDoc(currentUserDocRef);
         if (!currentUserDocSnap.exists() || !['admin', 'superadmin'].includes(currentUserDocSnap.data()?.role)) {
          console.error("Unauthorized attempt to sign up keyholder by user:", auth.currentUser?.email);
          throw new Error("Only admins or superadmins can register new keyholders.");
        }

        const userCredential = await createUserWithEmailAndPassword(auth, keyholderDetails.email, keyholderDetails.password);
        const fbUserInstance = userCredential.user;
        const newKeyholderUserDocData: Omit<AppUserType, 'id' | 'createdAt'> & { createdAt: any } = {
          email: keyholderDetails.email,
          name: keyholderDetails.name,
          role: 'keyholder' as const,
          createdAt: serverTimestamp(),
        };
        await setDoc(doc(db, "users", fbUserInstance.uid), newKeyholderUserDocData);
        return {
            id: fbUserInstance.uid,
            email: keyholderDetails.email,
            name: keyholderDetails.name,
            role: 'keyholder',
            createdAt: new Date().toISOString(),
        };
      } catch (error: any) {
        if (error === true) {
            console.error("Auth Error: Caught boolean 'true' in signupKeyholder.", error);
            throw new Error("Original error was true: signupKeyholder");
        }
        console.error("Keyholder signup error:", error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [] 
  );

  const logout = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      await firebaseSignOut(auth);
    } catch (error: any) {
      if (error === true) {
        console.error("Auth Error: Caught boolean 'true' in logout.", error);
      }
      console.error("Logout error:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateUserDocument = useCallback(async (userId: string, data: Partial<AppUserType>): Promise<void> => {
    const userDocRef = doc(db, "users", userId);
    try {
        // If buildingAssignment is explicitly set to undefined in data, it means "remove it" or "set to null"
        // Firestore update treats 'undefined' as 'delete field', which is what we want for optional.
        // If data.buildingAssignment is null, it will store null.
        const updateData = { ...data };
        if (data.hasOwnProperty('buildingAssignment') && data.buildingAssignment === undefined) {
            (updateData as any).buildingAssignment = null; // Set to null explicitly if 'undefined' was intended to clear it
        }

        await updateDoc(userDocRef, updateData);
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
              buildingAssignment: updatedDataFromDb.buildingAssignment === null ? undefined : updatedDataFromDb.buildingAssignment,
              createdAt: createdAtString,
            };
            setUser(refreshedUser);
          }
        }
    } catch (error: any) {
        if (error === true) {
            console.error("Auth Error: Caught boolean 'true' in updateUserDocument.", error);
            throw new Error("Original error was true: updateUserDocument");
        }
        console.error("Error updating user document:", error);
        throw error; 
    }
  }, [user]); 

  const contextValue = useMemo<AuthState>(() => ({
    user,
    firebaseUser,
    loading,
    login,
    signupCompany,
    signupAdmin,
    signupKeyholder,
    logout,
    updateUserDocument,
  }), [user, firebaseUser, loading, login, signupCompany, signupAdmin, signupKeyholder, logout, updateUserDocument]);

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
    
