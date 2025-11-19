// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: Array<{
    path: string;
    message: string;
  }>;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Wallet Types
export interface WalletBalance {
  balance: string;
  totalEarned: string;
  totalSpent: string;
  totalWithdrawn: string;
}

export interface CoinTransaction {
  id: string;
  type: 'EARN' | 'SPEND' | 'WITHDRAW';
  amount: string;
  source?: string;
  sourceId?: string;
  recipientId?: string;
  description: string;
  balanceBefore: string;
  balanceAfter: string;
  createdAt: string;
}

export interface EarnCoinsRequest {
  amount: number;
  source: string;
  sourceId?: string;
  description: string;
}

export interface SpendCoinsRequest {
  amount: number;
  recipientId?: string;
  description: string;
}

export interface WithdrawCoinsRequest {
  amount: number;
  description?: string;
}

// Auth Types
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: 'INDIVIDUAL' | 'INDUSTRIAL';
  status: 'PENDING_VERIFICATION' | 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  isEmailVerified: boolean;
  profileImage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  role?: 'INDIVIDUAL' | 'INDUSTRIAL';
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface VerifyOTPRequest {
  email: string;
  code: string;
  type: 'EMAIL_VERIFICATION' | 'LOGIN_OTP' | 'PASSWORD_RESET';
}

export interface ResendOTPRequest {
  email: string;
  type: 'EMAIL_VERIFICATION' | 'LOGIN_OTP' | 'PASSWORD_RESET';
}

export interface LoginResponse {
  user: User;
  accessToken?: string;
  requiresOTP?: boolean;
}

// Job Types
export interface JobPosting {
  id: string;
  employerId: string;
  title: string;
  description: string;
  requirements: string[];
  skills: string[];
  location: {
    province: string;
    district: string;
    municipality?: string;
    ward?: string;
    street?: string;
  };
  jobType: 'INTERNSHIP' | 'PART_TIME' | 'HOURLY_PAY' | 'DAILY_PAY' | 'FULL_TIME_1YEAR' | 'FULL_TIME_2YEAR' | 'FULL_TIME_2YEAR_PLUS';
  salaryRange?: {
    min: number;
    max: number;
    currency: string;
  };
  remoteWork: boolean;
  numberOfPositions: number;
  contractDuration?: number;
  expiresAt?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'EXPIRED';
  verified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface JobApplication {
  id: string;
  jobId: string;
  userId: string;
  resumeUrl?: string;
  coverLetter?: string;
  portfolioLinks?: string[];
  status: 'PENDING' | 'REVIEWED' | 'SHORTLISTED' | 'INTERVIEW' | 'ACCEPTED' | 'REJECTED';
  interviewDate?: string;
  interviewNotes?: string;
  createdAt: string;
  updatedAt: string;
}

// Location Types
export interface Location {
  country: string;
  province: string;
  district: string;
  municipality?: string;
  ward?: string;
  street?: string;
  city?: string;
}

// Wallet Types
export interface WalletBalance {
  balance: string;
  totalEarned: string;
  totalSpent: string;
  totalWithdrawn: string;
}

export interface CoinTransaction {
  id: string;
  type: 'EARN' | 'SPEND' | 'WITHDRAW' | 'TRANSFER';
  amount: string;
  source?: string;
  sourceId?: string;
  recipientId?: string;
  description: string;
  balanceBefore: string;
  balanceAfter: string;
  createdAt: string;
}

export interface EarnCoinsRequest {
  amount: number;
  source?: string;
  sourceId?: string;
  description: string;
}

export interface SpendCoinsRequest {
  amount: number;
  source?: string;
  sourceId?: string;
  description: string;
}

export interface WithdrawCoinsRequest {
  amount: number;
  description?: string;
}

// Analytics Types
export interface PlatformStatistics {
  totalUsers: number;
  totalJobs: number;
  activeJobs: number;
  totalApplications: number;
  pendingApplications: number;
  approvedKYCs: number;
  pendingKYCs: number;
}

// Trending Types
export interface TrendingJob {
  jobId: string;
  job: JobPosting;
  viewCount: number;
  applicationCount: number;
  trendScore: number;
}

export interface TrendingSkill {
  skill: string;
  count: number;
  trendScore: number;
}

// User Statistics Types
export interface UserStatistics {
  applications: {
    total: number;
    byStatus: Array<{
      status: string;
      count: number;
    }>;
  };
  trainings: {
    total: number;
    completed: number;
    inProgress: number;
  };
  exams: {
    total: number;
    passed: number;
    passRate: number;
  };
  certifications: {
    total: number;
  };
}

// Job Application with Job Details
export interface JobApplicationWithJob extends JobApplication {
  job?: JobPosting;
}

