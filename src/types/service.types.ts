import { z } from 'zod';
import { Decimal } from '@prisma/client/runtime/library';

export const ServiceCategoryData = {
  PERSONAL_CARE: {
    name: 'Personal Care Services',
    subcategories: ['Haircut', 'Spa', 'Massage', 'Salon'],
  },
  BEAUTY_GROOMING: {
    name: 'Beauty & Grooming',
    subcategories: ['Makeup', 'Nail Art', 'Hair Styling', 'Skin Care'],
  },
  HEALTH_MEDICAL: {
    name: 'Health & Medical',
    subcategories: ['Doctor', 'Physiotherapy', 'Nursing', 'Lab Tests'],
  },
  EDUCATION_TUTORING: {
    name: 'Education & Tutoring',
    subcategories: [
      'School Tutor',
      'Language Teacher',
      'Music Teacher',
      'Online Classes',
    ],
  },
  TRAINING_COACHING: {
    name: 'Training & Coaching',
    subcategories: [
      'Fitness Coach',
      'Life Coach',
      'Career Counseling',
      'Business Coach',
    ],
  },
  HOUSEHOLD_SERVICES: {
    name: 'Household Services',
    subcategories: ['House Cleaning', 'Cooking', 'Laundry', 'Pest Control'],
  },
  CHILD_ELDER_CARE: {
    name: 'Child & Elder Care',
    subcategories: ['Babysitting', 'Elderly Support', 'Nanny', 'Caretaker'],
  },
  TECHNICAL_REPAIR: {
    name: 'Technical Repair',
    subcategories: ['Electrician', 'Plumber', 'AC Repair', 'Appliance Repair'],
  },
  CONSTRUCTION: {
    name: 'Construction & Renovation',
    subcategories: ['Painting', 'Carpentry', 'Masonry', 'Interior Design'],
  },
  AUTOMOTIVE: {
    name: 'Automotive Services',
    subcategories: ['Mechanic', 'Bike Repair', 'Car Wash', 'Towing'],
  },
  IT_DIGITAL: {
    name: 'IT & Digital Services',
    subcategories: [
      'App Development',
      'Web Design',
      'Cybersecurity',
      'IT Support',
    ],
  },
  CREATIVE_MEDIA: {
    name: 'Creative & Media',
    subcategories: [
      'Photography',
      'Video Editing',
      'Graphic Design',
      'Content Writing',
    ],
  },
  MARKETING_BRANDING: {
    name: 'Marketing & Branding',
    subcategories: [
      'SEO',
      'Social Media Ads',
      'Brand Strategy',
      'Digital Marketing',
    ],
  },
  FINANCIAL_ACCOUNTING: {
    name: 'Financial & Accounting',
    subcategories: ['Tax Filing', 'Bookkeeping', 'Audit', 'Financial Planning'],
  },
  LEGAL_COMPLIANCE: {
    name: 'Legal & Compliance',
    subcategories: [
      'Lawyer',
      'Document Preparation',
      'Legal Consulting',
      'Notary',
    ],
  },
  BUSINESS_SUPPORT: {
    name: 'Business Support',
    subcategories: [
      'HR Outsourcing',
      'Data Entry',
      'Virtual Assistant',
      'Call Center',
    ],
  },
  HOSPITALITY_TOURISM: {
    name: 'Hospitality & Tourism',
    subcategories: ['Hotels', 'Travel Guide', 'Tour Operator', 'Restaurant'],
  },
  TRANSPORT_DELIVERY: {
    name: 'Transport & Delivery',
    subcategories: ['Taxi', 'Parcel Delivery', 'Moving Services', 'Courier'],
  },
  EVENT_ENTERTAINMENT: {
    name: 'Event & Entertainment',
    subcategories: ['Wedding Planning', 'DJ', 'Catering', 'Decoration'],
  },
  AGRICULTURE_HANDYMAN: {
    name: 'Agriculture & Handyman Services',
    subcategories: [
      'Farming Help',
      'Gardening',
      'Landscaping',
      'General Handyman',
    ],
  },
};

// ============= Validation Schemas =============

// Service Creation Schema
// Extract a base object schema so we can call `.partial()` on the ZodObject
export const createServiceBaseSchema = z.object({
  categoryId: z.string().min(1, 'Category is required'),
  subcategoryId: z.string().optional(),
  title: z.string().min(5, 'Title must be at least 5 characters').max(200),
  description: z.string().min(20, 'Description must be at least 20 characters'),
  detailedDescription: z.string().optional(),
  specifications: z.record(z.any()).optional(),
  standards: z.record(z.any()).optional(),
  demographics: z.record(z.any()).optional(),
  geographics: z.record(z.any()).optional(),

  priceType: z.enum([
    'FIXED',
    'HOURLY',
    'DAILY',
    'MONTHLY',
    'PROJECT_BASED',
    'NEGOTIABLE',
  ]),
  priceMin: z.number().min(0).optional(),
  priceMax: z.number().min(0).optional(),
  hourlyRate: z.number().min(0).optional(),
  dailyRate: z.number().min(0).optional(),
  monthlyRate: z.number().min(0).optional(),
  projectBased: z.boolean().optional(),
  negotiable: z.boolean().optional(),

  province: z.string().min(1, 'Province is required'),
  district: z.string().min(1, 'District is required'),
  city: z.string().min(1, 'City is required'),
  serviceRadius: z.number().min(0).max(500).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),

  availabilityType: z.enum(['IMMEDIATE', 'SCHEDULED', 'FLEXIBLE']),
  availableFrom: z.string().datetime().optional(),
  availableTo: z.string().datetime().optional(),
  workingHours: z.record(z.any()).optional(),

  images: z.array(z.string().url()).max(10).optional(),
  videos: z.array(z.string().url()).max(5).optional(),
  portfolioUrls: z.array(z.string().url()).max(10).optional(),
  socialLinks: z.record(z.string().url()).optional(),

  certifications: z.array(z.record(z.any())).optional(),
  documents: z.array(z.string().url()).optional(),

  businessYears: z.number().int().min(0).max(100).optional(),
  teamSize: z.number().int().min(1).optional(),
  
  // New fields for enhanced service creation
  eventType: z.string().optional(), // Event type for event-based services
  statement: z.string().max(1000).optional(), // Service statement
  contractualTerms: z.record(z.any()).optional(), // Contractual terms JSON
  affiliateProgram: z.boolean().optional(), // Affiliate program enrollment
  customerSatisfactionScore: z.number().min(0).max(5).optional(), // Customer satisfaction score
});

// The public create schema includes a refinement (effect). Keep that as the
// exported createServiceSchema, but use the base schema for `.partial()`.
export const createServiceSchema = createServiceBaseSchema.refine(
  (data) => {
    if (data.priceMin && data.priceMax) {
      return data.priceMin <= data.priceMax;
    }
    return true;
  },
  {
    message: 'Minimum price cannot be greater than maximum price',
    path: ['priceMax'],
  }
);

// Service Update Schema - partial of the base schema (ZodObject)
export const updateServiceSchema = createServiceBaseSchema.partial();

// Service Demand Creation Schema
export const createServiceDemandSchema = z
  .object({
    categoryId: z.string().uuid(),
    subcategoryId: z.string().uuid().optional(),
    title: z.string().min(5).max(200),
    description: z.string().min(20),
    detailedDescription: z.string().optional(),
    specifications: z.record(z.any()).optional(),
    standards: z.record(z.any()).optional(),
    demographics: z.record(z.any()).optional(),
    geographics: z.record(z.any()).optional(),

    budgetMin: z.number().min(0).optional(),
    budgetMax: z.number().min(0).optional(),
    paymentType: z.enum([
      'CONTRACTUAL',
      'HOURLY',
      'MONTHLY',
      'THEKKA_PATTA',
      'PROJECT_BASED',
      'SUBCONTRACT',
    ]),
    budgetNegotiable: z.boolean().optional(),

    province: z.string().min(1),
    district: z.string().min(1),
    city: z.string().min(1),
    preferredRadius: z.number().min(0).max(500).optional(),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),

    urgency: z.enum(['IMMEDIATE', 'WITHIN_WEEK', 'WITHIN_MONTH', 'FLEXIBLE']),
    requiredBy: z.string().datetime().optional(),
    duration: z.string().optional(),

    certificationRequired: z.boolean().optional(),
    experienceRequired: z.number().int().min(0).max(50).optional(),
    preferredProviders: z.array(z.string().uuid()).optional(),

    images: z.array(z.string().url()).max(10).optional(),
    documents: z.array(z.string().url()).max(5).optional(),
    referenceLinks: z.array(z.string().url()).max(5).optional(),

    expiresAt: z.string().datetime().optional(),
  })
  .refine(
    (data) => {
      if (data.budgetMin && data.budgetMax) {
        return data.budgetMin <= data.budgetMax;
      }
      return true;
    },
    {
      message: 'Minimum budget cannot be greater than maximum budget',
      path: ['budgetMax'],
    }
  );

// Service Demand Response Schema
export const createDemandResponseSchema = z.object({
  demandId: z.string().uuid(),
  message: z.string().min(20).max(1000),
  quotedPrice: z.number().min(0).optional(),
  timeline: z.string().max(200).optional(),
});

// Service Booking Schema
export const createBookingSchema = z.object({
  serviceId: z.string().uuid(),
  scheduledDate: z.string().datetime(),
  scheduledTime: z
    .string()
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .optional(),
  duration: z.string().optional(),
  agreedPrice: z.number().min(0),
  paymentMethod: z.enum(['CASH', 'ONLINE_BANKING', 'DIGITAL_WALLET', 'CARD', 'WIRE_TRANSFER']),
  serviceLocation: z.string().min(5),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  customerNotes: z.string().max(500).optional(),
  // New fields for enhanced booking
  eventDetails: z.record(z.any()).optional(), // Event details JSON (date, time, location, event type)
  statement: z.string().max(1000).optional(), // Booking statement
  contractualTerms: z.record(z.any()).optional(), // Contractual terms JSON
  wireTransferDetails: z.record(z.any()).optional(), // Wire transfer details JSON
});

// Service Review Schema
export const createReviewSchema = z.object({
  bookingId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  review: z.string().min(10).max(1000).optional(),
  qualityRating: z.number().int().min(1).max(5).optional(),
  timelinessRating: z.number().int().min(1).max(5).optional(),
  communicationRating: z.number().int().min(1).max(5).optional(),
  valueRating: z.number().int().min(1).max(5).optional(),
  images: z.array(z.string().url()).max(5).optional(),
});

// Service Report Schema
export const createReportSchema = z.object({
  serviceId: z.string().uuid(),
  reason: z.enum([
    'FRAUD',
    'INAPPROPRIATE',
    'POOR_QUALITY',
    'NO_SHOW',
    'HARASSMENT',
    'OTHER',
  ]),
  description: z.string().min(20).max(1000),
  evidence: z.array(z.string().url()).max(10).optional(),
});

// Search/Filter Schemas
export const serviceSearchSchema = z.object({
  categoryId: z.string().uuid().optional(),
  subcategoryId: z.string().uuid().optional(),
  province: z.string().optional(),
  district: z.string().optional(),
  city: z.string().optional(),
  priceMin: z.number().min(0).optional(),
  priceMax: z.number().min(0).optional(),
  priceType: z
    .enum([
      'FIXED',
      'HOURLY',
      'DAILY',
      'MONTHLY',
      'PROJECT_BASED',
      'NEGOTIABLE',
    ])
    .optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  maxDistance: z.number().min(0).max(500).optional(),
  minRating: z.number().min(0).max(5).optional(),
  isVerified: z.boolean().optional(),
  availabilityType: z.enum(['IMMEDIATE', 'SCHEDULED', 'FLEXIBLE']).optional(),
  // Enhanced filters
  listingDate: z.string().datetime().optional(), // Filter by listing date
  bestTrading: z.boolean().optional(), // Services with most bookings
  popularity: z.boolean().optional(), // Services with most views
  customerSatisfaction: z.number().min(0).max(5).optional(), // Filter by customer satisfaction score
  affiliate: z.boolean().optional(), // Filter affiliate program services
  businessYears: z.number().int().min(0).optional(), // Minimum business years
  standards: z.record(z.any()).optional(), // Filter by standards JSON
  demographics: z.record(z.any()).optional(), // Filter by demographics JSON
  geographics: z.record(z.any()).optional(), // Filter by geographics JSON
  sortBy: z
    .enum([
      'rating',
      'price',
      'distance',
      'popularity',
      'newest',
      'satisfaction',
      'bookings', // Sort by booking count
      'listingDate', // Sort by listing date
      'businessYears', // Sort by business years
    ])
    .optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

export const demandSearchSchema = z.object({
  categoryId: z.string().uuid().optional(),
  subcategoryId: z.string().uuid().optional(),
  province: z.string().optional(),
  district: z.string().optional(),
  budgetMin: z.number().min(0).optional(),
  budgetMax: z.number().min(0).optional(),
  urgency: z
    .enum(['IMMEDIATE', 'WITHIN_WEEK', 'WITHIN_MONTH', 'FLEXIBLE'])
    .optional(),
  status: z
    .enum(['OPEN', 'IN_PROGRESS', 'FULFILLED', 'CANCELLED', 'EXPIRED'])
    .optional(),
  certificationRequired: z.boolean().optional(),
  experienceRequired: z.number().int().min(0).optional(),
  sortBy: z.enum(['budget', 'urgency', 'newest', 'responses']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

// ============= TypeScript Types =============

export type CreateServiceInput = z.infer<typeof createServiceSchema>;
export type UpdateServiceInput = z.infer<typeof updateServiceSchema>;
export type CreateServiceDemandInput = z.infer<
  typeof createServiceDemandSchema
>;
export type CreateDemandResponseInput = z.infer<
  typeof createDemandResponseSchema
>;
export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type CreateReviewInput = z.infer<typeof createReviewSchema>;
export type CreateReportInput = z.infer<typeof createReportSchema>;
export type ServiceSearchInput = z.infer<typeof serviceSearchSchema>;
export type DemandSearchInput = z.infer<typeof demandSearchSchema>;

// Response Types
export interface ServiceWithProvider {
  id: string;
  title: string;
  description: string;
  categoryId: string;
  subcategoryId?: string;
  priceType: string;
  priceMin?: Decimal;
  priceMax?: Decimal;
  province: string;
  district: string;
  city: string;
  averageRating?: number;
  totalReviews: number;
  viewCount: number;
  bookingCount: number;
  isVerified: boolean;
  images?: any;
  provider: {
    companyName: string;
    businessYears?: number;
  };
  category: {
    name: string;
  };
  subcategory?: {
    name: string;
  };
}

export interface DemandWithSeeker {
  id: string;
  title: string;
  description: string;
  categoryId: string;
  urgency: string;
  budgetMin?: Decimal;
  budgetMax?: Decimal;
  province: string;
  district: string;
  status: string;
  responseCount: number;
  seeker: {
    fullName: string;
  };
  category: {
    name: string;
  };
}

export interface BookingWithDetails {
  id: string;
  scheduledDate: Date;
  agreedPrice: Decimal;
  status: string;
  paymentStatus: string;
  service: {
    title: string;
    provider: {
      companyName: string;
    };
  };
  customer: {
    fullName: string;
  };
}

export interface TrendingServiceData {
  serviceId: string;
  title: string;
  categoryName: string;
  trendScore: number;
  bookingGrowth: number;
  averageRating: number;
  totalBookings: number;
}

export interface CategoryStatistics {
  categoryId: string;
  categoryName: string;
  totalServices: number;
  activeServices: number;
  totalDemands: number;
  totalBookings: number;
  averageRating: number;
  totalProviders: number;
}

export interface DashboardStats {
  totalServices: number;
  activeServices: number;
  totalDemands: number;
  openDemands: number;
  totalBookings: number;
  completedBookings: number;
  totalProviders: number;
  activeProviders: number;
  totalCustomers: number;
  totalRevenue: Decimal;
  averageRating: number;
  categoryBreakdown: CategoryStatistics[];
  trendingServices: TrendingServiceData[];
}
