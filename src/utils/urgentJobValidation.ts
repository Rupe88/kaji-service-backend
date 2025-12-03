import { z } from 'zod';
import { uuidSchema, requiredPhoneSchema } from './validation';

// Urgent Job Category Enum
export const urgentJobCategoryEnum = z.enum(['HAND_TO_HAND', 'CASH_TO_CASH', 'LABOR', 'OTHER']);

// Urgency Level Enum
export const urgencyLevelEnum = z.enum(['IMMEDIATE', 'TODAY', 'WITHIN_HOURS']);

// Payment Type Enum
export const paymentTypeEnum = z.enum(['CASH', 'DIGITAL', 'BOTH']);

// Application Status Enum
export const applicationStatusEnum = z.enum(['PENDING', 'ACCEPTED', 'REJECTED', 'COMPLETED']);

// Urgent Job Schema
export const urgentJobSchema = z.object({
  posterId: uuidSchema,
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters').max(5000, 'Description must be less than 5000 characters'),
  category: urgentJobCategoryEnum,
  province: z.string().min(1, 'Province is required').max(100, 'Province must be less than 100 characters'),
  district: z.string().min(1, 'District is required').max(100, 'District must be less than 100 characters'),
  city: z.string().min(1, 'City is required').max(100, 'City must be less than 100 characters'),
  ward: z.string().max(10, 'Ward must be less than 10 characters').optional(),
  street: z.string().max(200, 'Street must be less than 200 characters').optional(),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  paymentAmount: z.number().min(0, 'Payment amount must be positive').max(1000000, 'Payment amount too high'),
  paymentType: paymentTypeEnum,
  urgencyLevel: urgencyLevelEnum,
  maxWorkers: z.number().int().min(1, 'At least 1 worker is required').max(100, 'Cannot exceed 100 workers').default(1),
  startTime: z.string().datetime('Invalid start time format'),
  endTime: z.string().datetime('Invalid end time format').optional().nullable(),
  expiresAt: z.string().datetime('Invalid expiration date format').optional().nullable(),
  contactPhone: requiredPhoneSchema,
  contactMethod: z.string().max(100, 'Contact method must be less than 100 characters').optional(),
}).refine(
  (data) => {
    if (data.endTime && data.startTime) {
      const start = new Date(data.startTime);
      const end = new Date(data.endTime);
      return end > start;
    }
    return true;
  },
  {
    message: 'End time must be after start time',
    path: ['endTime'],
  }
).refine(
  (data) => {
    if (data.expiresAt) {
      const expires = new Date(data.expiresAt);
      const now = new Date();
      return expires > now;
    }
    return true;
  },
  {
    message: 'Expiration date must be in the future',
    path: ['expiresAt'],
  }
);

// Urgent Job Application Schema
export const urgentJobApplicationSchema = z.object({
  jobId: uuidSchema,
  applicantId: uuidSchema,
});

// Update Urgent Job Schema (all fields optional except id)
export const updateUrgentJobSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().min(10).max(5000).optional(),
  category: urgentJobCategoryEnum.optional(),
  province: z.string().min(1).max(100).optional(),
  district: z.string().min(1).max(100).optional(),
  city: z.string().min(1).max(100).optional(),
  ward: z.string().max(10).optional(),
  street: z.string().max(200).optional(),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  paymentAmount: z.number().min(0).max(1000000).optional(),
  paymentType: paymentTypeEnum.optional(),
  urgencyLevel: urgencyLevelEnum.optional(),
  maxWorkers: z.number().int().min(1).max(100).optional(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional().nullable(),
  expiresAt: z.string().datetime().optional().nullable(),
  contactPhone: requiredPhoneSchema.optional(),
  contactMethod: z.string().max(100).optional(),
  status: z.enum(['OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
}).refine(
  (data) => {
    if (data.endTime && data.startTime) {
      const start = new Date(data.startTime);
      const end = new Date(data.endTime);
      return end > start;
    }
    return true;
  },
  {
    message: 'End time must be after start time',
    path: ['endTime'],
  }
);

// Rating and Review Schema
export const ratingReviewSchema = z.object({
  rating: z.number().int().min(1, 'Rating must be at least 1').max(5, 'Rating must be at most 5'),
  review: z.string().max(1000, 'Review must be less than 1000 characters').optional(),
});

// Query Parameters Schema for listing urgent jobs
export const urgentJobsQuerySchema = z.object({
  category: urgentJobCategoryEnum.optional(),
  urgencyLevel: urgencyLevelEnum.optional(),
  status: z.enum(['OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
  province: z.string().optional(),
  district: z.string().optional(),
  city: z.string().optional(),
  paymentType: paymentTypeEnum.optional(),
  minPayment: z.string().transform((val) => val ? parseFloat(val) : undefined).optional(),
  maxPayment: z.string().transform((val) => val ? parseFloat(val) : undefined).optional(),
  latitude: z.string().transform((val) => val ? parseFloat(val) : undefined).optional(),
  longitude: z.string().transform((val) => val ? parseFloat(val) : undefined).optional(),
  radius: z.string().transform((val) => val ? parseFloat(val) : undefined).optional(), // in kilometers
  sortBy: z.enum(['newest', 'oldest', 'payment-high', 'payment-low', 'distance', 'urgency']).optional(),
  page: z.string().transform((val) => val ? parseInt(val) : 1).optional(),
  limit: z.string().transform((val) => val ? parseInt(val) : 20).optional(),
});

