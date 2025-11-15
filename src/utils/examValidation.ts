import { z } from 'zod';
import { uuidSchema } from './validation';

export const examSchema = z.object({
  courseId: uuidSchema.optional(),
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters').max(5000, 'Description must be less than 5000 characters'),
  category: z.string().min(1, 'Category is required').max(100, 'Category must be less than 100 characters'),
  mode: z.enum(['PHYSICAL', 'ONLINE', 'HYBRID'], {
    errorMap: () => ({ message: 'Invalid exam mode' }),
  }),
  duration: z.number().int().min(1, 'Duration must be at least 1 minute').max(1440, 'Duration cannot exceed 1440 minutes (24 hours)'),
  passingScore: z.number().int().min(0, 'Passing score cannot be negative').max(100, 'Passing score cannot exceed 100'),
  totalMarks: z.number().int().min(1, 'Total marks must be at least 1').max(10000, 'Total marks cannot exceed 10000'),
  examFee: z.number().min(0, 'Exam fee cannot be negative').max(100000, 'Exam fee too high'),
}).refine(
  (data) => data.passingScore <= data.totalMarks,
  {
    message: 'Passing score cannot exceed total marks',
    path: ['passingScore'],
  }
);

export const examBookingSchema = z.object({
  examId: uuidSchema,
  userId: uuidSchema,
  examDate: z.string().datetime('Invalid date format').refine(
    (date) => new Date(date) >= new Date(),
    { message: 'Exam date must be in the future' }
  ),
  interviewDate: z.string().datetime('Invalid date format').optional(),
}).refine(
  (data) => {
    if (!data.interviewDate || !data.examDate) return true;
    return new Date(data.interviewDate) >= new Date(data.examDate);
  },
  {
    message: 'Interview date must be after exam date',
    path: ['interviewDate'],
  }
);

export const updateExamBookingSchema = z.object({
  status: z.enum(['SCHEDULED', 'COMPLETED', 'PASSED', 'FAILED', 'RETOTALING_REQUESTED', 'RETOTALING_COMPLETED']).optional(),
  score: z.number().int().min(0, 'Score cannot be negative').max(10000, 'Score too high').optional(),
  examVideos: z.array(z.string().url('Invalid URL format')).optional(),
  examPhotos: z.array(z.string().url('Invalid URL format')).optional(),
  interviewVideos: z.array(z.string().url('Invalid URL format')).optional(),
  interviewPhotos: z.array(z.string().url('Invalid URL format')).optional(),
});

