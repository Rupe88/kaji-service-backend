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
    UPDATE_PROFILE_PICTURE: '/api/auth/profile/picture',
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
  },
  // Trending
  TRENDING: {
    JOBS: '/api/trending/jobs',
    SKILLS: '/api/trending/skills',
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

