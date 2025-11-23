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
  role: 'INDIVIDUAL' | 'INDUSTRIAL' | 'ADMIN';
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
    city?: string;
    municipality?: string;
    ward?: string;
    street?: string;
    isRemote?: boolean;
  };
  // Direct location properties (for backward compatibility)
  province?: string;
  district?: string;
  city?: string;
  municipality?: string;
  latitude?: number | null;
  longitude?: number | null;
  jobType: 'INTERNSHIP' | 'PART_TIME' | 'HOURLY_PAY' | 'DAILY_PAY' | 'FULL_TIME_1YEAR' | 'FULL_TIME_2YEAR' | 'FULL_TIME_2YEAR_PLUS';
  salaryRange?: {
    min: number;
    max: number;
    currency: string;
  };
  // Direct salary properties (for backward compatibility)
  salaryMin?: number;
  salaryMax?: number;
  salaryType?: string;
  remoteWork: boolean;
  numberOfPositions: number;
  contractDuration?: number;
  expiresAt?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'EXPIRED';
  isActive?: boolean; // Backend field
  verified: boolean;
  isVerified?: boolean; // Backend field
  viewCount?: number; // Number of times this job has been viewed
  createdAt: string;
  updatedAt: string;
}

export interface JobApplication {
  id: string;
  jobId: string;
  applicantId: string;
  userId?: string; // Legacy field, use applicantId
  resumeUrl?: string;
  coverLetter?: string;
  portfolioUrl?: string;
  portfolioLinks?: string[];
  status: 'PENDING' | 'REVIEWED' | 'SHORTLISTED' | 'INTERVIEW' | 'ACCEPTED' | 'REJECTED';
  interviewDate?: string;
  interviewNotes?: string;
  appliedAt?: string;
  reviewedAt?: string;
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
  charts?: {
    timeSeries: Array<{
      date: string;
      applications: number;
      trainings: number;
    }>;
    applicationsByStatus: Array<{
      status: string;
      count: number;
    }>;
  };
}

// Job Application with Job Details
export interface JobApplicationWithJob extends JobApplication {
  job?: JobPosting;
}

// Skill Matching Types
export interface JobRecommendation {
  userId: string;
  matchScore: number;
  skillMatch: number;
  locationMatch: number;
  experienceMatch: number;
  distance?: number;
  job: {
    id: string;
    title: string;
    description: string;
    jobType: string;
    salaryMin?: number;
    salaryMax?: number;
    location: {
      province: string;
      district: string;
      city: string;
      isRemote: boolean;
    };
    employer?: {
      companyName: string;
      industrySector?: string;
    };
    createdAt: string;
  };
  details: {
    matchedSkills: string[];
    missingSkills: string[];
    locationMatch: boolean;
    experienceMatch: boolean;
    distance?: number;
  };
}

export interface JobRecommendationsResponse {
  success: boolean;
  data: JobRecommendation[];
  count: number;
}

// Training Types
export type TrainingMode = 'PHYSICAL' | 'ONLINE' | 'HYBRID';

export interface TrainingCourse {
  id: string;
  providerId: string;
  title: string;
  description: string;
  category: string;
  duration: number; // Hours
  mode: TrainingMode;
  price: string | number;
  isFree: boolean;
  syllabus?: string[];
  prerequisites?: string[];
  learningOutcomes?: string[];
  readingMaterials?: string[];
  videoMaterials?: string[];
  startDate?: string;
  endDate?: string;
  seats?: number;
  bookedSeats: number;
  isActive: boolean;
  isVerified: boolean;
  verifiedBy?: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    enrollments: number;
  };
}

export interface TrainingEnrollment {
  id: string;
  courseId: string;
  userId: string;
  enrolledAt: string;
  startedAt?: string;
  completedAt?: string;
  progress: number; // 0-100
  status: 'ENROLLED' | 'IN_PROGRESS' | 'COMPLETED' | 'DROPPED';
  practiceHours: number;
  practiceVideos?: string[];
  practicePhotos?: string[];
  course?: TrainingCourse;
  individual?: {
    userId: string;
    fullName: string;
    email: string;
  };
}

export interface TrainingEnrollmentRequest {
  courseId: string;
  userId: string;
}

export interface UpdateEnrollmentRequest {
  progress?: number;
  status?: string;
  practiceHours?: number;
  practiceVideos?: string[];
  practicePhotos?: string[];
  startedAt?: string;
  completedAt?: string;
}

export interface UpdateEnrollmentResponse {
  success: boolean;
  data: TrainingEnrollment;
  coinsAwarded?: number;
}

// Event Types
export type EventType = 'JOB_FAIR' | 'WORKSHOP' | 'NETWORKING' | 'SEMINAR';

export interface Event {
  id: string;
  organizerId: string;
  title: string;
  description: string;
  type: EventType;
  mode: TrainingMode;
  isFree: boolean;
  price?: number | string;
  eventDate: string;
  date?: string; // Alias for eventDate
  duration: number;
  meetingLink?: string;
  venue?: string;
  location?: string; // Alias for venue
  maxAttendees?: number;
  registeredCount?: number;
  currentAttendees?: number; // Alias for registeredCount
  isActive: boolean;
  registrationDeadline?: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    registrations: number;
  };
}

export interface EventRegistration {
  id: string;
  eventId: string;
  userId: string;
  registeredAt: string;
  attended: boolean;
  event?: Event;
}

export interface EventRegistrationRequest {
  eventId: string;
  userId: string;
}

// Exam Types
export type ExamStatus = 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'PENDING_RESULTS' | 'PASSED' | 'FAILED';

export interface Exam {
  id: string;
  courseId?: string;
  title: string;
  description: string;
  category: string;
  mode: TrainingMode;
  duration: number;
  passingScore: number;
  totalMarks: number;
  totalQuestions?: number; // Alias for totalMarks or calculated
  examFee: number | string;
  fee?: number | string; // Alias for examFee
  isActive: boolean;
  examDate?: string;
  registrationDeadline?: string;
  createdAt: string;
  updatedAt: string;
  bookings?: ExamBooking[];
}

export interface ExamBooking {
  id: string;
  examId: string;
  userId: string;
  bookedDate: string;
  examDate: string;
  interviewDate?: string;
  status: ExamStatus;
  score?: number;
  resultDate?: string;
  retotalingRequested: boolean;
  retotalingDate?: string;
  retotalingScore?: number;
  examVideos?: any;
  examPhotos?: any;
  interviewVideos?: any;
  interviewPhotos?: any;
  exam?: Exam;
  individual?: {
    userId: string;
    fullName: string;
    email: string;
  };
}

export interface ExamBookingRequest {
  examId: string;
  userId: string;
}

export interface UpdateExamBookingRequest {
  examDate?: string;
  interviewDate?: string;
  status?: ExamStatus;
  score?: number;
  examVideos?: any;
  examPhotos?: any;
  interviewVideos?: any;
  interviewPhotos?: any;
}

// Certification Types
export interface Certification {
  id: string;
  userId: string;
  examBookingId?: string;
  certificateNumber: string;
  title: string;
  category: string;
  issuedDate: string;
  expiryDate?: string;
  certificateUrl: string;
  verificationCode: string;
  isVerified: boolean;
  verifiedBy?: string;
  practiceVideos?: any;
  practicePhotos?: any;
  orientationVideos?: any;
  orientationPhotos?: any;
  createdAt: string;
  updatedAt: string;
  individual?: {
    userId: string;
    fullName: string;
    email: string;
    profilePhotoUrl?: string;
  };
}

export interface CertificationVerificationResponse {
  success: boolean;
  data?: Certification;
  message?: string;
}

export interface CreateCertificationRequest {
  userId: string;
  examBookingId?: string;
  title: string;
  category: string;
  issuedDate: string;
  expiryDate?: string;
  practiceVideos?: any;
  practicePhotos?: any;
  orientationVideos?: any;
  orientationPhotos?: any;
}

