import { z } from 'zod';
import { uuidSchema } from './validation';

export const jobPostingSchema = z.object({
  employerId: uuidSchema,
  title: z.string().min(1, 'Job title is required').max(200, 'Job title must be less than 200 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters').max(10000, 'Description must be less than 10000 characters'),
  requirements: z.string().min(10, 'Requirements must be at least 10 characters').max(5000, 'Requirements must be less than 5000 characters'),
  responsibilities: z.string().max(5000, 'Responsibilities must be less than 5000 characters').optional(),
  jobType: z.enum([
    'INTERNSHIP',
    'PART_TIME',
    'HOURLY_PAY',
    'DAILY_PAY',
    'FULL_TIME_1YEAR',
    'FULL_TIME_2YEAR',
    'FULL_TIME_2YEAR_PLUS',
  ], {
    errorMap: () => ({ message: 'Invalid job type' }),
  }),
  country: z.string().min(1, 'Country is required').max(100, 'Country must be less than 100 characters').default('Nepal'),
  province: z.string().min(1, 'Province is required').max(100, 'Province must be less than 100 characters'),
  district: z.string().min(1, 'District is required').max(100, 'District must be less than 100 characters'),
  city: z.string().min(1, 'City is required').max(100, 'City must be less than 100 characters'),
  isRemote: z.boolean().default(false),
  salaryMin: z.number().int().min(0, 'Minimum salary must be positive').max(10000000, 'Salary too high').optional(),
  salaryMax: z.number().int().min(0, 'Maximum salary must be positive').max(10000000, 'Salary too high').optional(),
  salaryType: z.enum(['MONTHLY', 'HOURLY', 'DAILY', 'YEARLY']).optional(),
  contractDuration: z.number().int().min(1, 'Contract duration must be at least 1 month').max(120, 'Contract duration cannot exceed 120 months').optional(),
  requiredSkills: z.record(z.string(), z.number().min(1).max(5)).refine(
    (skills) => Object.keys(skills).length > 0,
    { message: 'At least one required skill must be specified' }
  ),
  experienceYears: z.number().int().min(0, 'Experience years cannot be negative').max(50, 'Experience years cannot exceed 50').optional(),
  educationLevel: z.string().max(200, 'Education level must be less than 200 characters').optional(),
  totalPositions: z.number().int().min(1, 'Total positions must be at least 1').max(1000, 'Total positions cannot exceed 1000').default(1),
  expiresAt: z.string().datetime('Invalid date format').optional(),
  isActive: z.boolean().default(true).optional(),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
}).refine(
  (data) => {
    if (data.salaryMin && data.salaryMax && data.salaryMax < data.salaryMin) {
      return false;
    }
    return true;
  },
  {
    message: 'Maximum salary must be greater than or equal to minimum salary',
    path: ['salaryMax'],
  }
).refine(
  (data) => {
    if (!data.expiresAt) return true;
    return new Date(data.expiresAt) > new Date();
  },
  {
    message: 'Expiration date must be in the future',
    path: ['expiresAt'],
  }
);

export const jobApplicationSchema = z.object({
  jobId: uuidSchema,
  applicantId: uuidSchema,
  coverLetter: z.string().max(5000, 'Cover letter must be less than 5000 characters').optional(),
  portfolioUrl: z.string().url('Invalid URL format').optional(),
});

