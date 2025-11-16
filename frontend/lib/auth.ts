import { apiClient } from './api';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'INDIVIDUAL' | 'INDUSTRIAL';
  isEmailVerified: boolean;
  status: string;
}

class AuthService {
  private user: User | null = null;

  async login(email: string, password: string) {
    const response = await apiClient.login(email, password);
    const data = response.data as any;
    
    if (response.success && data?.requiresOTP) {
      return { requiresOTP: true, email };
    }

    if (response.success && data?.user) {
      this.user = data.user;
      return { success: true, user: this.user };
    }

    throw new Error(response.message || 'Login failed');
  }

  async verifyOTP(email: string, code: string, type: 'EMAIL_VERIFICATION' | 'PASSWORD_RESET' | 'LOGIN_OTP') {
    const response = await apiClient.verifyOTP(email, code, type);
    const data = response.data as any;
    
    if (response.success && data?.user) {
      this.user = data.user;
      return { success: true, user: this.user };
    }

    throw new Error(response.message || 'OTP verification failed');
  }

  async register(userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone: string;
    role: 'INDIVIDUAL' | 'INDUSTRIAL';
  }) {
    const response = await apiClient.register(userData);
    const data = response.data as any;
    
    if (response.success) {
      return { success: true, userId: data?.userId, email: userData.email };
    }

    throw new Error(response.message || 'Registration failed');
  }

  async resendOTP(email: string, type: 'EMAIL_VERIFICATION' | 'PASSWORD_RESET' | 'LOGIN_OTP') {
    const response = await apiClient.resendOTP(email, type);
    
    if (response.success) {
      return { success: true };
    }

    throw new Error(response.message || 'Failed to resend OTP');
  }

  async logout() {
    try {
      await apiClient.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.user = null;
      // Redirect to login
      if (typeof window !== 'undefined') {
        window.location.href = '/auth/login';
      }
    }
  }

  async getCurrentUser(): Promise<User | null> {
    try {
      const response = await apiClient.getCurrentUser();
      if (response.success && response.data) {
        this.user = response.data as User;
        return this.user;
      }
    } catch (error) {
      console.error('Get current user error:', error);
      this.user = null;
    }
    return null;
  }

  getUser(): User | null {
    return this.user;
  }

  isAuthenticated(): boolean {
    return this.user !== null;
  }
}

export const authService = new AuthService();

