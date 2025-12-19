import { Decimal } from '@prisma/client/runtime/library';

export interface CategoryStatistics {
  categoryId: string;
  categoryName: string;
  totalProviders: number;
  totalSeekers: number;
  totalServices: number;
  activeServices: number;
  totalDemands: number;
  openDemands: number;
  timestamp: string;
}

export interface TrendingServiceData {
  serviceId: string;
  title: string;
  categoryName: string;
  subcategoryName?: string;
  providerName: string;
  trendScore: number;
  bookingGrowth: number;
  viewGrowth: number;
  rating: number;
  averageRating?: number;
  bookingCount: number;
}

export interface TrendingProviderData {
  providerId: string;
  companyName: string;
  businessYears?: number;
  totalServices: number;
  totalBookings: number;
  totalViews: number;
  averageRating: number;
  trendScore: number;
}

export interface TrendingSeekerData {
  seekerId: string;
  fullName: string;
  totalDemands: number;
  totalBookings: number;
  totalResponses: number;
  totalViews: number;
  activeDemands: number;
  trendScore: number;
}

export interface TeacherData {
  userId: string;
  email: string;
  fullName?: string;
  province?: string;
  district?: string;
  qualification?: string;
  fieldOfStudy?: string;
  totalCourses: number;
  totalEnrollments: number;
  courses: Array<{
    id: string;
    title: string;
    enrollmentCount: number;
    rating?: number;
  }>;
}

export interface EntertainerData {
  userId: string;
  email: string;
  name?: string;
  province?: string;
  district?: string;
  totalServices: number;
  services: Array<{
    id: string;
    title: string;
    entertainmentType: string;
    totalBookings: number;
    rating?: number;
  }>;
}

export interface DataInsights {
  categoryPerformance: Array<{
    categoryId: string;
    categoryName: string;
    totalServices: number;
    totalDemands: number;
    averageBookings: number;
    averageRating: number;
  }>;
  geographicDistribution: Array<{
    province: string;
    district: string;
    _count: {
      id: number;
    };
  }>;
  revenue: {
    total: Decimal;
    average: Decimal | null;
    totalBookings: number;
  };
  userGrowth: Array<{
    createdAt: Date;
    _count: {
      id: number;
    };
  }>;
  bookingTrends: Array<{
    createdAt: Date;
    _count: {
      id: number;
    };
  }>;
  timestamp: string;
}

