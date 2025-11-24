'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User } from '@/types/api';
import { authApi } from '@/lib/auth';
import toast from 'react-hot-toast';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; requiresOTP?: boolean }>;
  register: (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone: string;
    role?: 'INDIVIDUAL' | 'INDUSTRIAL';
  }) => Promise<boolean>;
  verifyOTP: (email: string, code: string, type: 'EMAIL_VERIFICATION' | 'LOGIN_OTP' | 'PASSWORD_RESET') => Promise<boolean>;
  resendOTP: (email: string, type: 'EMAIL_VERIFICATION' | 'LOGIN_OTP' | 'PASSWORD_RESET') => Promise<boolean>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch current user
  const fetchUser = useCallback(async () => {
    try {
      const userData = await authApi.getMe();
      setUser(userData);
    } catch (error: any) {
      // If not authenticated (401/403), clear user silently
      // This is expected behavior for unauthenticated users
      if (error?.response?.status === 401 || error?.response?.status === 403) {
        setUser(null);
      } else {
        // Only log unexpected errors (but don't show toasts for auth errors)
        if (error?.response?.status !== 401 && error?.response?.status !== 403) {
          console.error('Error fetching user:', error);
        }
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const login = async (email: string, password: string) => {
    try {
      const response = await authApi.login({ email, password });
      
      if (response.requiresOTP) {
        return { success: true, requiresOTP: true };
      }

      if (response.user) {
        // Set user immediately for quick UI update
        setUser(response.user);
        // Then refresh to get complete user data (profileImage, firstName, lastName, etc.)
        await fetchUser();
        toast.success('Login successful!');
        return { success: true, requiresOTP: false };
      }

      return { success: false };
    } catch (error: any) {
      // Don't show toast for 403 (email not verified) - let component handle it
      if (error?.response?.status === 403) {
        throw error; // Re-throw so component can handle it
      }
      const errorMessage = error.response?.data?.message || 'Login failed';
      toast.error(errorMessage);
      return { success: false };
    }
  };

  const register = async (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone: string;
    role?: 'INDIVIDUAL' | 'INDUSTRIAL';
  }) => {
    try {
      await authApi.register(data);
      toast.success('Registration successful! Please check your email for OTP.');
      return true;
    } catch (error: any) {
      // Don't show toast for 409 (email already exists) - let component handle it
      if (error?.response?.status === 409) {
        throw error; // Re-throw so component can handle it
      }
      const errorMessage = error.response?.data?.message || 'Registration failed';
      toast.error(errorMessage);
      return false;
    }
  };

  const verifyOTP = async (
    email: string,
    code: string,
    type: 'EMAIL_VERIFICATION' | 'LOGIN_OTP' | 'PASSWORD_RESET'
  ) => {
    try {
      const response = await authApi.verifyOTP({ email, code, type });
      
      if (response.user) {
        // Set user immediately for quick UI update
        setUser(response.user);
        // Then refresh to get complete user data (profileImage, firstName, lastName, etc.)
        await fetchUser();
        toast.success('Verification successful!');
        return true;
      }

      return false;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'OTP verification failed';
      toast.error(errorMessage);
      return false;
    }
  };

  const resendOTP = async (
    email: string,
    type: 'EMAIL_VERIFICATION' | 'LOGIN_OTP' | 'PASSWORD_RESET'
  ) => {
    try {
      await authApi.resendOTP({ email, type });
      toast.success('OTP sent to your email!');
      return true;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to resend OTP';
      toast.error(errorMessage);
      return false;
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
      setUser(null);
      toast.success('Logged out successfully');
    } catch (error: any) {
      // Even if logout fails, clear local state
      setUser(null);
    }
  };

  const refreshUser = useCallback(async () => {
    await fetchUser();
  }, [fetchUser]);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        login,
        register,
        verifyOTP,
        resendOTP,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

