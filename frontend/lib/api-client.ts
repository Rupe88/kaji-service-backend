import { apiClient } from './api';
import { API_ENDPOINTS } from './constants';
import type {
  JobPosting,
  JobApplication,
  JobApplicationWithJob,
  TrendingJob,
  TrendingSkill,
  UserStatistics,
  PlatformStatistics,
  WalletBalance,
  CoinTransaction,
  EarnCoinsRequest,
  SpendCoinsRequest,
  WithdrawCoinsRequest,
} from '@/types/api';

// Jobs API
export const jobsApi = {
  list: async (params?: { page?: number; limit?: number; location?: string; skills?: string[] }): Promise<{ data: JobPosting[]; pagination?: any }> => {
    return apiClient.get(API_ENDPOINTS.JOBS.LIST, { params });
  },
  get: async (id: string): Promise<JobPosting> => {
    return apiClient.get(API_ENDPOINTS.JOBS.DETAIL(id));
  },
  create: async (data: Partial<JobPosting>): Promise<JobPosting> => {
    return apiClient.post(API_ENDPOINTS.JOBS.CREATE, data);
  },
  update: async (id: string, data: Partial<JobPosting>): Promise<JobPosting> => {
    return apiClient.put(API_ENDPOINTS.JOBS.UPDATE(id), data);
  },
  delete: async (id: string): Promise<void> => {
    return apiClient.delete(API_ENDPOINTS.JOBS.DELETE(id));
  },
};

// Applications API
export const applicationsApi = {
  list: async (params?: { page?: number; limit?: number }): Promise<{ data: JobApplicationWithJob[]; pagination?: any }> => {
    return apiClient.get(API_ENDPOINTS.APPLICATIONS.LIST, { params });
  },
  get: async (id: string): Promise<JobApplicationWithJob> => {
    return apiClient.get(API_ENDPOINTS.APPLICATIONS.DETAIL(id));
  },
  create: async (data: Partial<JobApplication>): Promise<JobApplication> => {
    return apiClient.post(API_ENDPOINTS.APPLICATIONS.CREATE, data);
  },
  update: async (id: string, data: Partial<JobApplication>): Promise<JobApplication> => {
    return apiClient.put(API_ENDPOINTS.APPLICATIONS.UPDATE(id), data);
  },
  getByJob: async (jobId: string): Promise<JobApplication[]> => {
    return apiClient.get(API_ENDPOINTS.APPLICATIONS.BY_JOB(jobId));
  },
  getByUser: async (userId: string): Promise<JobApplicationWithJob[]> => {
    return apiClient.get(API_ENDPOINTS.APPLICATIONS.BY_USER(userId));
  },
};

// Trending API
export const trendingApi = {
  getJobs: async (): Promise<TrendingJob[]> => {
    return apiClient.get(API_ENDPOINTS.TRENDING.JOBS);
  },
  getSkills: async (): Promise<TrendingSkill[]> => {
    return apiClient.get(API_ENDPOINTS.TRENDING.SKILLS);
  },
};

// Analytics API
export const analyticsApi = {
  getUserStats: async (userId?: string): Promise<UserStatistics> => {
    const endpoint = userId 
      ? API_ENDPOINTS.ANALYTICS.USER(userId)
      : API_ENDPOINTS.ANALYTICS.USER('');
    return apiClient.get(endpoint);
  },
  getPlatformStats: async (): Promise<PlatformStatistics> => {
    return apiClient.get(API_ENDPOINTS.ANALYTICS.PLATFORM);
  },
  getJobStats: async (): Promise<any> => {
    return apiClient.get(API_ENDPOINTS.ANALYTICS.JOBS);
  },
};

// Wallet API
export const walletApi = {
  getBalance: async (): Promise<WalletBalance> => {
    return apiClient.get(API_ENDPOINTS.WALLET.BALANCE);
  },
  getTransactions: async (params?: { page?: number; limit?: number; type?: string }): Promise<{ data: CoinTransaction[]; pagination?: any }> => {
    return apiClient.get(API_ENDPOINTS.WALLET.TRANSACTIONS, { params });
  },
  earn: async (data: EarnCoinsRequest): Promise<{ transaction: any; newBalance: string }> => {
    return apiClient.post(API_ENDPOINTS.WALLET.EARN, data);
  },
  spend: async (data: SpendCoinsRequest): Promise<{ transaction: any; newBalance: string }> => {
    return apiClient.post(API_ENDPOINTS.WALLET.SPEND, data);
  },
  withdraw: async (data: WithdrawCoinsRequest): Promise<{ transaction: any; newBalance: string }> => {
    return apiClient.post(API_ENDPOINTS.WALLET.WITHDRAW, data);
  },
};

// KYC API
export const kycApi = {
  getIndividual: async (userId: string): Promise<any> => {
    return apiClient.get(API_ENDPOINTS.KYC.INDIVIDUAL.GET(userId));
  },
  getIndustrial: async (userId: string): Promise<any> => {
    return apiClient.get(API_ENDPOINTS.KYC.INDUSTRIAL.GET(userId));
  },
  getKYC: async (userId: string, role: 'INDIVIDUAL' | 'INDUSTRIAL'): Promise<any | null> => {
    try {
      const endpoint = role === 'INDIVIDUAL' 
        ? API_ENDPOINTS.KYC.INDIVIDUAL.GET(userId)
        : API_ENDPOINTS.KYC.INDUSTRIAL.GET(userId);
      const response = await apiClient.get<{ success: boolean; data: any }>(endpoint);
      return response.data || null;
    } catch (error: any) {
      // 404 means no KYC submitted yet - this is expected, not an error
      if (error.response?.status === 404) {
        return null;
      }
      // Re-throw other errors
      throw error;
    }
  },
  createIndividual: async (data: FormData): Promise<any> => {
    return apiClient.post(API_ENDPOINTS.KYC.INDIVIDUAL.CREATE, data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  createIndustrial: async (data: FormData): Promise<any> => {
    return apiClient.post(API_ENDPOINTS.KYC.INDUSTRIAL.CREATE, data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  updateIndividual: async (userId: string, data: FormData): Promise<any> => {
    return apiClient.put(API_ENDPOINTS.KYC.INDIVIDUAL.UPDATE(userId), data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  updateIndustrial: async (userId: string, data: FormData): Promise<any> => {
    return apiClient.put(API_ENDPOINTS.KYC.INDUSTRIAL.UPDATE(userId), data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
};

