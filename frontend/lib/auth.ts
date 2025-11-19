import { apiClient } from './api';
import { API_ENDPOINTS } from './constants';
import {
  RegisterRequest,
  LoginRequest,
  VerifyOTPRequest,
  ResendOTPRequest,
  LoginResponse,
  User,
} from '@/types/api';

// Auth API functions
export const authApi = {
  register: async (data: RegisterRequest) => {
    const response = await apiClient.post<{ message: string }>(
      API_ENDPOINTS.AUTH.REGISTER,
      data
    );
    return response;
  },

  login: async (data: LoginRequest) => {
    const response = await apiClient.post<LoginResponse>(
      API_ENDPOINTS.AUTH.LOGIN,
      data
    );
    return response;
  },

  verifyOTP: async (data: VerifyOTPRequest) => {
    const response = await apiClient.post<LoginResponse>(
      API_ENDPOINTS.AUTH.VERIFY_OTP,
      data
    );
    return response;
  },

  resendOTP: async (data: ResendOTPRequest) => {
    const response = await apiClient.post<{ message: string }>(
      API_ENDPOINTS.AUTH.RESEND_OTP,
      data
    );
    return response;
  },

  logout: async () => {
    const response = await apiClient.post<{ message: string }>(
      API_ENDPOINTS.AUTH.LOGOUT
    );
    return response;
  },

  getMe: async () => {
    const response = await apiClient.get<User>(API_ENDPOINTS.AUTH.ME);
    return response;
  },

  refreshToken: async () => {
    const response = await apiClient.post<{ accessToken: string }>(
      API_ENDPOINTS.AUTH.REFRESH_TOKEN
    );
    return response;
  },
};

