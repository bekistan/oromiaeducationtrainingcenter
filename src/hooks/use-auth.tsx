
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

interface KeyholderDetails { // New interface for keyholder
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
  signupKeyholder: (keyholderDetails: KeyholderDetails) => Promise<AppUserType | null>; // New function
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
    const handleAuthChange = async (currentFbUser: FirebaseUser | null) => {
      setFirebaseUser(currentFbUser); // Set Firebase user state immediately

      if (currentFbUser) {
        try {
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
              createdAt: createdAtString, 
            };
            setUser(processedUserData);
          } else {
            console.warn("User document not found in Firestore for UID:", currentFbUser.uid, "- Signing out to prevent inconsistent state.");
            await firebaseSignOut(auth); // This will trigger onAuthStateChanged again with null
            setUser(null); // Explicitly set app user to null
            // setFirebaseUser(null) will be handled by the subsequent onAuthStateChanged call
          }
        } catch (error: any) {
          console.error("Error fetching user document from Firestore in handleAuthChange:", error);
          if (error.code === 'unavailable') {
            console.error("Firestore offline: Could not fetch user profile. Signing out user.");
          }
          await firebaseSignOut(auth); // Attempt to sign out to reset
          setUser(null);
          // setFirebaseUser(null) will be handled by the subsequent onAuthStateChanged call
        }
      } else {
        setUser(null); // No Firebase user, so no app user
      }
      setLoading(false); // Set loading to false after processing
    };
    
    const unsubscribe = onAuthStateChanged(auth, (fbUserInstance) => {
      // setLoading(true) here could cause quick flashes if auth state resolves fast
      // It's better to manage loading within handleAuthChange or rely on the initial true state.
      handleAuthChange(fbUserInstance).catch(e => {
        console.error("Unhandled error within handleAuthChange promise:", e);
        // If handleAuthChange itself fails catastrophically, ensure loading is false
        setLoading(false);
        // Optionally, try to sign out and clear user state as a fallback
        firebaseSignOut(auth).catch(signOutError => console.error("Fallback sign out failed:", signOutError));
        setUser(null);
        setFirebaseUser(null);
      });
    });

    return () => unsubscribe();
  }, []); // Empty dependency array is correct for onAuthStateChanged

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
          createdAt: createdAtString,
        };
        // setUser and setFirebaseUser will be handled by onAuthStateChanged
        setLoading(false);
        return appUserData;
      } else {
        console.error("Firestore document not found for logged in user:", fbUserInstance.uid);
        await firebaseSignOut(auth); 
        setLoading(false);
        throw new Error("userDataMissing"); 
      }
    } catch (error: any) {
      console.error("Login error in useAuth:", error);
      setLoading(false);
      throw error;
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
        
        const registeredUser: AppUserType = {
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
        // setUser and setFirebaseUser will be handled by onAuthStateChanged
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
    async (adminDetails: AdminDetails): Promise<AppUserType | null> => {
      // Admin creation should ideally be done via a backend mechanism or a more secure admin interface
      // For now, relying on client-side role check.
      if (user?.role !== 'superadmin') { 
        console.error("Unauthorized attempt to sign up admin by user:", user?.email, "with role:", user?.role);
        setLoading(false);
        throw new Error("Only superadmins can register new admins.");
      }
      setLoading(true);
      try {
        // Note: This creates the user in the current session.
        // Consider if a separate admin action/backend function is more appropriate.
        const userCredential = await createUserWithEmailAndPassword(auth, adminDetails.email, adminDetails.password);
        const fbUserInstance = userCredential.user;

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
        // setUser and setFirebaseUser for this new admin are not directly set here,
        // as the current user (superadmin) remains logged in.
        setLoading(false);
        return registeredAdmin;
      } catch (error) {
        console.error("Admin signup error:", error);
        setLoading(false);
        throw error;
      }
    },
    [user?.role] 
  );

  const signupKeyholder = useCallback(
    async (keyholderDetails: KeyholderDetails): Promise<AppUserType | null> => {
      if (user?.role !== 'admin' && user?.role !== 'superadmin') {
        console.error("Unauthorized attempt to sign up keyholder by user:", user?.email, "with role:", user?.role);
        setLoading(false);
        throw new Error("Only admins or superadmins can register new keyholders.");
      }
      setLoading(true);
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, keyholderDetails.email, keyholderDetails.password);
        const fbUserInstance = userCredential.user;

        const newKeyholderUserDocData: Omit<AppUserType, 'id' | 'createdAt'> & { createdAt: any } = {
          email: keyholderDetails.email,
          name: keyholderDetails.name,
          role: 'keyholder' as const,
          createdAt: serverTimestamp(),
        };
        await setDoc(doc(db, "users", fbUserInstance.uid), newKeyholderUserDocData);
        
        const registeredKeyholder: AppUserType = {
            id: fbUserInstance.uid,
            email: keyholderDetails.email,
            name: keyholderDetails.name,
            role: 'keyholder',
            createdAt: new Date().toISOString(), 
        };
        setLoading(false);
        return registeredKeyholder;
      } catch (error) {
        console.error("Keyholder signup error:", error);
        setLoading(false);
        throw error;
      }
    },
    [user?.role]
  );

  const logout = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      await firebaseSignOut(auth);
      // setUser(null) and setFirebaseUser(null) will be handled by onAuthStateChanged
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setLoading(false); // Ensure loading is set to false even if onAuthStateChanged is slow
    }
  }, []);

  const updateUserDocument = useCallback(async (userId: string, data: Partial<AppUserType>): Promise<void> => {
    const userDocRef = doc(db, "users", userId);
    try {
        await updateDoc(userDocRef, data);
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

