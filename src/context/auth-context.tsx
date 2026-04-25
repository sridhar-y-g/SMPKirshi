'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { apiLogin, apiMe, apiRegister, apiVerifyOtp, apiGetProfile, type MeResponse } from '@/lib/api';

interface AuthUser extends MeResponse {
  full_name?: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  register: (email: string, password: string, full_name: string) => Promise<{ success: boolean; message?: string }>;
  verifyOtp: (email: string, otp_code: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]       = useState<AuthUser | null>(null);
  const [token, setToken]     = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const saveToken = (t: string) => {
    localStorage.setItem('sk_access_token', t);
    setToken(t);
  };

  const clearToken = () => {
    localStorage.removeItem('sk_access_token');
    setToken(null);
    setUser(null);
  };

  const fetchUser = useCallback(async () => {
    try {
      const [me, profile] = await Promise.all([apiMe(), apiGetProfile()]);
      setUser({ ...me, full_name: profile.full_name });
    } catch {
      clearToken();
    } finally {
      setLoading(false);
    }
  }, []);

  // On mount — restore session from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('sk_access_token');
    if (stored) {
      setToken(stored);
      fetchUser();
    } else {
      setLoading(false);
    }
  }, [fetchUser]);

  const login = async (email: string, password: string) => {
    try {
      const res = await apiLogin(email, password);
      saveToken(res.access_token);
      await fetchUser();
      return { success: true };
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Login failed';
      return { success: false, message: msg };
    }
  };

  const register = async (email: string, password: string, full_name: string) => {
    try {
      await apiRegister(email, password, full_name);
      return { success: true };
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Registration failed';
      return { success: false, message: msg };
    }
  };

  const verifyOtp = async (email: string, otp_code: string) => {
    try {
      await apiVerifyOtp(email, otp_code);
      return { success: true };
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Verification failed';
      return { success: false, message: msg };
    }
  };

  const logout = () => {
    clearToken();
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, verifyOtp, logout, refreshUser: fetchUser }}>
      {children}
    </AuthContext.Provider>
  );
}
