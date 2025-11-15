import { Request, Response, NextFunction } from 'express';

interface RequestWithStartTime extends Request {
  startTime?: number;
}

/**
 * Request logging middleware
 * Logs all API requests with method, path, status, response time, and IP
 */
export const requestLogger = (req: RequestWithStartTime, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  req.startTime = startTime;

  // Log request start
  const timestamp = new Date().toISOString();
  const method = req.method;
  const path = req.originalUrl || req.url;
  const ip = req.ip || req.socket.remoteAddress || 'unknown';

  console.log(`[${timestamp}] ${method} ${path} - IP: ${ip}`);

  // Override res.end to log response
  const originalEnd = res.end.bind(res);
  res.end = function (chunk?: any, encoding?: any, cb?: any) {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;
    const statusEmoji = getStatusEmoji(statusCode);
    const durationColor = getDurationColor(duration);

    // Log response
    console.log(
      `[${timestamp}] ${statusEmoji} ${method} ${path} - ${statusCode} - ${durationColor}${duration}ms${'\x1b[0m'} - IP: ${ip}`
    );

    // Call original end
    return originalEnd(chunk, encoding, cb);
  };

  next();
};

/**
 * Get emoji for HTTP status code
 */
const getStatusEmoji = (statusCode: number): string => {
  if (statusCode >= 200 && statusCode < 300) return '✅';
  if (statusCode >= 300 && statusCode < 400) return '↪️';
  if (statusCode >= 400 && statusCode < 500) return '⚠️';
  if (statusCode >= 500) return '❌';
  return '❓';
};

/**
 * Get color code for duration
 */
const getDurationColor = (duration: number): string => {
  if (duration < 100) return '\x1b[32m'; // Green for fast
  if (duration < 500) return '\x1b[33m'; // Yellow for medium
  return '\x1b[31m'; // Red for slow
};

/**
 * Database connection status logger
 */
export const logDatabaseStatus = async () => {
  try {
    const prisma = (await import('../config/database')).default;
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Database connected successfully');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
};

