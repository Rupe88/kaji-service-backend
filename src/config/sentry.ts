import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import { expressIntegration } from '@sentry/node';
import { Request, Response, NextFunction } from 'express';
import { serverConfig } from './env';

/**
 * Initialize Sentry for error tracking and performance monitoring
 * Only initializes if SENTRY_DSN is provided in environment variables
 */
export const initializeSentry = () => {
  const sentryDsn = process.env.SENTRY_DSN;

  // Only initialize Sentry if DSN is provided
  if (!sentryDsn) {
    console.log('⚠️  Sentry DSN not provided, error tracking disabled');
    return;
  }

  try {
    Sentry.init({
      dsn: sentryDsn,
      environment: serverConfig.nodeEnv,
      
      // Performance Monitoring
      integrations: [
        // Enable Express integration (handles request/error handling automatically)
        expressIntegration(),
        // Enable profiling
        nodeProfilingIntegration(),
      ],
      
      // Performance Monitoring
      tracesSampleRate: serverConfig.nodeEnv === 'production' ? 0.1 : 1.0, // 10% in production, 100% in development
      
      // Profiling
      profilesSampleRate: serverConfig.nodeEnv === 'production' ? 0.1 : 1.0, // 10% in production, 100% in development
      
      // Release tracking (optional, set via SENTRY_RELEASE env var)
      release: process.env.SENTRY_RELEASE,
      
      // Filter out health check endpoints from tracking
      beforeSend(event) {
        // Don't send events for health check endpoints
        if (event.request?.url?.includes('/health')) {
          return null;
        }
        return event;
      },
      
      // Ignore certain errors
      ignoreErrors: [
        // Browser extensions
        'ResizeObserver loop limit exceeded',
        'Non-Error promise rejection captured',
        // Network errors that are expected
        'NetworkError',
        'Network request failed',
      ],
    });

    console.log('✅ Sentry initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize Sentry:', error);
  }
};

/**
 * Sentry request handler middleware
 * Must be added before other middleware
 * In Sentry v10+, expressIntegration handles request context automatically
 * This is a no-op middleware for compatibility
 */
export const sentryRequestHandler = (_req: Request, _res: Response, next: NextFunction) => {
  // Express integration handles this automatically
  next();
};

/**
 * Sentry error handler middleware
 * Must be added after all routes but before error handler
 * Captures errors and sends them to Sentry
 */
export const sentryErrorHandler = (err: any, _req: Request, _res: Response, next: NextFunction) => {
  // Capture exception in Sentry
  Sentry.captureException(err);
  
  // Pass to next error handler
  next(err);
};
