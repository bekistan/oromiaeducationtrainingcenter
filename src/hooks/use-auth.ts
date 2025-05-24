
"use client";

import type { User } from '@/types';
import { useState, useEffect, useCallback } from 'react';

// Mock user data
const MOCK_COMPANY_USER_APPROVED: User = {
  id: 'compUser123',
  email: 'company@example.com',
  role: 'company_representative',
  name: 'Approved Company Rep',
  companyId: 'comp001',
  companyName: 'Tech Solutions Inc.',
  approvalStatus: 'approved',
};

const MOCK_COMPANY_USER_PENDING: User = {
  id: 'compUser789',
  email: 'pending.company@example.com',
  role: 'company_representative',
  name: 'Pending Company Rep',
  companyId: 'comp002',
  companyName: 'New Ventures LLC',
  approvalStatus: 'pending',
};


const MOCK_INDIVIDUAL_USER: User = {
  id: 'indUser456',
  email: 'individual@example.com',
  role: 'individual',
  name: 'John Doe',
};

const MOCK_ADMIN_USER: User = {
    id: 'adminUser789',
    email: 'admin@example.com',
    role: 'admin',
    name: 'Admin User',
};

const MOCK_SUPER_ADMIN_USER: User = {
    id: 'superAdminUser001',
    email: 'superadmin@example.com',
    role: 'superadmin',
    name: 'Super Admin User',
};


interface AuthState {
  user: User | null;
  loading: boolean;
  loginAsCompany: (status?: 'approved' | 'pending') => void;
  loginAsIndividual: () => void;
  loginAsAdmin: () => void;
  loginAsSuperAdmin: () => void;
  logout: () => void;
  registerCompany: (companyDetails: Omit<User, 'id' | 'role' | 'approvalStatus'>) => User; // Mock registration
}

const AUTH_STORAGE_KEY = 'mockAuthUser';

// Mock database for registered companies
let mockRegisteredCompanies: User[] = [MOCK_COMPANY_USER_APPROVED, MOCK_COMPANY_USER_PENDING];

export const useAuth = (): AuthState => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem(AUTH_STORAGE_KEY);
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error("Failed to parse stored user:", error);
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
    setLoading(false);
  }, []);

  const updateUserState = (newUser: User | null) => {
    setUser(newUser);
    if (newUser) {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(newUser));
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  };

  const loginAsCompany = useCallback((status: 'approved' | 'pending' = 'approved') => {
    if (status === 'pending') {
        updateUserState(MOCK_COMPANY_USER_PENDING);
    } else {
        updateUserState(MOCK_COMPANY_USER_APPROVED);
    }
  }, []);

  const loginAsIndividual = useCallback(() => {
    updateUserState(MOCK_INDIVIDUAL_USER);
  }, []);

  const loginAsAdmin = useCallback(() => {
    updateUserState(MOCK_ADMIN_USER);
  }, []);

  const loginAsSuperAdmin = useCallback(() => {
    updateUserState(MOCK_SUPER_ADMIN_USER);
  }, []);
  
  const registerCompany = useCallback((companyDetails: Omit<User, 'id' | 'role' | 'approvalStatus'>): User => {
    const newCompany: User = {
        ...companyDetails,
        id: `comp-${Date.now()}`,
        role: 'company_representative',
        approvalStatus: 'pending',
    };
    // In a real app, this would be an API call. Here, we just add to a mock list.
    // Note: This mockRegisteredCompanies list isn't directly used by useAuth for login,
    // but would be for an admin panel to list companies.
    mockRegisteredCompanies.push(newCompany);
    console.log("Mock registered companies:", mockRegisteredCompanies);
    return newCompany;
  }, []);


  const logout = useCallback(() => {
    updateUserState(null);
  }, []);

  return { user, loading, loginAsCompany, loginAsIndividual, loginAsAdmin, loginAsSuperAdmin, logout, registerCompany };
};

// Function to get mock companies for admin panel (not part of the hook itself but uses its data)
export const getMockRegisteredCompanies = () => [...mockRegisteredCompanies];
export const updateMockCompanyStatus = (companyId: string, newStatus: 'approved' | 'rejected'): boolean => {
    const companyIndex = mockRegisteredCompanies.findIndex(c => c.id === companyId);
    if (companyIndex > -1) {
        mockRegisteredCompanies[companyIndex].approvalStatus = newStatus;
        // If the currently logged-in user is this company, update their session too
        const storedUser = localStorage.getItem(AUTH_STORAGE_KEY);
        if (storedUser) {
            const currentUser: User = JSON.parse(storedUser);
            if (currentUser.id === companyId) {
                currentUser.approvalStatus = newStatus;
                localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(currentUser));
                // Note: This won't auto-refresh the useAuth hook's user state immediately
                // without a page reload or explicit state update within the hook.
                // For a real app, auth state would sync with backend/tokens.
            }
        }
        return true;
    }
    return false;
};
