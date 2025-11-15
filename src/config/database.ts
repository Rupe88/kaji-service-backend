import { PrismaClient } from '@prisma/client';
import { serverConfig } from './env';

// Prisma Client configuration optimized for Neon (serverless PostgreSQL)
// Neon auto-suspends after 5 minutes of inactivity (free tier)
// Prisma Client manages connection pooling automatically
const prisma = new PrismaClient({
  log: serverConfig.nodeEnv === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// Test database connection (using a simple query instead of $connect)
// Prisma Client connects automatically on first query, so we don't need to call $connect()
export const testDatabaseConnection = async (): Promise<boolean> => {
  try {
    // Use a simple query to test connection instead of $connect()
    // This works better with Neon's auto-suspend and connection pooling
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error: any) {
    // Only log error if it's not a connection closed error (which is normal for Neon auto-suspend)
    if (error?.code !== 'P1001' && error?.message?.includes('Closed') === false) {
      console.error('❌ Database connection failed:', error.message || error);
    }
    return false;
  }
};

// Log database connection status (only called once on startup)
export const logDatabaseConnection = async (): Promise<boolean> => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Database connection established');
    const dbUrl = process.env.DATABASE_URL || '';
    const dbHost = dbUrl.split('@')[1]?.split('/')[0] || 'Connected';
    console.log(`📊 Database: ${dbHost}`);
    return true;
  } catch (error: any) {
    console.error('❌ Database connection failed:', error.message || error);
    return false;
  }
};

// Graceful shutdown
export const disconnectDatabase = async (): Promise<void> => {
  try {
    await prisma.$disconnect();
    console.log('✅ Database disconnected gracefully');
  } catch (error) {
    console.error('❌ Error disconnecting database:', error);
  }
};

export default prisma;

