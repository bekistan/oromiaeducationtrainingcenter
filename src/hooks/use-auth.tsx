
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
  buildingAssignment: 'ifaboru' | 'buuraboru'; // Added building assignment
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
    // setLoading(true) is intentionally at the start of the useEffect calling this,
    // and setLoading(false) is in the finally block here and in the .catch of its invoker.
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
            buildingAssignment: userDataFromDb.buildingAssignment,
            createdAt: createdAtString,
          };
          setUser(processedUserData);
        } else {
          console.warn("User document not found in Firestore for UID:", currentFbUser.uid, "- Signing out to prevent inconsistent state.");
          await firebaseSignOut(auth);
          setUser(null); // Explicitly set user to null
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
      throw error; // Re-throw to be caught by the outer catch if necessary
    } finally {
      // setLoading(false) will be called by the invoker's .catch or .finally
      // or by the outer useEffect's setLoading(false)
    }
  }, []);


  useEffect(() => {
    setLoading(true); // Initial loading state for auth setup
    const unsubscribe = onAuthStateChanged(auth, (fbUserInstance) => {
      handleAuthChange(fbUserInstance)
        .catch(e => {
          if (e === true) {
            console.error("Auth Error: Caught boolean 'true' from handleAuthChange promise in onAuthStateChanged.", e);
            // Potentially re-throw new Error("Original error was true: onAuthStateChanged") if needed for global error handlers
          } else {
            console.error("Unhandled error from handleAuthChange promise chain in onAuthStateChanged:", e);
          }
          // Ensure user state is cleared on error during auth change
          setUser(null);
          setFirebaseUser(null);
        })
        .finally(() => {
          setLoading(false); // Always set loading to false after auth processing is complete
        });
    });

    return () => {
      unsubscribe();
      setLoading(false); // Clean up loading state on unmount
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
          buildingAssignment: userDataFromDb.buildingAssignment,
          createdAt: createdAtString,
        };
        return appUserData; // setUser will be handled by onAuthStateChanged
      } else {
        console.error("Firestore document not found for logged in user:", fbUserInstance.uid);
        await firebaseSignOut(auth); // Sign out if user doc is missing
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
        if (user?.role !== 'superadmin') {
          console.error("Unauthorized attempt to sign up admin by user:", user?.email, "with role:", user?.role);
          throw new Error("Only superadmins can register new admins.");
        }
        const userCredential = await createUserWithEmailAndPassword(auth, adminDetails.email, adminDetails.password);
        const fbUserInstance = userCredential.user;
        const newAdminUserDocData: Omit<AppUserType, 'id' | 'createdAt'> & { createdAt: any } = {
          email: adminDetails.email,
          name: adminDetails.name,
          role: 'admin' as const,
          buildingAssignment: adminDetails.buildingAssignment, 
          createdAt: serverTimestamp(),
        };
        await setDoc(doc(db, "users", fbUserInstance.uid), newAdminUserDocData);
        return {
            id: fbUserInstance.uid,
            email: adminDetails.email,
            name: adminDetails.name,
            role: 'admin',
            buildingAssignment: adminDetails.buildingAssignment,
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
    [user?.role] // Dependency on user role to check authorization
  );

  const signupKeyholder = useCallback(
    async (keyholderDetails: KeyholderDetails): Promise<AppUserType | null> => {
      setLoading(true);
      try {
        if (user?.role !== 'admin' && user?.role !== 'superadmin') {
          console.error("Unauthorized attempt to sign up keyholder by user:", user?.email, "with role:", user?.role);
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
    [user?.role] // Dependency on user role
  );

  const logout = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      await firebaseSignOut(auth);
      // setUser and setFirebaseUser will be handled by onAuthStateChanged
    } catch (error: any) {
      if (error === true) {
        console.error("Auth Error: Caught boolean 'true' in logout.", error);
        // No need to throw here as logout doesn't typically propagate errors
      }
      console.error("Logout error:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateUserDocument = useCallback(async (userId: string, data: Partial<AppUserType>): Promise<void> => {
    const userDocRef = doc(db, "users", userId);
    try {
        await updateDoc(userDocRef, data);
        if (user && user.id === userId) { // If updating the currently logged-in user, refresh local state
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
              buildingAssignment: updatedDataFromDb.buildingAssignment,
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
  }, [user]); // Dependency on 'user' to ensure it's the latest when checking user.id

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
    
