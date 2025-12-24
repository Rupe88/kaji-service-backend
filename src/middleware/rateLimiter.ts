import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { serverConfig } from '../config/env';

/**
 * Global rate limiter for all API endpoints
 * Limits: 100 requests per 15 minutes per IP
 */
export const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req: Request, res: Response) => {
    const resetTime = (req as any).rateLimit?.resetTime || Date.now() + 15 * 60 * 1000;
    res.status(429).json({
      success: false,
      message: 'Too many requests from this IP, please try again later.',
      retryAfter: Math.ceil((resetTime - Date.now()) / 1000),
    });
  },
  // Skip rate limiting for OPTIONS requests (CORS preflight) and test environment
  skip: (req: Request) => {
    return req.method === 'OPTIONS' || serverConfig.nodeEnv === 'test';
  },
});

/**
 * Stricter rate limiter for authentication endpoints
 * Limits: 5 requests per 15 minutes per IP
 * Skips successful requests to allow legitimate login attempts
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: {
    success: false,
    message: 'Too many login attempts, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
  handler: (req: Request, res: Response) => {
    const resetTime = (req as any).rateLimit?.resetTime || Date.now() + 15 * 60 * 1000;
    res.status(429).json({
      success: false,
      message: 'Too many login attempts, please try again later.',
      retryAfter: Math.ceil((resetTime - Date.now()) / 1000),
    });
  },
  skip: () => {
    return serverConfig.nodeEnv === 'test';
  },
});

/**
 * Rate limiter for OTP endpoints (register, verify, resend)
 * Limits: 3 requests per 15 minutes per IP
 */
export const otpRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // Limit each IP to 3 requests per windowMs
  message: {
    success: false,
    message: 'Too many OTP requests, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    const resetTime = (req as any).rateLimit?.resetTime || Date.now() + 15 * 60 * 1000;
    res.status(429).json({
      success: false,
      message: 'Too many OTP requests, please try again later.',
      retryAfter: Math.ceil((resetTime - Date.now()) / 1000),
    });
  },
  skip: () => {
    return serverConfig.nodeEnv === 'test';
  },
});

/**
 * Rate limiter for password reset endpoints
 * Limits: 3 requests per hour per IP
 */
export const passwordResetRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each IP to 3 requests per hour
  message: {
    success: false,
    message: 'Too many password reset requests, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    const resetTime = (req as any).rateLimit?.resetTime || Date.now() + 60 * 60 * 1000;
    res.status(429).json({
      success: false,
      message: 'Too many password reset requests, please try again later.',
      retryAfter: Math.ceil((resetTime - Date.now()) / 1000),
    });
  },
  skip: () => {
    return serverConfig.nodeEnv === 'test';
  },
});

/**
 * Rate limiter for file upload endpoints
 * Limits: 20 requests per 15 minutes per IP
 */
export const uploadRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 uploads per windowMs
  message: {
    success: false,
    message: 'Too many file upload requests, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    const resetTime = (req as any).rateLimit?.resetTime || Date.now() + 15 * 60 * 1000;
    res.status(429).json({
      success: false,
      message: 'Too many file upload requests, please try again later.',
      retryAfter: Math.ceil((resetTime - Date.now()) / 1000),
    });
  },
  skip: () => {
    return serverConfig.nodeEnv === 'test';
  },
});

