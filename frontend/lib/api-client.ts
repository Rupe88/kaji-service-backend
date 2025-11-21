import { apiClient } from './api';
import api from './api';
import { API_ENDPOINTS } from './constants';
import type {
  ApiResponse,
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
  JobRecommendation,
  JobRecommendationsResponse,
  TrainingCourse,
  TrainingEnrollment,
  TrainingEnrollmentRequest,
  UpdateEnrollmentRequest,
  UpdateEnrollmentResponse,
} from '@/types/api';

// Jobs API
export const jobsApi = {
  list: async (params?: { 
    page?: number; 
    limit?: number; 
    search?: string;
    jobType?: string;
    province?: string;
    district?: string;
    city?: string;
    isRemote?: string | boolean;
    minSalary?: string | number;
    maxSalary?: string | number;
    experienceYears?: string | number;
    educationLevel?: string;
    contractDuration?: string | number;
    industrySector?: string;
    salaryType?: string;
    datePosted?: string | number;
    verifiedOnly?: string;
    employerId?: string;
    sortBy?: string;
  }): Promise<{ data: JobPosting[]; pagination?: any }> => {
    // Convert boolean to string for API
    const apiParams: any = { ...params };
    if (typeof apiParams.isRemote === 'boolean') {
      apiParams.isRemote = apiParams.isRemote.toString();
    }
    // apiClient.get now handles pagination automatically
    return apiClient.get<{ data: JobPosting[]; pagination?: any }>(API_ENDPOINTS.JOBS.LIST, { params: apiParams });
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
  getByJob: async (jobId: string): Promise<{ data: JobApplication[]; count: number; pagination?: any }> => {
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
      
      // Handle both single object and array responses
      // If data is an array (list endpoint response), take the first item
      // If data is an object (single item endpoint response), use it directly
      if (!response) {
        return null;
      }
      
      // Check if response is an array (from list endpoint)
      if (Array.isArray(response)) {
        // If array is empty, return null
        if (response.length === 0) {
          return null;
        }
        // Return first item from array
        return response[0];
      }
      
      // If it's already an object, return it
      return response;
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

// Skill Matching API
export const skillMatchingApi = {
  getRecommendations: async (params?: { limit?: number; minScore?: number }): Promise<JobRecommendationsResponse> => {
    // apiClient.get returns response.data.data if it exists, otherwise response.data
    // Our backend returns { success: true, data: [...], count: ... }
    const response = await apiClient.get<JobRecommendationsResponse | { data: JobRecommendation[]; count: number }>(API_ENDPOINTS.SKILL_MATCHING.RECOMMENDATIONS, { params });
    
    // Handle both response structures
    if (response && typeof response === 'object' && 'data' in response && Array.isArray((response as any).data)) {
      const resp = response as { data: JobRecommendation[]; count?: number };
      return {
        success: true,
        data: resp.data,
        count: resp.count !== undefined ? resp.count : resp.data.length,
      };
    }
    
    // If response is already in the correct format
    return response as JobRecommendationsResponse;
  },
  getByJob: async (jobId: string, limit?: number): Promise<any> => {
    return apiClient.get(API_ENDPOINTS.SKILL_MATCHING.BY_JOB(jobId), { params: { limit } });
  },
  getByUser: async (userId: string, limit?: number): Promise<any> => {
    return apiClient.get(API_ENDPOINTS.SKILL_MATCHING.BY_USER(userId), { params: { limit } });
  },
  search: async (params: { skills: string; location?: string; page?: number; limit?: number }): Promise<any> => {
    return apiClient.get<any>(API_ENDPOINTS.SKILL_MATCHING.SEARCH, { params });
  },
};

// Training API
export const trainingApi = {
  getCourses: async (params?: {
    providerId?: string;
    category?: string;
    mode?: string;
    isActive?: boolean;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: TrainingCourse[]; pagination?: any }> => {
    return apiClient.get(API_ENDPOINTS.TRAINING.COURSES.LIST, { params });
  },
  getCourse: async (id: string): Promise<TrainingCourse> => {
    return apiClient.get(API_ENDPOINTS.TRAINING.COURSES.DETAIL(id));
  },
  create: async (data: Partial<TrainingCourse>): Promise<TrainingCourse> => {
    return apiClient.post(API_ENDPOINTS.TRAINING.COURSES.CREATE, data);
  },
  update: async (id: string, data: Partial<TrainingCourse>): Promise<TrainingCourse> => {
    return apiClient.put(API_ENDPOINTS.TRAINING.COURSES.UPDATE(id), data);
  },
  delete: async (id: string): Promise<void> => {
    return apiClient.delete(API_ENDPOINTS.TRAINING.COURSES.DELETE(id));
  },
  enroll: async (data: TrainingEnrollmentRequest): Promise<TrainingEnrollment> => {
    return apiClient.post(API_ENDPOINTS.TRAINING.ENROLL, data);
  },
  getEnrollments: async (params?: {
    userId?: string;
    courseId?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: TrainingEnrollment[]; pagination?: any }> => {
    return apiClient.get(API_ENDPOINTS.TRAINING.ENROLLMENTS, { params });
  },
  updateEnrollment: async (id: string, data: UpdateEnrollmentRequest): Promise<UpdateEnrollmentResponse> => {
    // Use api.patch directly to get full response with coinsAwarded
    const response = await api.patch<ApiResponse<TrainingEnrollment> & { coinsAwarded?: number }>(
      API_ENDPOINTS.TRAINING.UPDATE_ENROLLMENT(id),
      data
    );
    
    if (response.data.success) {
      return {
        success: true,
        data: response.data.data as TrainingEnrollment,
        coinsAwarded: (response.data as any).coinsAwarded,
      };
    }
    
    return {
      success: false,
      data: response.data.data as TrainingEnrollment,
    };
  },
  // Comments
  createComment: async (data: { courseId: string; userId: string; parentId?: string; content: string }): Promise<any> => {
    return apiClient.post(API_ENDPOINTS.TRAINING.COMMENTS.CREATE, data);
  },
  getComments: async (courseId: string): Promise<any[]> => {
    return apiClient.get(API_ENDPOINTS.TRAINING.COMMENTS.LIST(courseId));
  },
  updateComment: async (id: string, content: string): Promise<any> => {
    return apiClient.put(API_ENDPOINTS.TRAINING.COMMENTS.UPDATE(id), { content });
  },
  deleteComment: async (id: string): Promise<void> => {
    return apiClient.delete(API_ENDPOINTS.TRAINING.COMMENTS.DELETE(id));
  },
};

