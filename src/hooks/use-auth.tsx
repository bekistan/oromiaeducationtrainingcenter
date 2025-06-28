
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
  position: string;
  email: string;
  phone: string;
  password: string;
}

interface AdminDetails {
  name: string;
  email: string;
  password: string;
  phone?: string;
  buildingAssignment?: 'ifaboru' | 'buuraboru';
}

interface KeyholderDetails {
  name: string;
  email: string;
  password: string;
  phone?: string;
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
    setLoading(true); // Ensure loading is true at the start of handling
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
            position: userDataFromDb.position,
            companyId: userDataFromDb.companyId,
            companyName: userDataFromDb.companyName,
            approvalStatus: userDataFromDb.approvalStatus,
            phone: userDataFromDb.phone,
            buildingAssignment: userDataFromDb.buildingAssignment === null ? undefined : userDataFromDb.buildingAssignment,
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
      let errorToReport;
      if (error === true) {
        console.error("handleAuthChange Internal Error: Caught boolean `true` during auth processing. This is unconventional.");
        errorToReport = new Error("Authentication processing failed with an unconventional boolean true error.");
      } else if (error instanceof Error) {
        console.error("handleAuthChange Internal Error:", error.message, error.stack);
        errorToReport = error;
      } else {
        console.error("handleAuthChange Internal Error: Caught non-Error value:", error);
        errorToReport = new Error(`Authentication processing failed with non-Error value: ${String(error)}`);
      }

      if (auth.currentUser) { // Attempt to sign out if there's a current user, to prevent inconsistent states
        try {
          await firebaseSignOut(auth);
        } catch (signOutError: any) {
          const signOutErrorMessage = signOutError instanceof Error ? signOutError.message : String(signOutError);
          console.error("handleAuthChange: Error during fallback sign out:", signOutErrorMessage, signOutError instanceof Error ? signOutError.stack : '');
        }
      }
      setUser(null);
      setFirebaseUser(null);
      throw errorToReport; // Re-throw a proper Error object
    } finally {
      setLoading(false); // Ensure loading is false after processing
    }
  }, []);


  useEffect(() => {
    setLoading(true);
    const unsubscribe = onAuthStateChanged(auth, (fbUserInstance) => {
      handleAuthChange(fbUserInstance)
        .catch(e => {
          // This catch block in useEffect is for errors thrown by handleAuthChange
          setLoading(false); // Ensure loading is reset on error
          let errorMessage = "An unexpected authentication error occurred.";
          if (e === true) { // This case should be less likely if handleAuthChange always throws Error objects
            console.error("Auth State Error: Promise from handleAuthChange rejected with boolean `true`. This implies an issue in handleAuthChange's error wrapping. Forcing user to null state.");
            errorMessage = "An unusual error occurred during authentication. Please try again.";
          } else if (e instanceof Error) {
            console.error("Auth State Error:", e.message, e.stack);
            errorMessage = e.message;
          } else {
            console.error("Auth State Error: Promise from handleAuthChange rejected with non-Error value:", e);
            errorMessage = "An unknown error occurred during authentication.";
          }
          setUser(null);
          setFirebaseUser(null);
          // Avoid re-throwing from here to prevent potential loops with onAuthStateChanged
        });
      // setLoading(false) is handled by handleAuthChange's finally block on success, or by its catch block on error.
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
          position: userDataFromDb.position,
          companyId: userDataFromDb.companyId,
          companyName: userDataFromDb.companyName,
          approvalStatus: userDataFromDb.approvalStatus,
          phone: userDataFromDb.phone,
          buildingAssignment: userDataFromDb.buildingAssignment === null ? undefined : userDataFromDb.buildingAssignment,
          createdAt: createdAtString,
        };
        // setUser and setFirebaseUser will be called by onAuthStateChanged -> handleAuthChange
        return appUserData;
      } else {
        console.error("Firestore document not found for logged in user:", fbUserInstance.uid);
        await firebaseSignOut(auth);
        throw new Error("userDataMissing");
      }
    } catch (error: any) {
      setLoading(false); // Ensure loading is false on error
      if (error === true) {
        console.error("Login Error: Caught boolean 'true'.", error);
        throw new Error("Login failed due to an unconventional error.");
      } else if (error instanceof Error) {
        console.error("Login Error:", error.message, error.stack);
      } else {
        console.error("Login Error: Caught non-Error value:", error);
      }
      throw error; // Re-throw original or new Error
    } finally {
      // setLoading(false); // setLoading is handled by onAuthStateChanged -> handleAuthChange
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
          position: companyDetails.position,
          companyName: companyDetails.companyName,
          phone: companyDetails.phone,
          role: 'company_representative' as const,
          approvalStatus: 'pending' as const,
          companyId: companyId,
          createdAt: serverTimestamp(),
        };
        await setDoc(doc(db, "users", fbUserInstance.uid), newCompanyUserDocData);
        // setUser and setFirebaseUser will be called by onAuthStateChanged -> handleAuthChange
        return {
            id: fbUserInstance.uid,
            email: companyDetails.email,
            name: companyDetails.name,
            position: companyDetails.position,
            companyName: companyDetails.companyName,
            phone: companyDetails.phone,
            role: 'company_representative',
            approvalStatus: 'pending',
            companyId: companyId,
            createdAt: new Date().toISOString(), // Approximate
        };
      } catch (error: any) {
        setLoading(false);
        if (error === true) {
            console.error("Company Signup Error: Caught boolean 'true'.", error);
            throw new Error("Company registration failed due to an unconventional error.");
        } else if (error instanceof Error) {
            console.error("Company Signup Error:", error.message, error.stack);
        } else {
            console.error("Company Signup Error: Caught non-Error value:", error);
        }
        throw error;
      } finally {
        // setLoading(false); // Handled by onAuthStateChanged
      }
    },
    []
  );

  const signupAdmin = useCallback(
    async (adminDetails: AdminDetails): Promise<AppUserType | null> => {
      setLoading(true);
      try {
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
          phone: adminDetails.phone || '',
          role: 'admin' as const,
          createdAt: serverTimestamp(),
          buildingAssignment: adminDetails.buildingAssignment || null,
        };
        await setDoc(doc(db, "users", fbUserInstance.uid), newAdminUserDocData);
        // Note: onAuthStateChanged will handle setting the user state globally
        return {
            id: fbUserInstance.uid,
            email: adminDetails.email,
            name: adminDetails.name,
            phone: adminDetails.phone,
            role: 'admin',
            buildingAssignment: adminDetails.buildingAssignment || null,
            createdAt: new Date().toISOString(), // Approximate
        };
      } catch (error: any) {
        setLoading(false);
        if (error === true) {
            console.error("Admin Signup Error: Caught boolean 'true'.", error);
            throw new Error("Admin registration failed due to an unconventional error.");
        } else if (error instanceof Error) {
            console.error("Admin Signup Error:", error.message, error.stack);
        } else {
            console.error("Admin Signup Error: Caught non-Error value:", error);
        }
        throw error;
      } finally {
        // setLoading(false); // Handled by onAuthStateChanged
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
         if (!currentUserDocSnap.exists() || currentUserDocSnap.data()?.role !== 'superadmin') {
          console.error("Unauthorized attempt to sign up keyholder by user:", auth.currentUser?.email);
          throw new Error("Only superadmins can register new keyholders.");
        }

        const userCredential = await createUserWithEmailAndPassword(auth, keyholderDetails.email, keyholderDetails.password);
        const fbUserInstance = userCredential.user;
        const newKeyholderUserDocData: Omit<AppUserType, 'id' | 'createdAt'> & { createdAt: any } = {
          email: keyholderDetails.email,
          name: keyholderDetails.name,
          phone: keyholderDetails.phone || '',
          role: 'keyholder' as const,
          createdAt: serverTimestamp(),
        };
        await setDoc(doc(db, "users", fbUserInstance.uid), newKeyholderUserDocData);
        // Note: onAuthStateChanged will handle setting the user state globally
        return {
            id: fbUserInstance.uid,
            email: keyholderDetails.email,
            name: keyholderDetails.name,
            phone: keyholderDetails.phone,
            role: 'keyholder',
            createdAt: new Date().toISOString(), // Approximate
        };
      } catch (error: any) {
        setLoading(false);
        if (error === true) {
            console.error("Keyholder Signup Error: Caught boolean 'true'.", error);
            throw new Error("Keyholder registration failed due to an unconventional error.");
        } else if (error instanceof Error) {
            console.error("Keyholder Signup Error:", error.message, error.stack);
        } else {
            console.error("Keyholder Signup Error: Caught non-Error value:", error);
        }
        throw error;
      } finally {
        // setLoading(false); // Handled by onAuthStateChanged
      }
    },
    []
  );

  const logout = useCallback(async (): Promise<void> => {
    setLoading(true); // Indicate loading state during logout process
    try {
      await firebaseSignOut(auth);
      // setUser(null) and setFirebaseUser(null) will be handled by onAuthStateChanged -> handleAuthChange
      // handleAuthChange's finally block will set loading to false.
    } catch (error: any) {
      setLoading(false); // Ensure loading is false if signout itself fails
      let errorMessage = "Logout failed.";
      if (error === true) {
        console.error("Logout Error: Caught boolean 'true'.", error);
        errorMessage = "Logout failed due to an unconventional error.";
      } else if (error instanceof Error) {
        console.error("Logout Error:", error.message, error.stack);
        errorMessage = error.message;
      } else {
        console.error("Logout Error: Caught non-Error value:", error);
      }
      // Optionally, inform the user via toast, though logout errors are often handled silently
      // or by redirecting to login.
      // toast({ variant: "destructive", title: "Logout Failed", description: errorMessage });
      throw error; // Re-throw if the consuming component needs to act on logout failure
    }
  }, []);

  const updateUserDocument = useCallback(async (userId: string, data: Partial<AppUserType>): Promise<void> => {
    const userDocRef = doc(db, "users", userId);
    try {
        const updateData = { ...data };
        if (data.hasOwnProperty('buildingAssignment') && data.buildingAssignment === undefined) {
            (updateData as any).buildingAssignment = null;
        }

        await updateDoc(userDocRef, updateData);
        if (user && user.id === userId) {
          // Refresh local user state if the currently logged-in user's document was updated
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
              position: updatedDataFromDb.position,
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
            console.error("Update User Doc Error: Caught boolean 'true'.", error);
            throw new Error("Updating user document failed due to an unconventional error.");
        } else if (error instanceof Error) {
            console.error("Update User Doc Error:", error.message, error.stack);
        } else {
            console.error("Update User Doc Error: Caught non-Error value:", error);
        }
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
