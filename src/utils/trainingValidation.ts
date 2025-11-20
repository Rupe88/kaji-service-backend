import { z } from 'zod';
import { uuidSchema } from './validation';

export const trainingCourseSchema = z.object({
  providerId: uuidSchema,
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters').max(5000, 'Description must be less than 5000 characters'),
  category: z.string().min(1, 'Category is required').max(100, 'Category must be less than 100 characters'),
  duration: z.number().int().min(1, 'Duration must be at least 1 hour').max(1000, 'Duration cannot exceed 1000 hours'),
  mode: z.enum(['PHYSICAL', 'ONLINE', 'HYBRID'], {
    errorMap: () => ({ message: 'Invalid training mode' }),
  }),
  price: z.number().min(0, 'Price cannot be negative').max(1000000, 'Price too high'),
  isFree: z.boolean().default(false),
  syllabus: z.array(z.string()).optional(),
  prerequisites: z.array(z.string()).optional(),
  learningOutcomes: z.array(z.string()).optional(),
  readingMaterials: z.array(z.string().url('Invalid URL format')).optional(),
  videoMaterials: z.array(z.string().url('Invalid URL format')).optional(),
  startDate: z.string().datetime('Invalid date format').optional(),
  endDate: z.string().datetime('Invalid date format').optional(),
  seats: z.number().int().min(1, 'Seats must be at least 1').max(10000, 'Seats cannot exceed 10000').optional(),
}).refine(
  (data) => {
    if (!data.startDate) return true;
    return new Date(data.startDate) >= new Date();
  },
  {
    message: 'Start date must be in the future',
    path: ['startDate'],
  }
).refine(
  (data) => {
    if (!data.endDate || !data.startDate) return true;
    return new Date(data.endDate) >= new Date(data.startDate);
  },
  {
    message: 'End date must be after start date',
    path: ['endDate'],
  }
);

export const enrollmentSchema = z.object({
  courseId: uuidSchema,
  userId: uuidSchema,
});

// Update schema (all fields optional except validations)
export const updateTrainingCourseSchema = z.object({
  providerId: uuidSchema.optional(),
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters').optional(),
  description: z.string().min(10, 'Description must be at least 10 characters').max(5000, 'Description must be less than 5000 characters').optional(),
  category: z.string().min(1, 'Category is required').max(100, 'Category must be less than 100 characters').optional(),
  duration: z.number().int().min(1, 'Duration must be at least 1 hour').max(1000, 'Duration cannot exceed 1000 hours').optional(),
  mode: z.enum(['PHYSICAL', 'ONLINE', 'HYBRID'], {
    errorMap: () => ({ message: 'Invalid training mode' }),
  }).optional(),
  price: z.number().min(0, 'Price cannot be negative').max(1000000, 'Price too high').optional(),
  isFree: z.boolean().default(false).optional(),
  syllabus: z.array(z.string()).optional(),
  prerequisites: z.array(z.string()).optional(),
  learningOutcomes: z.array(z.string()).optional(),
  readingMaterials: z.array(z.string().url('Invalid URL format')).optional(),
  videoMaterials: z.array(z.string().url('Invalid URL format')).optional(),
  startDate: z.string().datetime('Invalid date format').optional(),
  endDate: z.string().datetime('Invalid date format').optional(),
  seats: z.number().int().min(1, 'Seats must be at least 1').max(10000, 'Seats cannot exceed 10000').optional(),
}).refine(
  (data) => {
    if (!data.startDate) return true;
    return new Date(data.startDate) >= new Date();
  },
  {
    message: 'Start date must be in the future',
    path: ['startDate'],
  }
).refine(
  (data) => {
    if (!data.endDate || !data.startDate) return true;
    return new Date(data.endDate) >= new Date(data.startDate);
  },
  {
    message: 'End date must be after start date',
    path: ['endDate'],
  }
);

export const updateEnrollmentSchema = z.object({
  progress: z.number().int().min(0, 'Progress cannot be negative').max(100, 'Progress cannot exceed 100%').optional(),
  practiceHours: z.number().int().min(0, 'Practice hours cannot be negative').optional(),
  practiceVideos: z.array(z.string().url('Invalid URL format')).optional(),
  practicePhotos: z.array(z.string().url('Invalid URL format')).optional(),
  status: z.enum(['ENROLLED', 'IN_PROGRESS', 'COMPLETED', 'DROPPED']).optional(),
});

