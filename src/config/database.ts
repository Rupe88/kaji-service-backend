import { PrismaClient } from '@prisma/client';
import { serverConfig } from './env';

/**
 * Prisma Client configuration optimized for Neon (serverless PostgreSQL)
 * 
 * IMPORTANT FOR PRODUCTION:
 * - Neon auto-suspends after 5 minutes of inactivity (free tier)
 * - For production, use Neon's connection pooler URL instead of direct connection
 * - Connection pooler URL format: postgresql://user:pass@ep-xxx-pooler.us-east-2.aws.neon.tech/dbname?sslmode=require
 * - This prevents connection timeouts and improves reliability
 * 
 * Features implemented:
 * - Automatic connection retry with exponential backoff (via Prisma middleware)
 * - Connection health monitor (pings every 4 minutes to prevent auto-suspend)
 * - Graceful error handling for connection errors
 */
const prisma = new PrismaClient({
  log: serverConfig.nodeEnv === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// Add middleware to handle connection errors automatically
prisma.$use(async (params, next) => {
  const maxRetries = 3;
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await next(params);
    } catch (error: any) {
      lastError = error;
      
      // Check if it's a connection error that we should retry
      const isConnectionError = 
        error?.code === 'P1001' || // Connection error
        error?.code === 'P1000' || // Authentication error
        error?.message?.includes('Closed') ||
        error?.message?.includes('connection') ||
        error?.message?.includes('ECONNREFUSED') ||
        error?.message?.includes('ETIMEDOUT') ||
        error?.message?.includes('Connection closed');
      
      if (isConnectionError && attempt < maxRetries) {
        const waitTime = 500 * Math.pow(2, attempt - 1); // Exponential backoff: 500ms, 1s, 2s
        console.warn(`⚠️  Database connection error (attempt ${attempt}/${maxRetries}), retrying in ${waitTime}ms...`);
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, waitTime));
        
        // Try to reconnect
        try {
          await prisma.$connect();
        } catch (connectError) {
          // Ignore connection errors during retry, will be caught in next iteration
        }
        continue;
      }
      
      // If not a connection error or max retries reached, throw immediately
      throw error;
    }
  }
  
  throw lastError;
});

// Connection retry helper with exponential backoff
const retryConnection = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> => {
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      
      // Check if it's a connection error that we should retry
      const isConnectionError = 
        error?.code === 'P1001' || // Connection error
        error?.message?.includes('Closed') ||
        error?.message?.includes('connection') ||
        error?.message?.includes('ECONNREFUSED') ||
        error?.message?.includes('ETIMEDOUT');
      
      if (isConnectionError && attempt < maxRetries) {
        const waitTime = delayMs * Math.pow(2, attempt - 1); // Exponential backoff
        console.warn(`⚠️  Database connection attempt ${attempt} failed, retrying in ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        
        // Try to reconnect
        try {
          await prisma.$connect();
        } catch (connectError) {
          // Ignore connection errors during retry
        }
        continue;
      }
      
      throw error;
    }
  }
  
  throw lastError;
};

// Test database connection with retry logic
export const testDatabaseConnection = async (): Promise<boolean> => {
  try {
    // Use retry logic for connection testing
    await retryConnection(async () => {
      await prisma.$queryRaw`SELECT 1`;
    }, 2, 500); // 2 retries with 500ms initial delay
    return true;
  } catch (error: any) {
    // Only log error if it's not a connection closed error (which is normal for Neon auto-suspend)
    if (error?.code !== 'P1001' && error?.message?.includes('Closed') === false) {
      console.error('prisma:error Error in PostgreSQL connection:', error);
    }
    return false;
  }
};

// Log database connection status (only called once on startup)
export const logDatabaseConnection = async (): Promise<boolean> => {
  try {
    await retryConnection(async () => {
      await prisma.$queryRaw`SELECT 1`;
    }, 3, 1000); // 3 retries with 1s initial delay for startup
    console.log('✅ Database connection established');
    const dbUrl = process.env.DATABASE_URL || '';
    const dbHost = dbUrl.split('@')[1]?.split('/')[0] || 'Connected';
    console.log(`📊 Database: ${dbHost}`);
    return true;
  } catch (error: any) {
    console.error('prisma:error Error in PostgreSQL connection:', error);
    return false;
  }
};

// Connection health monitor - keeps connection alive in production
let healthMonitorInterval: NodeJS.Timeout | null = null;

export const startConnectionHealthMonitor = (): void => {
  // Only run in production
  if (serverConfig.nodeEnv !== 'production') {
    return;
  }

  // Clear any existing interval
  if (healthMonitorInterval) {
    clearInterval(healthMonitorInterval);
  }

  // Ping database every 4 minutes to prevent auto-suspend (Neon free tier suspends after 5 min)
  healthMonitorInterval = setInterval(async () => {
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch (error: any) {
      // Log but don't throw - connection will be retried on next query
      if (error?.code !== 'P1001' && !error?.message?.includes('Closed')) {
        console.warn('⚠️  Connection health check failed:', error.message);
      }
    }
  }, 4 * 60 * 1000); // Every 4 minutes

  console.log('🔄 Database connection health monitor started (pinging every 4 minutes)');
};

export const stopConnectionHealthMonitor = (): void => {
  if (healthMonitorInterval) {
    clearInterval(healthMonitorInterval);
    healthMonitorInterval = null;
    console.log('🛑 Database connection health monitor stopped');
  }
};

// Graceful shutdown
export const disconnectDatabase = async (): Promise<void> => {
  try {
    stopConnectionHealthMonitor();
    await prisma.$disconnect();
    console.log('✅ Database disconnected gracefully');
  } catch (error) {
    console.error('❌ Error disconnecting database:', error);
  }
};

export default prisma;

