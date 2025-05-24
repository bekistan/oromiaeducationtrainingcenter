
"use client";

import type { User } from '@/types';
import { useState, useEffect, useCallback }
from 'react';

// Mock user data - in a real app, this would come from your auth provider
const MOCK_COMPANY_USER: User = {
  id: 'compUser123',
  email: 'company@example.com',
  role: 'company_representative',
  name: 'Test Company Rep',
  companyId: 'comp001',
  companyName: 'Tech Solutions Inc.',
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


interface AuthState {
  user: User | null;
  loading: boolean;
  loginAsCompany: () => void;
  loginAsIndividual: () => void;
  loginAsAdmin: () => void;
  logout: () => void;
}

// For simplicity, we'll use localStorage to persist mock login state
const AUTH_STORAGE_KEY = 'mockAuthUser';

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

  const loginAsCompany = useCallback(() => {
    updateUserState(MOCK_COMPANY_USER);
  }, []);

  const loginAsIndividual = useCallback(() => {
    updateUserState(MOCK_INDIVIDUAL_USER);
  }, []);

  const loginAsAdmin = useCallback(() => {
    updateUserState(MOCK_ADMIN_USER);
  }, []);

  const logout = useCallback(() => {
    updateUserState(null);
  }, []);

  return { user, loading, loginAsCompany, loginAsIndividual, loginAsAdmin, logout };
};
