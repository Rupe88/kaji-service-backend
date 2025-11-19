import axios, {
  AxiosError,
  AxiosInstance,
  InternalAxiosRequestConfig,
} from 'axios';
import { API_URL, API_ENDPOINTS } from './constants';
import { ApiResponse } from '@/types/api';
import toast from 'react-hot-toast';

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  withCredentials: true, // Important for cookie-based auth
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Add any auth headers if needed (though we use cookies)
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for token refresh
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: any) => void;
  reject: (reason?: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error: AxiosError<ApiResponse>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // If error is 401 and we haven't tried refreshing yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Check endpoint types
      const isAuthEndpoint = originalRequest.url?.includes('/api/auth/');
      const isRefreshEndpoint = originalRequest.url?.includes(
        '/api/auth/refresh-token'
      );
      const isGetMeEndpoint = originalRequest.url?.includes('/api/auth/me');

      // Special handling for getMe endpoint - always try to refresh first
      if (isGetMeEndpoint) {
        originalRequest._retry = true;

        // If already refreshing, wait for it
        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          })
            .then(() => {
              return api(originalRequest);
            })
            .catch((err) => {
              return Promise.reject(err);
            });
        }

        isRefreshing = true;

        try {
          // Try to refresh the token using cookies
          const response = await axios.post<
            ApiResponse<{ accessToken: string }>
          >(
            `${API_URL}${API_ENDPOINTS.AUTH.REFRESH_TOKEN}`,
            {},
            {
              withCredentials: true,
              headers: {
                'Content-Type': 'application/json',
              },
            }
          );

          if (response.data.success) {
            // Token refreshed - retry getMe request
            processQueue(null, null);
            isRefreshing = false;
            return api(originalRequest);
          } else {
            throw new Error('Failed to refresh token');
          }
        } catch (refreshError) {
          // Refresh failed - let AuthContext handle it (don't redirect)
          processQueue(refreshError, null);
          isRefreshing = false;
          return Promise.reject(refreshError);
        }
      }

      // If it's an auth endpoint (except refresh and me), just reject without redirect
      if (isAuthEndpoint && !isRefreshEndpoint) {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        // If already refreshing, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => {
            // Token refreshed - cookies are automatically sent, no need to set header
            return api(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Try to refresh the token using cookies (withCredentials sends cookies automatically)
        const response = await axios.post<ApiResponse<{ accessToken: string }>>(
          `${API_URL}${API_ENDPOINTS.AUTH.REFRESH_TOKEN}`,
          {},
          {
            withCredentials: true,
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );

        if (response.data.success) {
          // Token refresh successful - new access token is set in cookie automatically
          // No need to manually set Authorization header since we use cookies
          processQueue(null, null);
          isRefreshing = false;

          // Retry original request (cookies will be sent automatically)
          return api(originalRequest);
        } else {
          throw new Error('Failed to refresh token');
        }
      } catch (refreshError) {
        processQueue(refreshError, null);
        isRefreshing = false;

        // Check if this is a getMe call - don't redirect for it
        const isGetMeEndpoint = originalRequest.url?.includes('/api/auth/me');

        // Don't redirect if this is a getMe call (let AuthContext handle it)
        if (isGetMeEndpoint) {
          return Promise.reject(refreshError);
        }

        // Only redirect to login if not already on a public page
        if (typeof window !== 'undefined') {
          const currentPath = window.location.pathname;
          const isAuthPage = currentPath.startsWith('/auth/');
          const isLandingPage = currentPath === '/';
          const isPublicPage = isAuthPage || isLandingPage;

          // Don't redirect if already on public pages or if the request is to auth endpoints
          const isAuthEndpoint = originalRequest.url?.includes('/api/auth/');

          // Only redirect to login if on a protected page (not public) and not getMe
          if (!isPublicPage && !isAuthEndpoint && !isGetMeEndpoint) {
            // Small delay to ensure state updates complete
            setTimeout(() => {
              window.location.href = '/auth/login';
            }, 100);
          }
        }
        return Promise.reject(refreshError);
      }
    }

    // Handle other errors
    const errorMessage =
      error.response?.data?.message || error.message || 'An error occurred';

    // Don't show toast for:
    // - 401 errors (handled above or expected for auth endpoints)
    // - 403 errors on public endpoints (like analytics/platform on landing page)
    // - 404 errors on KYC endpoints (KYC not found is expected - user hasn't submitted yet)
    // - Network errors
    // - Auth endpoint errors (they handle their own error messages)
    const isAuthEndpoint = originalRequest?.url?.includes('/api/auth/');
    const isPublicAnalyticsEndpoint = originalRequest?.url?.includes(
      '/api/analytics/platform'
    );
    const isPublicTrendingEndpoint =
      originalRequest?.url?.includes('/api/trending/');
    const isKYCEndpoint =
      originalRequest?.url?.includes('/api/individual-kyc/') ||
      originalRequest?.url?.includes('/api/industrial-kyc/');

    // Suppress errors for:
    // - 403 errors on public endpoints (expected for non-admin users)
    // - 404 errors on KYC endpoints (expected - user hasn't submitted KYC yet)
    // - 401 errors (handled above)
    // - Network errors
    // - Auth endpoint errors
    const shouldSuppressError =
      (error.response?.status === 403 &&
        (isPublicAnalyticsEndpoint || isPublicTrendingEndpoint)) ||
      (error.response?.status === 404 && isKYCEndpoint) ||
      error.response?.status === 401 ||
      error.code === 'ERR_NETWORK' ||
      isAuthEndpoint;

    if (!shouldSuppressError) {
      toast.error(errorMessage);
    }

    return Promise.reject(error);
  }
);

// API helper functions
export const apiClient = {
  get: async <T = any>(url: string, config?: any): Promise<T> => {
    const response = await api.get<ApiResponse<T>>(url, config);
    if (response.data.success && response.data.data !== undefined) {
      return response.data.data as T;
    }
    return response.data as any;
  },

  post: async <T = any>(url: string, data?: any, config?: any): Promise<T> => {
    const response = await api.post<ApiResponse<T>>(url, data, config);
    if (response.data.success && response.data.data !== undefined) {
      return response.data.data as T;
    }
    return response.data as any;
  },

  put: async <T = any>(url: string, data?: any, config?: any): Promise<T> => {
    const response = await api.put<ApiResponse<T>>(url, data, config);
    if (response.data.success && response.data.data !== undefined) {
      return response.data.data as T;
    }
    return response.data as any;
  },

  patch: async <T = any>(url: string, data?: any, config?: any): Promise<T> => {
    const response = await api.patch<ApiResponse<T>>(url, data, config);
    if (response.data.success && response.data.data !== undefined) {
      return response.data.data as T;
    }
    return response.data as any;
  },

  delete: async <T = any>(url: string, config?: any): Promise<T> => {
    const response = await api.delete<ApiResponse<T>>(url, config);
    if (response.data.success && response.data.data !== undefined) {
      return response.data.data as T;
    }
    return response.data as any;
  },
};

export default api;
