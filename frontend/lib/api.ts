const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: Array<{ path: string; message: string }>;
}

class ApiClient {
  private baseURL: string;

  constructor(baseURL: string = API_URL) {
    this.baseURL = baseURL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    
    const config: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      credentials: 'include', // Include cookies for authentication
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'An error occurred');
      }

      return data;
    } catch (error: any) {
      throw new Error(error.message || 'Network error');
    }
  }

  // Auth APIs
  async register(userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone: string;
    role: 'INDIVIDUAL' | 'INDUSTRIAL';
  }) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async login(email: string, password: string) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async verifyOTP(email: string, code: string, type: 'EMAIL_VERIFICATION' | 'PASSWORD_RESET' | 'LOGIN_OTP') {
    return this.request('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ email, code, type }),
    });
  }

  async resendOTP(email: string, type: 'EMAIL_VERIFICATION' | 'PASSWORD_RESET' | 'LOGIN_OTP') {
    return this.request('/auth/resend-otp', {
      method: 'POST',
      body: JSON.stringify({ email, type }),
    });
  }

  async logout() {
    return this.request('/auth/logout', {
      method: 'POST',
    });
  }

  async refreshToken() {
    return this.request('/auth/refresh', {
      method: 'POST',
    });
  }

  async getCurrentUser() {
    return this.request('/auth/me');
  }

  // Job Posting APIs
  async getJobPostings(params?: {
    page?: number;
    limit?: number;
    search?: string;
    location?: string;
    skills?: string[];
  }) {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.location) queryParams.append('location', params.location);
    if (params?.skills) params.skills.forEach(skill => queryParams.append('skills', skill));

    return this.request(`/job-postings?${queryParams.toString()}`);
  }

  async getJobPosting(id: string) {
    return this.request(`/job-postings/${id}`);
  }

  async createJobPosting(data: any) {
    return this.request('/job-postings', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateJobPosting(id: string, data: any) {
    return this.request(`/job-postings/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteJobPosting(id: string) {
    return this.request(`/job-postings/${id}`, {
      method: 'DELETE',
    });
  }

  // Job Application APIs
  async applyToJob(jobId: string, data: {
    coverLetter?: string;
    resumeUrl?: string;
  }) {
    return this.request(`/job-applications/apply/${jobId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getMyApplications() {
    return this.request('/job-applications/my-applications');
  }

  async getJobApplications(jobId: string) {
    return this.request(`/job-applications/job/${jobId}`);
  }

  async updateApplicationStatus(applicationId: string, status: string) {
    return this.request(`/job-applications/${applicationId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  // User Profile APIs
  async updateProfile(data: any) {
    return this.request('/users/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async uploadResume(file: File) {
    const formData = new FormData();
    formData.append('file', file);

    return this.request('/users/upload-resume', {
      method: 'POST',
      headers: {}, // Let browser set Content-Type for FormData
      body: formData,
    });
  }

  // Skill Matching APIs
  async getSkillMatches() {
    return this.request('/skill-matching/matches');
  }

  async getJobMatches(jobId: string) {
    return this.request(`/skill-matching/job/${jobId}/matches`);
  }

  // Analytics APIs
  async getDashboardStats() {
    return this.request('/analytics/dashboard');
  }

  async getJobAnalytics(jobId: string) {
    return this.request(`/analytics/job/${jobId}`);
  }
}

export const apiClient = new ApiClient();
export default apiClient;

