// src/utils/service.utils.ts
import { Prisma } from '@prisma/client';

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param lat1 Latitude of first point
 * @param lon1 Longitude of first point
 * @param lat2 Latitude of second point
 * @param lon2 Longitude of second point
 * @returns Distance in kilometers
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Build distance filter for Prisma query
 */
export function buildDistanceFilter(
  latitude: number,
  longitude: number,
  maxDistance: number // in km
): Prisma.ServiceWhereInput {
  // Approximate degrees per km (varies by latitude)
  const kmPerDegree = 111;
  const degreeDelta = maxDistance / kmPerDegree;

  return {
    AND: [
      { latitude: { not: null } },
      { longitude: { not: null } },
      {
        latitude: { gte: latitude - degreeDelta, lte: latitude + degreeDelta },
      },
      {
        longitude: {
          gte: longitude - degreeDelta,
          lte: longitude + degreeDelta,
        },
      },
    ],
  };
}

/**
 * Calculate trend score for a service
 * @param bookingCount Total bookings
 * @param bookingGrowth Booking growth rate
 * @param viewCount Total views
 * @param viewGrowth View growth rate
 * @param rating Average rating
 * @param recencyDays Days since last booking
 */
export function calculateTrendScore(
  bookingCount: number,
  bookingGrowth: number,
  viewCount: number,
  viewGrowth: number,
  rating: number,
  recencyDays: number
): number {
  const bookingWeight = 0.4;
  const viewWeight = 0.2;
  const ratingWeight = 0.25;
  const recencyWeight = 0.15;

  const bookingScore = (bookingCount * 0.5 + bookingGrowth * 0.5) * 100;
  const viewScore = (viewCount * 0.3 + viewGrowth * 0.7) * 10;
  const ratingScore = rating * 20;
  const recencyScore = Math.max(0, 100 - recencyDays * 2);

  return (
    bookingScore * bookingWeight +
    viewScore * viewWeight +
    ratingScore * ratingWeight +
    recencyScore * recencyWeight
  );
}

/**
 * Generate service slug from title
 */
export function generateServiceSlug(title: string, id: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 50);

  return `${slug}-${id.substring(0, 8)}`;
}

/**
 * Build service search query with filters
 */
export function buildServiceSearchQuery(
  filters: any
): Prisma.ServiceWhereInput {
  const where: Prisma.ServiceWhereInput = {
    isActive: true,
    status: 'APPROVED',
  };

  if (filters.categoryId) where.categoryId = filters.categoryId;
  if (filters.subcategoryId) where.subcategoryId = filters.subcategoryId;
  if (filters.province) where.province = filters.province;
  if (filters.district) where.district = filters.district;
  if (filters.city)
    where.city = { contains: filters.city, mode: 'insensitive' };
  if (filters.priceType) where.priceType = filters.priceType;
  if (filters.isVerified !== undefined) where.isVerified = filters.isVerified;
  if (filters.availabilityType)
    where.availabilityType = filters.availabilityType;

  if (filters.priceMin !== undefined || filters.priceMax !== undefined) {
    where.OR = [];
    if (filters.priceMin !== undefined) {
      where.OR.push({ priceMin: { gte: filters.priceMin } });
      where.OR.push({ hourlyRate: { gte: filters.priceMin } });
      where.OR.push({ dailyRate: { gte: filters.priceMin } });
    }
    if (filters.priceMax !== undefined) {
      where.OR.push({ priceMax: { lte: filters.priceMax } });
      where.OR.push({ hourlyRate: { lte: filters.priceMax } });
      where.OR.push({ dailyRate: { lte: filters.priceMax } });
    }
  }

  if (filters.minRating !== undefined) {
    where.averageRating = { gte: filters.minRating };
  }

  if (filters.latitude && filters.longitude && filters.maxDistance) {
    Object.assign(
      where,
      buildDistanceFilter(
        filters.latitude,
        filters.longitude,
        filters.maxDistance
      )
    );
  }

  return where;
}

/**
 * Build service demand search query with filters
 */
export function buildDemandSearchQuery(
  filters: any
): Prisma.ServiceDemandWhereInput {
  const where: Prisma.ServiceDemandWhereInput = {
    status: filters.status || 'OPEN',
  };

  if (filters.categoryId) where.categoryId = filters.categoryId;
  if (filters.subcategoryId) where.subcategoryId = filters.subcategoryId;
  if (filters.province) where.province = filters.province;
  if (filters.district) where.district = filters.district;
  if (filters.urgency) where.urgency = filters.urgency;
  if (filters.certificationRequired !== undefined) {
    where.certificationRequired = filters.certificationRequired;
  }

  if (filters.budgetMin !== undefined || filters.budgetMax !== undefined) {
    where.AND = [];
    if (filters.budgetMin !== undefined) {
      where.AND.push({ budgetMax: { gte: filters.budgetMin } });
    }
    if (filters.budgetMax !== undefined) {
      where.AND.push({ budgetMin: { lte: filters.budgetMax } });
    }
  }

  if (filters.experienceRequired !== undefined) {
    where.experienceRequired = { lte: filters.experienceRequired };
  }

  return where;
}

/**
 * Get sort configuration for service search
 */
export function getServiceSortConfig(
  sortBy?: string,
  sortOrder: 'asc' | 'desc' = 'desc'
) {
  const orderBy: Prisma.ServiceOrderByWithRelationInput[] = [];

  switch (sortBy) {
    case 'rating':
      orderBy.push({ averageRating: sortOrder });
      break;
    case 'price':
      orderBy.push({ priceMin: sortOrder });
      break;
    case 'popularity':
      orderBy.push({ bookingCount: sortOrder });
      break;
    case 'satisfaction':
      orderBy.push({ averageRating: sortOrder });
      orderBy.push({ totalReviews: sortOrder });
      break;
    case 'newest':
      orderBy.push({ createdAt: 'desc' });
      break;
    default:
      orderBy.push({ isFeatured: 'desc' });
      orderBy.push({ averageRating: 'desc' });
      orderBy.push({ bookingCount: 'desc' });
  }

  return orderBy;
}

/**
 * Get sort configuration for demand search
 */
export function getDemandSortConfig(
  sortBy?: string,
  sortOrder: 'asc' | 'desc' = 'desc'
) {
  const orderBy: Prisma.ServiceDemandOrderByWithRelationInput[] = [];

  switch (sortBy) {
    case 'budget':
      orderBy.push({ budgetMax: sortOrder });
      break;
    case 'urgency':
      orderBy.push({
        urgency: sortOrder === 'asc' ? 'desc' : 'asc', // More urgent first
      });
      break;
    case 'responses':
      orderBy.push({ responseCount: sortOrder });
      break;
    case 'newest':
      orderBy.push({ createdAt: 'desc' });
      break;
    default:
      orderBy.push({ urgency: 'asc' }); // Most urgent first
      orderBy.push({ createdAt: 'desc' });
  }

  return orderBy;
}

/**
 * Calculate pagination metadata
 */
export function calculatePagination(
  total: number,
  page: number,
  limit: number
) {
  const totalPages = Math.ceil(total / limit);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  return {
    total,
    page,
    limit,
    totalPages,
    hasNextPage,
    hasPrevPage,
  };
}

/**
 * Validate working hours format
 */
export function validateWorkingHours(workingHours: any): boolean {
  if (!workingHours || typeof workingHours !== 'object') return false;

  const days = [
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
    'sunday',
  ];
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;

  for (const day of days) {
    if (workingHours[day]) {
      const hours = workingHours[day];
      if (!hours.isOpen) continue;

      if (!timeRegex.test(hours.openTime) || !timeRegex.test(hours.closeTime)) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Format currency for Nepal (NPR)
 */
export function formatCurrency(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-NP', {
    style: 'currency',
    currency: 'NPR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num);
}

/**
 * Sanitize search query
 */
export function sanitizeSearchQuery(query: string): string {
  return query.trim().replace(/[<>]/g, '').substring(0, 200);
}

/**
 * Check if service is within quiet hours
 */
export function isWithinQuietHours(
  quietStart?: string,
  quietEnd?: string
): boolean {
  if (!quietStart || !quietEnd) return false;

  const now = new Date();
  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now
    .getMinutes()
    .toString()
    .padStart(2, '0')}`;

  // Handle overnight quiet hours (e.g., 22:00 to 08:00)
  if (quietStart > quietEnd) {
    return currentTime >= quietStart || currentTime <= quietEnd;
  }

  return currentTime >= quietStart && currentTime <= quietEnd;
}

/**
 * Generate notification message for urgent job
 */
export function generateUrgentJobNotification(
  jobTitle: string,
  category: string,
  payment: number,
  distance: number
): { title: string; message: string } {
  return {
    title: 'New Urgent Job Available',
    message: `${jobTitle} in ${category}. Payment: ${formatCurrency(
      payment
    )}. Distance: ${distance.toFixed(1)}km away.`,
  };
}

/**
 * Validate Nepal address
 */
export function validateNepalAddress(
  province: string,
  district: string
): boolean {
  const nepalProvinces = [
    'Koshi',
    'Madhesh',
    'Bagmati',
    'Gandaki',
    'Lumbini',
    'Karnali',
    'Sudurpashchim',
  ];

  return nepalProvinces.includes(province) && district.length > 0;
}

/**
 * Calculate service rating breakdown
 */
export function calculateRatingBreakdown(reviews: Array<{ rating: number }>) {
  const breakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  const total = reviews.length;

  reviews.forEach((review) => {
    breakdown[review.rating as keyof typeof breakdown]++;
  });

  return {
    breakdown,
    percentages: {
      1: total > 0 ? (breakdown[1] / total) * 100 : 0,
      2: total > 0 ? (breakdown[2] / total) * 100 : 0,
      3: total > 0 ? (breakdown[3] / total) * 100 : 0,
      4: total > 0 ? (breakdown[4] / total) * 100 : 0,
      5: total > 0 ? (breakdown[5] / total) * 100 : 0,
    },
  };
}

/**
 * Check if user is eligible to provide service (KYC approved)
 */
export function checkProviderEligibility(kycStatus: string): {
  eligible: boolean;
  reason?: string;
} {
  if (kycStatus !== 'APPROVED') {
    return {
      eligible: false,
      reason: 'Your KYC must be approved before you can list services',
    };
  }

  return { eligible: true };
}

/**
 * Generate service verification code
 */
export function generateVerificationCode(): string {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

/**
 * Calculate estimated service duration
 */
export function calculateEstimatedDuration(
  serviceType: string,
  complexity: 'simple' | 'medium' | 'complex'
): string {
  const durations: Record<string, Record<string, string>> = {
    default: {
      simple: '1-2 hours',
      medium: '2-4 hours',
      complex: '4-8 hours',
    },
  };

  return durations[serviceType]?.[complexity] || durations.default[complexity];
}
