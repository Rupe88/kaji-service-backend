import { z } from 'zod';

export const createReviewSchema = z.object({
  bookingId: z.string().uuid('Invalid booking ID'),
  rating: z.number().int().min(1).max(5, 'Rating must be between 1 and 5'),
  review: z.string().min(10, 'Review must be at least 10 characters').max(2000).optional(),
  qualityRating: z.number().int().min(1).max(5).optional(),
  timelinessRating: z.number().int().min(1).max(5).optional(),
  communicationRating: z.number().int().min(1).max(5).optional(),
  valueRating: z.number().int().min(1).max(5).optional(),
  images: z.array(z.string().url()).max(5).optional(),
});

export const updateReviewSchema = z.object({
  rating: z.number().int().min(1).max(5).optional(),
  review: z.string().min(10).max(2000).optional(),
  qualityRating: z.number().int().min(1).max(5).optional(),
  timelinessRating: z.number().int().min(1).max(5).optional(),
  communicationRating: z.number().int().min(1).max(5).optional(),
  valueRating: z.number().int().min(1).max(5).optional(),
  images: z.array(z.string().url()).max(5).optional(),
});

export const providerResponseSchema = z.object({
  response: z.string().min(10, 'Response must be at least 10 characters').max(1000),
});

export const reviewQuerySchema = z.object({
  serviceId: z.string().uuid().optional(),
  customerId: z.string().uuid().optional(),
  minRating: z.coerce.number().int().min(1).max(5).optional(),
  maxRating: z.coerce.number().int().min(1).max(5).optional(),
  hasResponse: z.coerce.boolean().optional(),
  isVerified: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20).optional(),
  sortBy: z.enum(['newest', 'oldest', 'highest', 'lowest', 'most_helpful']).default('newest').optional(),
});

export type CreateReviewInput = z.infer<typeof createReviewSchema>;
export type UpdateReviewInput = z.infer<typeof updateReviewSchema>;
export type ProviderResponseInput = z.infer<typeof providerResponseSchema>;
export type ReviewQueryInput = z.infer<typeof reviewQuerySchema>;

