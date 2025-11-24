/**
 * Get the correct dashboard route based on user role
 */
export const getDashboardRoute = (role?: string): string => {
  if (role === 'ADMIN') {
    return '/dashboard/admin';
  }
  if (role === 'INDUSTRIAL') {
    return '/dashboard/employer/jobs';
  }
  // Default to seeker dashboard for INDIVIDUAL or any other role
  return '/dashboard';
};

/**
 * Get the correct KYC route based on user role
 */
export const getKYCRoute = (role?: string): string => {
  if (role === 'INDUSTRIAL') {
    return '/kyc/industrial';
  }
  // Default to Individual KYC
  return '/kyc/individual';
};

