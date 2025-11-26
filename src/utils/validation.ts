import { z } from 'zod';

// Common validation schemas
export const emailSchema = z.string().email('Invalid email format').toLowerCase().trim();

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(100, 'Password must be less than 100 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

// More flexible phone regex that supports international formats
// Allows: +1234567890, (123) 456-7890, 123-456-7890, 123.456.7890, 1234567890, etc.
export const phoneSchema = z
  .string()
  .regex(/^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,15}$/, 'Invalid phone number format')
  .optional();

// Required phone schema (for fields that must have a phone number)
export const requiredPhoneSchema = z
  .string()
  .min(1, 'Phone number is required')
  .regex(/^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,15}$/, 'Invalid phone number format');

export const uuidSchema = z.string().uuid('Invalid UUID format');

export const otpCodeSchema = z.string().length(6, 'OTP must be exactly 6 digits').regex(/^\d+$/, 'OTP must contain only numbers');

export const nameSchema = z
  .string()
  .min(1, 'Name is required')
  .max(100, 'Name must be less than 100 characters')
  .regex(/^[a-zA-Z0-9\s'.-]+$/, 'Name can only contain letters, numbers, spaces, hyphens, apostrophes, and periods')
  .optional();

// Required name schema (for fields that must have a name)
export const requiredNameSchema = z
  .string()
  .min(1, 'Name is required')
  .max(100, 'Name must be less than 100 characters')
  .regex(/^[a-zA-Z0-9\s'.-]+$/, 'Name can only contain letters, numbers, spaces, hyphens, apostrophes, and periods');

// Validation middleware
import { Request, Response, NextFunction } from 'express';

export const validate = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: error.errors.map((e) => ({
            path: e.path.join('.'),
            message: e.message,
          })),
        });
        return;
      }
      next(error);
    }
  };
};

// Query parameter validation
export const validateQuery = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.query);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          message: 'Invalid query parameters',
          errors: error.errors.map((e) => ({
            path: e.path.join('.'),
            message: e.message,
          })),
        });
        return;
      }
      next(error);
    }
  };
};

// Params validation
export const validateParams = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.params);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Provide more helpful error messages for UUID validation
        const errors = error.errors.map((e) => {
          if (e.message === 'Invalid uuid' || e.message.includes('uuid') || e.message.includes('UUID')) {
            const paramName = e.path.join('.');
            const receivedValue = (req.params as any)[paramName];
            return {
              path: paramName,
              message: `Invalid UUID format for parameter '${paramName}'. Received: '${receivedValue}'. Expected format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`,
            };
          }
          return {
            path: e.path.join('.'),
            message: e.message,
          };
        });
        
        res.status(400).json({
          success: false,
          message: 'Invalid URL parameters',
          errors,
        });
        return;
      }
      next(error);
    }
  };
};

