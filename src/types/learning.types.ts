import { z } from 'zod';

// Course Types
export const createCourseSchema = z.object({
  serviceId: z.string().uuid().optional(),
  title: z.string().min(5).max(200),
  description: z.string().min(20),
  detailedDescription: z.string().optional(),
  category: z.string().optional(),
  subject: z.string().optional(),
  level: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']).optional(),
  duration: z.string().optional(),
  price: z.number().min(0).optional(),
  priceType: z.enum(['FIXED', 'MONTHLY', 'PER_SESSION']).optional(),
  maxStudents: z.number().int().min(1).optional(),
  minStudents: z.number().int().min(1).default(1).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  schedule: z.record(z.any()).optional(),
  publicResourceLinks: z.array(z.string().url()).optional(),
  images: z.array(z.string().url()).optional(),
  videos: z.array(z.string().url()).optional(),
});

export const updateCourseSchema = createCourseSchema.partial();

export const createLearningMaterialSchema = z.object({
  courseId: z.string().uuid().optional(),
  title: z.string().min(3).max(200),
  description: z.string().optional(),
  type: z.enum(['PDF', 'VIDEO', 'LINK', 'DOCUMENT', 'AUDIO']),
  fileUrl: z.string().url().optional(),
  content: z.string().optional(),
  accessLevel: z.enum(['PUBLIC', 'ENROLLED', 'PAID']).default('ENROLLED'),
  order: z.number().int().min(0).default(0).optional(),
});

export const createPublicResourceSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().optional(),
  category: z.string().optional(),
  subject: z.string().optional(),
  resourceType: z.enum(['LINK', 'PDF', 'VIDEO', 'ARTICLE']),
  url: z.string().url(),
  thumbnailUrl: z.string().url().optional(),
});

export const createClassBookingSchema = z.object({
  courseId: z.string().uuid(),
  classDate: z.string().datetime(),
  classTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  duration: z.string().optional(),
  location: z.string().optional(),
  isOnline: z.boolean().default(false),
  meetingLink: z.string().url().optional(),
  notes: z.string().optional(),
});

export type CreateCourseInput = z.infer<typeof createCourseSchema>;
export type UpdateCourseInput = z.infer<typeof updateCourseSchema>;
export type CreateLearningMaterialInput = z.infer<typeof createLearningMaterialSchema>;
export type CreatePublicResourceInput = z.infer<typeof createPublicResourceSchema>;
export type CreateClassBookingInput = z.infer<typeof createClassBookingSchema>;

