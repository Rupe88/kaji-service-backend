import { z } from 'zod';

export const feedbackSchema = z.object({
  type: z.enum(['BUG_REPORT', 'FEATURE_REQUEST', 'GENERAL_FEEDBACK', 'COMPLAINT', 'SUGGESTION']),
  category: z.enum(['UI_UX', 'FUNCTIONALITY', 'PERFORMANCE', 'SECURITY', 'CONTENT', 'OTHER']),
  title: z.string().min(5, 'Title must be at least 5 characters').max(200, 'Title must be less than 200 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters').max(5000, 'Description must be less than 5000 characters'),
  rating: z.number().int().min(1).max(5).optional(),
});

export const updateFeedbackStatusSchema = z.object({
  status: z.enum(['PENDING', 'REVIEWED', 'IN_PROGRESS', 'RESOLVED', 'REJECTED']),
  adminNotes: z.string().max(2000).optional(),
});

