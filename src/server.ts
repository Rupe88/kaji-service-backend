import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import 'express-async-errors';
import { errorHandler } from './middleware/errorHandler';
import { notFoundHandler } from './middleware/notFoundHandler';
import { requestLogger } from './middleware/logger';
import {
  testDatabaseConnection,
  logDatabaseConnection,
  disconnectDatabase,
  startConnectionHealthMonitor,
} from './config/database';
import { testCloudinaryConnection } from './config/cloudinary';
import emailService from './services/email.service';
import { logMulterConfig } from './middleware/upload';
import { startKeepAlive, stopKeepAlive } from './utils/keepAlive';
import { initializeSocket, setSocketIOInstance } from './config/socket';
import * as cron from 'node-cron';
import trendingCalculationService from './services/trendingCalculation.service';
import {
  globalRateLimiter,
  authRateLimiter,
  otpRateLimiter,
  passwordResetRateLimiter,
} from './middleware/rateLimiter';
import {
  initializeSentry,
  sentryRequestHandler,
  sentryErrorHandler,
} from './config/sentry';

import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import individualKYCRoutes from './routes/individualKYC.routes';
import industrialKYCRoutes from './routes/industrialKYC.routes';
import jobPostingRoutes from './routes/jobPosting.routes';
import jobApplicationRoutes from './routes/jobApplication.routes';
import skillMatchingRoutes from './routes/skillMatching.routes';
import bulkOperationsRoutes from './routes/bulkOperations.routes';
import dataExportRoutes from './routes/dataExport.routes';
import adminRoutes from './routes/admin.routes';
import notificationRoutes from './routes/notification.routes';
import feedbackRoutes from './routes/feedback.routes';
import serviceRoutes from './routes/service.routes';
import dashboardRoutes from './routes/dashboard.routes';
import categoryRoutes from './routes/category.routes';
import analyticsRoutes from './routes/analytics.routes';
import learningRoutes from './routes/learning.routes';
import paymentRoutes from './routes/payment.routes';
import entertainmentRoutes from './routes/entertainment.routes';
import reviewRoutes from './routes/review.routes';
import messageRoutes from './routes/message.routes';

// Load and validate environment variables
import { serverConfig } from './config/env';

// Initialize Sentry FIRST (before anything else)
initializeSentry();

const app = express();
const httpServer = createServer(app);
const PORT = serverConfig.port;

// Initialize Socket.io
const io = initializeSocket(httpServer);
setSocketIOInstance(io);

// Sentry request handler (must be first middleware)
// In Sentry v10+, expressIntegration handles this, but we still need error handler
app.use(sentryRequestHandler);

// Security headers with Helmet (configured to work with Cloudinary images)
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: [
          "'self'",
          'data:',
          'https://res.cloudinary.com',
          'https://*.cloudinary.com',
        ],
        connectSrc: ["'self'", 'https://api.sentry.io'],
        fontSrc: ["'self'", 'data:'],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'", 'https://res.cloudinary.com', 'https://*.cloudinary.com'],
        frameSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false, // Allow Cloudinary iframes if needed
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allow Cloudinary resources
  })
);

// Health check with all services status (before rate limiting to allow keep-alive pings)
app.get('/health', async (_req, res) => {
  const [dbConnected, cloudinaryConnected, emailVerified] = await Promise.all([
    testDatabaseConnection(),
    testCloudinaryConnection(),
    emailService.verifyTransport(),
  ]);

  const emailConnected = emailVerified;
  const allServicesHealthy =
    dbConnected && cloudinaryConnected && emailConnected;

  res.json({
    status: allServicesHealthy ? 'ok' : 'degraded',
    message: 'HR Platform API is running',
    timestamp: new Date().toISOString(),
    services: {
      database: {
        connected: dbConnected,
        status: dbConnected ? 'healthy' : 'disconnected',
      },
      cloudinary: {
        connected: cloudinaryConnected,
        status: cloudinaryConnected ? 'healthy' : 'disconnected',
      },
      email: {
        connected: emailConnected,
        status: emailConnected ? 'healthy' : 'disconnected',
      },
      multer: {
        configured: true,
        status: 'ready',
        maxFileSize: '50MB',
        allowedTypes: ['images', 'videos', 'pdfs'],
      },
    },
    uptime: process.uptime(),
  });
});

// Apply global rate limiting to all API routes (after health check)
app.use('/api', globalRateLimiter);

// Middleware (after health endpoint and rate limiting)
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) {
        return callback(null, true);
      }

      // Allow requests from configured frontend URL
      const allowedOrigins = [
        serverConfig.frontendUrl,
        'http://localhost:3001',
        'http://localhost:3000',
        // 'https://hr-kaji-frontend.vercel.app',
        process.env.FRONTEND_URL || serverConfig.frontendUrl,
      ];

      // Also allow Vercel preview deployments (any subdomain of vercel.app)
      const isVercelPreview = origin && origin.includes('.vercel.app');

      if (allowedOrigins.includes(origin) || isVercelPreview) {
        callback(null, true);
      } else {
        // In development, allow all origins for easier testing
        if (serverConfig.nodeEnv === 'development') {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['Set-Cookie'],
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Request logging middleware (must be after other middleware)
app.use(requestLogger);

// API Routes with specific rate limiters
// Auth routes with stricter rate limiting
app.use('/api/auth/login', authRateLimiter);
app.use('/api/auth/register', authRateLimiter);
app.use('/api/auth/verify-otp', otpRateLimiter);
app.use('/api/auth/resend-otp', otpRateLimiter);
app.use('/api/auth/forgot-password', passwordResetRateLimiter);
app.use('/api/auth/reset-password', passwordResetRateLimiter);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/individual-kyc', individualKYCRoutes);
app.use('/api/industrial-kyc', industrialKYCRoutes);
app.use('/api/jobs', jobPostingRoutes);
app.use('/api/applications', jobApplicationRoutes);
app.use('/api/skill-matching', skillMatchingRoutes);
app.use('/api/bulk', bulkOperationsRoutes);
app.use('/api/export', dataExportRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/learning', learningRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/entertainment', entertainmentRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/messages', messageRoutes);

// Error handling
// Sentry error handler (must be before errorHandler but after routes)
app.use(sentryErrorHandler);
app.use(notFoundHandler);
app.use(errorHandler);

// Start server only if not in test environment
// In test environment, we export the app for supertest
let server: any;
let keepAliveTask: ReturnType<typeof startKeepAlive>;
if (serverConfig.nodeEnv !== 'test') {
  server = httpServer.listen(PORT, async () => {
    console.log('\n' + '='.repeat(50));
    console.log('🚀 HR Platform Backend Server');
    console.log('='.repeat(50));
    console.log(`📡 Server running on port: ${PORT}`);
    console.log(`📝 Environment: ${serverConfig.nodeEnv}`);
    console.log(`🌐 Frontend URL: ${serverConfig.frontendUrl}`);
    console.log(`⏰ Started at: ${new Date().toISOString()}`);
    console.log('='.repeat(50) + '\n');

    // Test all service connections
    console.log('🔌 Testing service connections...\n');

    // Log database connection (only once on startup with detailed info)
    const dbConnected = await logDatabaseConnection();

    // Test other services
    const [cloudinaryConnected, emailVerified] = await Promise.all([
      testCloudinaryConnection(),
      emailService.verifyTransport(),
    ]);

    // Log Multer configuration
    logMulterConfig();

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 Service Status Summary');
    console.log('='.repeat(50));
    console.log(
      `Database:      ${dbConnected ? '✅ Connected' : '❌ Disconnected'}`
    );
    console.log(
      `Cloudinary:    ${
        cloudinaryConnected ? '✅ Connected' : '❌ Disconnected'
      }`
    );
    console.log(
      `Email Service:  ${emailVerified ? '✅ Connected' : '❌ Disconnected'}`
    );
    console.log(`Multer:        ✅ Configured`);
    console.log(`Socket.io:     ✅ Initialized`);
    console.log(`Rate Limiting:  ✅ Enabled`);
    console.log(`Security Headers: ✅ Enabled (Helmet)`);
    console.log(
      `Error Tracking: ${process.env.SENTRY_DSN ? '✅ Enabled (Sentry)' : '⚠️  Disabled (SENTRY_DSN not set)'}`
    );
    console.log('='.repeat(50) + '\n');

    // Start keep-alive service (prevents server from freezing on Render/free-tier hosting)
    keepAliveTask = startKeepAlive(PORT);

    // Start database connection health monitor (prevents connection timeouts)
    startConnectionHealthMonitor();

    // Schedule trending calculations (run every 6 hours)
    cron.schedule('0 */6 * * *', async () => {
      console.log('🔄 Running scheduled trending calculations...');
      try {
        await trendingCalculationService.runAllCalculations();
        console.log('✅ Trending calculations completed');
      } catch (error) {
        console.error('❌ Error in scheduled trending calculations:', error);
      }
    });

    // Run initial trending calculation
    trendingCalculationService.runAllCalculations().catch((error) => {
      console.error('❌ Error in initial trending calculation:', error);
    });
  });

  // Graceful shutdown (only in non-test environments)
  process.on('SIGTERM', async () => {
    console.log('\n⚠️  SIGTERM received, shutting down gracefully...');
    stopKeepAlive(keepAliveTask);
    server.close(async () => {
      await disconnectDatabase();
      process.exit(0);
    });
  });

  process.on('SIGINT', async () => {
    console.log('\n⚠️  SIGINT received, shutting down gracefully...');
    stopKeepAlive(keepAliveTask);
    server.close(async () => {
      await disconnectDatabase();
      process.exit(0);
    });
  });
}

export default app;
