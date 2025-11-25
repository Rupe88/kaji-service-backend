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
  Event,
  EventRegistrationRequest,
  Exam,
  ExamBooking,
  ExamBookingRequest,
  UpdateExamBookingRequest,
  Certification,
  CertificationVerificationResponse,
  CreateCertificationRequest,
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
  getJobStatistics: async (params?: { employerId?: string; startDate?: string; endDate?: string }): Promise<any> => {
    return apiClient.get(API_ENDPOINTS.ANALYTICS.JOBS, { params });
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
      
      // apiClient.get already extracts response.data.data, so we get the KYC object directly
      const response = await apiClient.get<any>(endpoint);
      
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
  deleteKYC: async (userId: string, role: 'INDIVIDUAL' | 'INDUSTRIAL'): Promise<any> => {
    const endpoint = role === 'INDIVIDUAL' 
      ? API_ENDPOINTS.KYC.INDIVIDUAL.DELETE(userId)
      : API_ENDPOINTS.KYC.INDUSTRIAL.DELETE(userId);
    return apiClient.delete(endpoint);
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
// Admin API
export const adminApi = {
  getDashboardStats: async (): Promise<any> => {
    return apiClient.get(API_ENDPOINTS.ADMIN.DASHBOARD_STATS);
  },
  getAllKYCs: async (params?: { page?: number; limit?: number; type?: string; status?: string }): Promise<any> => {
    return apiClient.get(API_ENDPOINTS.ADMIN.KYC_ALL, { params });
  },
  getPendingKYCs: async (params?: { page?: number; limit?: number; type?: string }): Promise<any> => {
    return apiClient.get(API_ENDPOINTS.ADMIN.KYC_PENDING, { params });
  },
  getKYCDetails: async (type: 'INDIVIDUAL' | 'INDUSTRIAL', userId: string): Promise<any> => {
    return apiClient.get(API_ENDPOINTS.ADMIN.KYC_DETAILS(type, userId));
  },
  updateIndividualKYCStatus: async (userId: string, data: {
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'RESUBMITTED';
    rejectionReason?: string;
    adminNotes?: string;
  }): Promise<any> => {
    return apiClient.patch(API_ENDPOINTS.ADMIN.KYC_INDIVIDUAL_UPDATE(userId), data);
  },
  updateIndustrialKYCStatus: async (userId: string, data: {
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'RESUBMITTED';
    rejectionReason?: string;
    adminNotes?: string;
  }): Promise<any> => {
    return apiClient.patch(API_ENDPOINTS.ADMIN.KYC_INDUSTRIAL_UPDATE(userId), data);
  },
  bulkUpdateKYCStatus: async (data: {
    userIds: string[];
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'RESUBMITTED';
    rejectionReason?: string;
    adminNotes?: string;
  }): Promise<any> => {
    return apiClient.post(API_ENDPOINTS.ADMIN.KYC_BULK_UPDATE, data);
  },
  getUsers: async (params?: {
    page?: number;
    limit?: number;
    role?: string;
    status?: string;
    search?: string;
  }): Promise<any> => {
    return apiClient.get(API_ENDPOINTS.ADMIN.USERS_LIST, { params });
  },
  updateUserStatus: async (userId: string, data: {
    status: 'PENDING_VERIFICATION' | 'ACTIVE' | 'SUSPENDED' | 'DELETED';
    reason?: string;
  }): Promise<any> => {
    return apiClient.patch(API_ENDPOINTS.ADMIN.USER_UPDATE_STATUS(userId), data);
  },
  getUnverifiedJobs: async (params?: { page?: number; limit?: number; status?: string }): Promise<any> => {
    return apiClient.get(API_ENDPOINTS.ADMIN.JOBS_UNVERIFIED, { params });
  },
  updateJobVerification: async (jobId: string, data: {
    isVerified: boolean;
    adminNotes?: string;
  }): Promise<any> => {
    return apiClient.patch(API_ENDPOINTS.ADMIN.JOB_VERIFY(jobId), data);
  },
  bulkUpdateJobVerification: async (data: {
    jobIds: string[];
    isVerified: boolean;
  }): Promise<any> => {
    return apiClient.post(API_ENDPOINTS.ADMIN.JOBS_BULK_VERIFY, data);
  },
};

// Bulk Operations API
export const bulkApi = {
  deleteJobs: async (ids: string[]): Promise<{ success: boolean; message: string; count: number }> => {
    return apiClient.post(API_ENDPOINTS.BULK.JOBS_DELETE, { ids });
  },
  createJobs: async (jobs: any[]): Promise<{ success: boolean; message: string; count: number }> => {
    return apiClient.post(API_ENDPOINTS.BULK.JOBS_CREATE, { jobs });
  },
  updateKYCStatus: async (data: {
    ids: string[];
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'RESUBMITTED';
    rejectionReason?: string;
    adminNotes?: string;
  }): Promise<{ success: boolean; message: string; data: any }> => {
    return apiClient.post(API_ENDPOINTS.BULK.KYC_STATUS, data);
  },
};

// Data Export API
export const exportApi = {
  exportJobs: async (params?: { format?: 'csv' | 'excel' }): Promise<Blob> => {
    try {
      const response = await api.get(API_ENDPOINTS.EXPORT.JOBS, {
        params,
        responseType: 'blob',
      });
      return response.data;
    } catch (error: any) {
      // If blob response contains error JSON, parse it
      if (error.response?.data instanceof Blob) {
        const text = await error.response.data.text();
        try {
          const errorData = JSON.parse(text);
          throw new Error(errorData.message || 'Export failed');
        } catch {
          throw new Error('Failed to export jobs');
        }
      }
      throw error;
    }
  },
  exportApplications: async (params?: { format?: 'csv' | 'excel'; jobId?: string }): Promise<Blob> => {
    try {
      const response = await api.get(API_ENDPOINTS.EXPORT.APPLICATIONS, {
        params,
        responseType: 'blob',
      });
      return response.data;
    } catch (error: any) {
      // If blob response contains error JSON, parse it
      if (error.response?.data instanceof Blob) {
        const text = await error.response.data.text();
        try {
          const errorData = JSON.parse(text);
          throw new Error(errorData.message || 'Export failed');
        } catch {
          throw new Error('Failed to export applications');
        }
      }
      throw error;
    }
  },
  exportKYCs: async (params?: { format?: 'csv' | 'excel'; type?: string }): Promise<Blob> => {
    try {
      const response = await api.get(API_ENDPOINTS.EXPORT.KYCS, {
        params,
        responseType: 'blob',
      });
      return response.data;
    } catch (error: any) {
      // If blob response contains error JSON, parse it
      if (error.response?.data instanceof Blob) {
        const text = await error.response.data.text();
        try {
          const errorData = JSON.parse(text);
          throw new Error(errorData.message || 'Export failed');
        } catch {
          throw new Error('Failed to export KYCs');
        }
      }
      throw error;
    }
  },
};

// Exams API
export const examsApi = {
  list: async (params?: { page?: number; limit?: number; category?: string }): Promise<{ data: Exam[]; pagination?: any }> => {
    return apiClient.get(API_ENDPOINTS.EXAMS.LIST, { params });
  },
  get: async (id: string): Promise<Exam> => {
    return apiClient.get(API_ENDPOINTS.EXAMS.DETAIL(id));
  },
  create: async (data: Partial<Exam>): Promise<Exam> => {
    return apiClient.post(API_ENDPOINTS.EXAMS.CREATE, data);
  },
  update: async (id: string, data: Partial<Exam>): Promise<Exam> => {
    return apiClient.put(API_ENDPOINTS.EXAMS.DETAIL(id), data);
  },
  delete: async (id: string): Promise<void> => {
    return apiClient.delete(API_ENDPOINTS.EXAMS.DETAIL(id));
  },
  book: async (data: ExamBookingRequest): Promise<ExamBooking> => {
    return apiClient.post(API_ENDPOINTS.EXAMS.BOOK, data);
  },
  getBookings: async (params?: { userId?: string; examId?: string }): Promise<{ data: ExamBooking[]; pagination?: any }> => {
    return apiClient.get(API_ENDPOINTS.EXAMS.BOOKINGS, { params });
  },
  updateBooking: async (id: string, data: FormData | UpdateExamBookingRequest): Promise<ExamBooking> => {
    if (data instanceof FormData) {
      return api.patch(API_ENDPOINTS.EXAMS.BOOKING_UPDATE(id), data, {
        headers: { 'Content-Type': 'multipart/form-data' },
        withCredentials: true,
      }).then(res => res.data.data || res.data);
    }
    return apiClient.patch(API_ENDPOINTS.EXAMS.BOOKING_UPDATE(id), data);
  },
  requestRetotaling: async (id: string): Promise<ExamBooking> => {
    return apiClient.patch(API_ENDPOINTS.EXAMS.RETOTALING(id));
  },
};

// Certifications API
export const certificationsApi = {
  create: async (data: FormData | CreateCertificationRequest): Promise<Certification> => {
    if (data instanceof FormData) {
      return api.post(API_ENDPOINTS.CERTIFICATIONS.CREATE, data, {
        headers: { 'Content-Type': 'multipart/form-data' },
        withCredentials: true,
      }).then(res => res.data.data || res.data);
    }
    return apiClient.post(API_ENDPOINTS.CERTIFICATIONS.CREATE, data);
  },
  list: async (params?: { userId?: string; category?: string; page?: number; limit?: number }): Promise<{ data: Certification[]; pagination?: any }> => {
    return apiClient.get(API_ENDPOINTS.CERTIFICATIONS.LIST, { params });
  },
  verify: async (code: string): Promise<CertificationVerificationResponse> => {
    return apiClient.get(API_ENDPOINTS.CERTIFICATIONS.VERIFY, { params: { code } });
  },
  getUserCertifications: async (userId: string): Promise<Certification[] | { data: Certification[] }> => {
    return apiClient.get(API_ENDPOINTS.CERTIFICATIONS.USER(userId));
  },
  get: async (id: string): Promise<Certification> => {
    return apiClient.get(API_ENDPOINTS.CERTIFICATIONS.DETAIL(id));
  },
  delete: async (id: string): Promise<void> => {
    return apiClient.delete(API_ENDPOINTS.CERTIFICATIONS.DELETE(id));
  },
};

// Events API
export const eventsApi = {
  list: async (params?: { page?: number; limit?: number; type?: string; date?: string }): Promise<{ data: Event[]; pagination?: any }> => {
    return apiClient.get(API_ENDPOINTS.EVENTS.LIST, { params });
  },
  get: async (id: string): Promise<Event> => {
    return apiClient.get(API_ENDPOINTS.EVENTS.DETAIL(id));
  },
  create: async (data: Partial<Event>): Promise<Event> => {
    return apiClient.post(API_ENDPOINTS.EVENTS.CREATE, data);
  },
  update: async (id: string, data: Partial<Event>): Promise<Event> => {
    return apiClient.put(API_ENDPOINTS.EVENTS.DETAIL(id), data);
  },
  delete: async (id: string): Promise<void> => {
    return apiClient.delete(API_ENDPOINTS.EVENTS.DETAIL(id));
  },
  register: async (data: EventRegistrationRequest): Promise<{ success: boolean; data?: any }> => {
    return apiClient.post(API_ENDPOINTS.EVENTS.REGISTER, data);
  },
  getRegistrations: async (params?: { userId?: string; eventId?: string; page?: number; limit?: number }): Promise<{ data: any[]; pagination?: any }> => {
    return apiClient.get(API_ENDPOINTS.EVENTS.REGISTRATIONS, { params });
  },
};

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

// Notification API
export const notificationApi = {
  getNotifications: async (params?: {
    page?: number;
    limit?: number;
    type?: string;
    isRead?: boolean;
  }): Promise<{
    data: any[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.type) queryParams.append('type', params.type);
    if (params?.isRead !== undefined) queryParams.append('isRead', params.isRead.toString());
    
    const query = queryParams.toString();
    const url = query ? `${API_ENDPOINTS.NOTIFICATIONS.LIST}?${query}` : API_ENDPOINTS.NOTIFICATIONS.LIST;
    return apiClient.get(url);
  },
  getUnreadCount: async (): Promise<{ unreadCount: number }> => {
    const response = await apiClient.get<{ unreadCount: number }>(API_ENDPOINTS.NOTIFICATIONS.UNREAD_COUNT);
    // apiClient.get extracts response.data.data, so we get { unreadCount: number } directly
    return response;
  },
  markAsRead: async (id: string): Promise<any> => {
    return apiClient.patch(API_ENDPOINTS.NOTIFICATIONS.MARK_READ(id));
  },
  markAllAsRead: async (): Promise<any> => {
    return apiClient.patch(API_ENDPOINTS.NOTIFICATIONS.MARK_ALL_READ);
  },
  deleteNotification: async (id: string): Promise<void> => {
    return apiClient.delete(API_ENDPOINTS.NOTIFICATIONS.DELETE(id));
  },
  deleteAllNotifications: async (): Promise<any> => {
    return apiClient.delete(API_ENDPOINTS.NOTIFICATIONS.DELETE_ALL);
  },
};

