import { Decimal } from '@prisma/client/runtime/library';

export interface ProviderDashboardOverview {
  totalServices: number;
  activeServices: number;
  pendingServices: number;
  totalBookings: number;
  activeBookings: number;
  completedBookings: number;
  totalRevenue: Decimal;
  averageRating: number;
}

export interface SeekerDashboardOverview {
  totalDemands: number;
  openDemands: number;
  totalBookings: number;
  activeBookings: number;
  completedBookings: number;
  totalSpent: Decimal;
}

export interface RadarDataPoint {
  id: string;
  title: string;
  location: {
    latitude?: number;
    longitude?: number;
    province: string;
    district: string;
    city: string;
  };
  metrics: {
    bookingCount?: number;
    responseCount?: number;
    viewCount?: number;
    averageRating?: number;
    budgetRange?: {
      min?: Decimal;
      max?: Decimal;
    };
  };
  category?: string;
  urgency?: string;
  demographics?: Record<string, any>;
  geographics?: Record<string, any>;
  standards?: Record<string, any>;
}

export interface ServicePerformance {
  id: string;
  title: string;
  bookingCount: number;
  completionCount: number;
  averageRating?: number;
  customerSatisfactionScore?: number;
  category: {
    name: string;
  };
}

export interface OngoingBooking {
  id: string;
  scheduledDate: Date;
  scheduledTime?: string;
  status: string;
  service: {
    title: string;
    category?: {
      name: string;
    };
    provider?: {
      companyName: string;
      companyPhone?: string;
    };
  };
  customer?: {
    fullName: string;
    phone?: string;
  };
}

