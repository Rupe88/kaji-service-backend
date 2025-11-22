// API Configuration
export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://hr-backend-rlth.onrender.com';
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001';

// API Endpoints
export const API_ENDPOINTS = {
  // Auth
  AUTH: {
    REGISTER: '/api/auth/register',
    LOGIN: '/api/auth/login',
    VERIFY_OTP: '/api/auth/verify-otp',
    RESEND_OTP: '/api/auth/resend-otp',
    REFRESH_TOKEN: '/api/auth/refresh-token',
    LOGOUT: '/api/auth/logout',
    ME: '/api/auth/me',
    UPDATE_PROFILE: '/api/auth/profile',
    UPDATE_PROFILE_PICTURE: '/api/auth/profile/picture',
    CHANGE_PASSWORD: '/api/auth/change-password',
    FORGOT_PASSWORD: '/api/auth/forgot-password',
    RESET_PASSWORD: '/api/auth/reset-password',
  },
  // Users
  USERS: {
    PREFERENCES: '/api/users/preferences',
    PRIVACY: '/api/users/privacy',
  },
  // Jobs
  JOBS: {
    LIST: '/api/jobs',
    DETAIL: (id: string) => `/api/jobs/${id}`,
    CREATE: '/api/jobs',
    UPDATE: (id: string) => `/api/jobs/${id}`,
    DELETE: (id: string) => `/api/jobs/${id}`,
  },
  // Applications
  APPLICATIONS: {
    LIST: '/api/applications',
    DETAIL: (id: string) => `/api/applications/${id}`,
    CREATE: '/api/applications',
    UPDATE: (id: string) => `/api/applications/${id}`,
    BY_JOB: (jobId: string) => `/api/applications/job/${jobId}`,
    BY_USER: (userId: string) => `/api/applications/user/${userId}`,
  },
  // Skill Matching
  SKILL_MATCHING: {
    BY_JOB: (jobId: string) => `/api/skill-matching/job/${jobId}`,
    BY_USER: (userId: string) => `/api/skill-matching/user/${userId}`,
    SEARCH: '/api/skill-matching/search',
    RECOMMENDATIONS: '/api/skill-matching/recommendations',
  },
  // Trending
  TRENDING: {
    JOBS: '/api/trending/jobs',
    SKILLS: '/api/trending/skills',
  },
  // Admin
  ADMIN: {
    DASHBOARD_STATS: '/api/admin/dashboard/stats',
    KYC_PENDING: '/api/admin/kyc/pending',
    KYC_DETAILS: (type: string, userId: string) => `/api/admin/kyc/${type}/${userId}`,
    KYC_INDIVIDUAL_UPDATE: (userId: string) => `/api/admin/kyc/individual/${userId}`,
    KYC_INDUSTRIAL_UPDATE: (userId: string) => `/api/admin/kyc/industrial/${userId}`,
    KYC_BULK_UPDATE: '/api/admin/kyc/bulk-update',
    USERS_LIST: '/api/admin/users',
    USER_UPDATE_STATUS: (userId: string) => `/api/admin/users/${userId}/status`,
    JOBS_UNVERIFIED: '/api/admin/jobs/unverified',
    JOB_VERIFY: (jobId: string) => `/api/admin/jobs/${jobId}/verify`,
    JOBS_BULK_VERIFY: '/api/admin/jobs/bulk-verify',
  },
  // Analytics
  ANALYTICS: {
    PLATFORM: '/api/analytics/platform',
    JOBS: '/api/analytics/jobs',
    USER: (userId: string) => `/api/analytics/users/${userId}`,
  },
  // Wallet
  WALLET: {
    BALANCE: '/api/wallet/balance',
    TRANSACTIONS: '/api/wallet/transactions',
    EARN: '/api/wallet/earn',
    SPEND: '/api/wallet/spend',
    WITHDRAW: '/api/wallet/withdraw',
  },
  // KYC
  KYC: {
    INDIVIDUAL: {
      CREATE: '/api/individual-kyc',
      GET: (userId: string) => `/api/individual-kyc/${userId}`,
      UPDATE: (userId: string) => `/api/individual-kyc/${userId}`,
      LIST: '/api/individual-kyc',
      UPDATE_STATUS: (userId: string) => `/api/individual-kyc/${userId}/status`,
    },
    INDUSTRIAL: {
      CREATE: '/api/industrial-kyc',
      GET: (userId: string) => `/api/industrial-kyc/${userId}`,
      UPDATE: (userId: string) => `/api/industrial-kyc/${userId}`,
      LIST: '/api/industrial-kyc',
      UPDATE_STATUS: (userId: string) => `/api/industrial-kyc/${userId}/status`,
    },
  },
  // Training
  TRAINING: {
    COURSES: {
      LIST: '/api/training/courses',
      DETAIL: (id: string) => `/api/training/courses/${id}`,
      CREATE: '/api/training/courses',
      UPDATE: (id: string) => `/api/training/courses/${id}`,
      DELETE: (id: string) => `/api/training/courses/${id}`,
    },
    ENROLL: '/api/training/enroll',
    ENROLLMENTS: '/api/training/enrollments',
    UPDATE_ENROLLMENT: (id: string) => `/api/training/enrollments/${id}`,
    COMMENTS: {
      CREATE: '/api/training/comments',
      LIST: (courseId: string) => `/api/training/courses/${courseId}/comments`,
      UPDATE: (id: string) => `/api/training/comments/${id}`,
      DELETE: (id: string) => `/api/training/comments/${id}`,
    },
  },
} as const;

// Color Theme
export const COLORS = {
  teal: '#14b8a6',
  tealDark: '#0d9488',
  tealLight: '#5eead4',
  purple: '#a855f7',
  purpleDark: '#9333ea',
  purpleLight: '#c084fc',
  pink: '#ec4899',
  blue: '#3b82f6',
  orange: '#f59e0b',
  yellow: '#eab308',
  background: '#0a0a0a',
  cardBg: '#1a1a1a',
  border: '#2a2a2a',
} as const;

// OTP Types
export const OTP_TYPES = {
  EMAIL_VERIFICATION: 'EMAIL_VERIFICATION',
  LOGIN_OTP: 'LOGIN_OTP',
  PASSWORD_RESET: 'PASSWORD_RESET',
} as const;

export type OTPType = typeof OTP_TYPES[keyof typeof OTP_TYPES];

