import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

interface EnvConfig {
  // Database
  database: {
    url: string;
    shadowUrl?: string;
  };
  
  // JWT
  jwt: {
    accessSecret: string;
    refreshSecret: string;
    accessExpiresIn: string;
    refreshExpiresIn: string;
  };
  
  // Email
  email: {
    host: string;
    port: number;
    user: string;
    pass: string;
    from: string;
    // SendGrid (fallback)
    sendgridApiKey?: string;
    sendgridFrom?: string;
  };
  
  // Server
  server: {
    port: number;
    nodeEnv: string;
    frontendUrl: string;
  };
  
  // Security
  security: {
    maxLoginAttempts: number;
    lockoutDurationMinutes: number;
    requireLoginOTP: boolean;
  };
  
  // Cloudinary
  cloudinary: {
    cloudName: string;
    apiKey: string;
    apiSecret: string;
  };
}

// Validate required environment variables
const validateEnv = (): EnvConfig => {
  const required = [
    'DATABASE_URL',
    'JWT_ACCESS_SECRET',
    'JWT_REFRESH_SECRET',
    'EMAIL_USER',
    'EMAIL_PASS',
    'CLOUDINARY_CLOUD_NAME',
    'CLOUDINARY_API_KEY',
    'CLOUDINARY_API_SECRET',
  ];
  
  // SendGrid is optional (fallback)

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      'Please check your .env file and ensure all required variables are set.'
    );
  }

  // Validate JWT secrets length
  if (process.env.JWT_ACCESS_SECRET!.length < 32) {
    throw new Error('JWT_ACCESS_SECRET must be at least 32 characters long');
  }

  if (process.env.JWT_REFRESH_SECRET!.length < 32) {
    throw new Error('JWT_REFRESH_SECRET must be at least 32 characters long');
  }

  return {
    database: {
      url: process.env.DATABASE_URL!,
      shadowUrl: process.env.SHADOW_DATABASE_URL,
    },
    jwt: {
      accessSecret: process.env.JWT_ACCESS_SECRET!,
      refreshSecret: process.env.JWT_REFRESH_SECRET!,
      accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
      refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    },
    email: {
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: Number(process.env.EMAIL_PORT) || 587,
      user: process.env.EMAIL_USER!,
      pass: process.env.EMAIL_PASS!,
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER!,
      // SendGrid (optional fallback)
      sendgridApiKey: process.env.SENDGRID_API_KEY,
      sendgridFrom: process.env.SENDGRID_FROM || process.env.EMAIL_FROM || process.env.EMAIL_USER!,
    },
    server: {
      port: Number(process.env.PORT) || 3000,
      nodeEnv: process.env.NODE_ENV || 'development',
      frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3001',
    },
    security: {
      maxLoginAttempts: Number(process.env.MAX_LOGIN_ATTEMPTS) || 5,
      lockoutDurationMinutes: Number(process.env.LOCKOUT_DURATION_MINUTES) || 30,
      requireLoginOTP: process.env.REQUIRE_LOGIN_OTP === 'true',
    },
    cloudinary: {
      cloudName: process.env.CLOUDINARY_CLOUD_NAME!,
      apiKey: process.env.CLOUDINARY_API_KEY!,
      apiSecret: process.env.CLOUDINARY_API_SECRET!,
    },
  };
};

// Export validated config
export const config = validateEnv();

// Export individual config sections for convenience
export const {
  database: dbConfig,
  jwt: jwtConfig,
  email: emailConfig,
  server: serverConfig,
  security: securityConfig,
  cloudinary: cloudinaryConfig,
} = config;

// Export default
export default config;

