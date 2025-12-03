import { z } from 'zod';
import { emailSchema, requiredNameSchema, requiredPhoneSchema } from './validation';

// Individual KYC Validation Schema
export const individualKYCSchema = z.object({
  userId: z.string().uuid('Invalid user ID format'),
  fullName: z.string().min(1, 'Full name is required').max(200, 'Full name must be less than 200 characters').regex(/^[a-zA-Z\s'-]+$/, 'Full name should only contain letters, spaces, hyphens, and apostrophes'),
  gender: z.enum(['Male', 'Female', 'Other', 'Prefer not to say'], {
    errorMap: () => ({ message: 'Invalid gender selection' }),
  }),
  pronouns: z.string().max(50, 'Pronouns must be less than 50 characters').optional(),
  dateOfBirth: z.string().datetime('Invalid date format').refine(
    (date) => {
      const birthDate = new Date(date);
      // Check if date is valid
      if (isNaN(birthDate.getTime())) {
        return false;
      }
      // Check if date is in the past
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (birthDate >= today) {
        return false;
      }
      // Calculate age
      const age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      const actualAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate()) ? age - 1 : age;
      return actualAge >= 16 && actualAge <= 100;
    },
    { message: 'Date of birth must be a valid past date and age must be between 16 and 100 years' }
  ),
  nationalId: z.string().min(1, 'Citizenship number is required').max(50, 'Citizenship number must be less than 50 characters').regex(/^[0-9/-]+$/, 'Citizenship number should only contain numbers, hyphens, and slashes'),
  passportNumber: z.string().max(50, 'Passport number must be less than 50 characters').regex(/^[A-Za-z0-9]+$/, 'Passport number should only contain letters and numbers').transform((val) => val ? val.toUpperCase() : val).optional().or(z.literal('')),
  country: z.string().min(1, 'Country is required').max(100, 'Country must be less than 100 characters').default('Nepal'),
  province: z.string().min(1, 'Province is required').max(100, 'Province must be less than 100 characters'),
  district: z.string().min(1, 'District is required').max(100, 'District must be less than 100 characters'),
  municipality: z.string().min(1, 'Municipality is required').max(100, 'Municipality must be less than 100 characters'),
  ward: z.string().min(1, 'Ward is required').max(10, 'Ward must be less than 10 characters').regex(/^[0-9]+$/, 'Ward should only contain numbers'),
  street: z.string().max(200, 'Street must be less than 200 characters').optional(),
  city: z.string().max(100, 'City must be less than 100 characters').optional(),
  email: emailSchema,
  phone: z.string().min(1, 'Phone number is required').regex(/^[0-9+\-\s()]+$/, 'Phone number should only contain numbers, spaces, hyphens, parentheses, and plus sign').refine((val) => {
    const digitsOnly = val.replace(/\D/g, '');
    return digitsOnly.length >= 10 && digitsOnly.length <= 15;
  }, { message: 'Phone number must contain 10-15 digits' }),
  emergencyContact: z.string().min(1, 'Emergency contact is required').regex(/^[0-9+\-\s()]+$/, 'Emergency contact should only contain numbers, spaces, hyphens, parentheses, and plus sign').refine((val) => {
    const digitsOnly = val.replace(/\D/g, '');
    return digitsOnly.length >= 10 && digitsOnly.length <= 15;
  }, { message: 'Emergency contact must contain 10-15 digits' }),
  highestQualification: z.string().min(1, 'Highest qualification is required').max(200, 'Qualification must be less than 200 characters'),
  fieldOfStudy: z.string().min(1, 'Field of study is required').max(200, 'Field of study must be less than 200 characters'),
  schoolUniversity: z.string().max(200, 'School/University must be less than 200 characters').optional(),
  languagesKnown: z.array(z.string()).min(1, 'At least one language is required'),
  externalCertifications: z.array(z.object({
    name: z.string(),
    issuer: z.string(),
    date: z.string().optional(),
    url: z.string().url().optional(),
  })).optional(),
  employmentStatus: z.enum([
    'INTERNSHIP',
    'PART_TIME',
    'HOURLY_PAY',
    'PROBATION',
    'FULLY_EMPLOYED',
    'LOOKING_CHANGE',
    'LOOKING_NEW',
    'PARTNERSHIP_SEEKING',
    'PARTNERSHIP_AND_JOB',
  ]),
  experience: z.array(z.object({
    company: z.string(),
    position: z.string(),
    startDate: z.string(),
    endDate: z.string().optional(),
    description: z.string().optional(),
    years: z.number().min(0).max(50).optional(),
  })).optional(),
  expectedSalaryMin: z.number().int().min(0, 'Minimum salary must be positive').max(10000000, 'Salary too high').optional(),
  expectedSalaryMax: z.number().int().min(0, 'Maximum salary must be positive').max(10000000, 'Salary too high').optional(),
  willingRelocate: z.boolean().default(false),
  technicalSkills: z.record(z.string(), z.number().min(1).max(5)).optional(),
  softSkills: z.array(z.string()).optional(),
  physicalSkills: z.array(z.string()).optional(),
  interestDomains: z.array(z.string()).optional(),
  workStylePrefs: z.record(z.string(), z.any()).optional(),
  psychometricData: z.record(z.string(), z.any()).optional(),
  motivationTriggers: z.array(z.string()).optional(),
  learningPrefs: z.record(z.string(), z.any()).optional(),
  trainingWillingness: z.number().int().min(1).max(5).optional(),
  availableHoursWeek: z.number().int().min(1).max(168, 'Hours per week cannot exceed 168').optional(),
  careerGoals: z.string().max(5000, 'Career goals must be less than 5000 characters').optional(),
  areasImprovement: z.array(z.string()).optional(),
  digitalLiteracy: z.enum(['Beginner', 'Intermediate', 'Advanced', 'Expert']).optional(),
  preferredIndustry: z.string().max(200, 'Preferred industry must be less than 200 characters').optional(),
  references: z.array(z.object({
    name: z.string(),
    relationship: z.string(),
    contact: z.string(),
    email: emailSchema.optional(),
  })).optional(),
  portfolioUrls: z.array(z.string().url('Invalid URL format')).optional(),
  videoIntroUrl: z.string().url('Invalid URL format').optional(),
  socialMediaUrls: z.record(z.string(), z.string().url('Invalid URL format')).optional(),
  consentGiven: z.boolean().refine((val) => val === true, {
    message: 'You must give consent to proceed',
  }),
}).refine(
  (data) => {
    if (data.expectedSalaryMin && data.expectedSalaryMax && data.expectedSalaryMax < data.expectedSalaryMin) {
      return false;
    }
    return true;
  },
  {
    message: 'Maximum salary must be greater than or equal to minimum salary',
    path: ['expectedSalaryMax'],
  }
);

// Industrial KYC Validation Schema
export const industrialKYCSchema = z.object({
  userId: z.string().uuid('Invalid user ID format'),
  companyName: z.string().min(1, 'Company name is required').max(200, 'Company name must be less than 200 characters'),
  companyEmail: emailSchema,
  companyPhone: z.string().min(1, 'Company phone is required').regex(/^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,15}$|^[0-9]{10,15}$/, 'Invalid phone number format. Use format: +1234567890, (123) 456-7890, or 1234567890'),
  registrationNumber: z.string().max(100, 'Registration number must be less than 100 characters').optional(),
  yearsInBusiness: z.number().int().min(0, 'Years in business cannot be negative').max(200, 'Invalid years in business').optional(),
  companySize: z.enum(['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+']).optional(),
  industrySector: z.string().max(200, 'Industry sector must be less than 200 characters').optional(),
  country: z.string().min(1, 'Country is required').max(100, 'Country must be less than 100 characters').default('Nepal'),
  province: z.string().min(1, 'Province is required').max(100, 'Province must be less than 100 characters'),
  district: z.string().min(1, 'District is required').max(100, 'District must be less than 100 characters'),
  municipality: z.string().min(1, 'Municipality is required').max(100, 'Municipality must be less than 100 characters'),
  ward: z.string().min(1, 'Ward is required').max(10, 'Ward must be less than 10 characters').regex(/^[0-9]+$/, 'Ward should only contain numbers'),
  street: z.string().max(200, 'Street must be less than 200 characters').optional(),
  contactPersonName: requiredNameSchema,
  contactPersonDesignation: z.string().max(100, 'Designation must be less than 100 characters').optional(),
  contactPersonPhone: requiredPhoneSchema,
});

