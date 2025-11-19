import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../config/database';
import {
  generateAccessToken,
  generateRefreshToken,
  generateOTP,
  TokenPayload,
} from '../utils/jwt';
import emailService from '../services/email.service';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth';
import {
  emailSchema,
  passwordSchema,
  phoneSchema,
  nameSchema,
  otpCodeSchema,
} from '../utils/validation';
import { securityConfig, serverConfig } from '../config/env';

// Helper function to get secure cookie options
const getCookieOptions = (
  req?: Request,
  maxAge?: number
): {
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'lax' | 'strict' | 'none';
  path: string;
  maxAge?: number;
} => {
  const isProduction = serverConfig.nodeEnv === 'production';

  // Get the origin from the request header (most reliable)
  const requestOrigin = req?.headers?.origin || '';

  // Backend domain (Render)
  const backendDomain = 'hr-backend-rlth.onrender.com';
  const isLocalhost =
    requestOrigin.includes('localhost') || requestOrigin.includes('127.0.0.1');

  // Check if this is a cross-origin request
  // Cross-origin means:
  // 1. Request origin exists and is not localhost
  // 2. Request origin domain is different from backend domain
  // 3. Or we're in production (always assume cross-origin in production for safety)
  const isCrossOrigin =
    isProduction ||
    (requestOrigin &&
      !isLocalhost &&
      !requestOrigin.includes(backendDomain) &&
      requestOrigin.startsWith('http'));

  // For cross-origin cookies, we MUST use sameSite: 'none' and secure: true
  // For same-origin or localhost, we can use sameSite: 'lax'
  const sameSiteValue: 'lax' | 'none' = isCrossOrigin ? 'none' : 'lax';

  // secure must be true when sameSite is 'none' (required by browsers)
  // In production, always use secure. In development, use secure only if cross-origin
  const secureValue: boolean = Boolean(isProduction || isCrossOrigin);

  const options: {
    httpOnly: boolean;
    secure: boolean;
    sameSite: 'lax' | 'strict' | 'none';
    path: string;
    maxAge?: number;
  } = {
    httpOnly: true,
    secure: secureValue,
    sameSite: sameSiteValue,
    path: '/',
    // Don't set domain - let browser handle it automatically
    // This allows cookies to work for both localhost and deployed domains
  };

  if (maxAge) {
    options.maxAge = maxAge;
  }

  return options;
};

const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  firstName: nameSchema,
  lastName: nameSchema,
  phone: phoneSchema,
  role: z
    .enum(['INDIVIDUAL', 'INDUSTRIAL'], {
      errorMap: () => ({
        message: 'Role must be either INDIVIDUAL or INDUSTRIAL',
      }),
    })
    .default('INDIVIDUAL'),
});

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

const verifyOTPSchema = z.object({
  email: emailSchema,
  code: otpCodeSchema,
  type: z.enum(['EMAIL_VERIFICATION', 'PASSWORD_RESET', 'LOGIN_OTP'], {
    errorMap: () => ({ message: 'Invalid OTP type' }),
  }),
});

const resendOTPSchema = z.object({
  email: emailSchema,
  type: z.enum(['EMAIL_VERIFICATION', 'PASSWORD_RESET', 'LOGIN_OTP'], {
    errorMap: () => ({ message: 'Invalid OTP type' }),
  }),
});

// Export schemas for route validation
export { registerSchema, loginSchema, verifyOTPSchema, resendOTPSchema };

export const register = async (req: Request, res: Response) => {
  const body = registerSchema.parse(req.body);

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: body.email },
  });

  if (existingUser) {
    res.status(409).json({
      success: false,
      message: 'User with this email already exists',
    });
    return;
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(body.password, 12);

  // Create user
  const user = await prisma.user.create({
    data: {
      email: body.email,
      password: hashedPassword,
      firstName: body.firstName,
      lastName: body.lastName,
      phone: body.phone,
      role: body.role,
      status: 'PENDING_VERIFICATION',
    },
  });

  // Generate and send OTP
  const otp = generateOTP();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  await prisma.oTP.create({
    data: {
      userId: user.id,
      email: user.email,
      code: otp,
      type: 'EMAIL_VERIFICATION',
      expiresAt,
    },
  });

  // Send OTP email (non-blocking - don't wait for it)
  emailService
    .sendOTPEmail(
      { email: user.email, firstName: user.firstName },
      otp,
      'VERIFICATION'
    )
    .catch((error: any) => {
      console.error('❌ Failed to send OTP email to:', user.email);
      console.error('   Error:', error?.message || error);
      console.error('   Stack:', error?.stack);
      if (error?.response) {
        console.error(
          '   SendGrid Response:',
          JSON.stringify(error.response, null, 2)
        );
      }
      // Email failure is logged but doesn't affect the response
      // OTP is stored in DB, so user can still verify manually if needed
    });

  res.status(201).json({
    success: true,
    message:
      'Registration successful. Please check your email for OTP verification.',
    data: {
      userId: user.id,
      email: user.email,
      role: user.role,
    },
  });
};

export const verifyOTP = async (req: Request, res: Response) => {
  const body = verifyOTPSchema.parse(req.body);

  // Find OTP
  const otpRecord = await prisma.oTP.findFirst({
    where: {
      email: body.email,
      code: body.code,
      type: body.type,
      isUsed: false,
      expiresAt: {
        gt: new Date(),
      },
    },
    include: {
      user: true,
    },
  });

  if (!otpRecord) {
    res.status(400).json({
      success: false,
      message: 'Invalid or expired OTP',
    });
    return;
  }

  // Mark OTP as used
  await prisma.oTP.update({
    where: { id: otpRecord.id },
    data: { isUsed: true },
  });

  // Handle different OTP types
  if (body.type === 'EMAIL_VERIFICATION') {
    // Activate user and verify email
    const user = await prisma.user.update({
      where: { id: otpRecord.userId },
      data: {
        isEmailVerified: true,
        status: 'ACTIVE',
      },
    });

    // Generate tokens
    const tokenPayload: TokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // Save refresh token
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt,
      },
    });

    // Set cookies with secure settings
    res.cookie(
      'accessToken',
      accessToken,
      getCookieOptions(req, 15 * 60 * 1000)
    ); // 15 minutes
    res.cookie(
      'refreshToken',
      refreshToken,
      getCookieOptions(req, 7 * 24 * 60 * 60 * 1000)
    ); // 7 days

    res.json({
      success: true,
      message: 'Email verified successfully',
      data: {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          isEmailVerified: user.isEmailVerified,
        },
        accessToken,
      },
    });
    return;
  }

  // For other OTP types (PASSWORD_RESET, LOGIN_OTP)
  res.json({
    success: true,
    message: 'OTP verified successfully',
    data: {
      userId: otpRecord.userId,
    },
  });
};

export const resendOTP = async (req: Request, res: Response) => {
  const body = resendOTPSchema.parse(req.body);

  const user = await prisma.user.findUnique({
    where: { email: body.email },
  });

  if (!user) {
    res.status(404).json({
      success: false,
      message: 'User not found',
    });
    return;
  }

  // Generate new OTP
  const otp = generateOTP();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  // Invalidate old OTPs of same type
  await prisma.oTP.updateMany({
    where: {
      userId: user.id,
      type: body.type,
      isUsed: false,
    },
    data: {
      isUsed: true,
    },
  });

  // Create new OTP
  await prisma.oTP.create({
    data: {
      userId: user.id,
      email: user.email,
      code: otp,
      type: body.type,
      expiresAt,
    },
  });

  // Send OTP email (non-blocking - don't wait for it)
  const emailType =
    body.type === 'EMAIL_VERIFICATION'
      ? 'VERIFICATION'
      : body.type === 'PASSWORD_RESET'
      ? 'PASSWORD_RESET'
      : 'LOGIN';
  emailService
    .sendOTPEmail(
      { email: user.email, firstName: user.firstName },
      otp,
      emailType
    )
    .catch((error: any) => {
      console.error('❌ Failed to send OTP email to:', user.email);
      console.error('   Error:', error?.message || error);
      console.error('   Stack:', error?.stack);
      if (error?.response) {
        console.error(
          '   SendGrid Response:',
          JSON.stringify(error.response, null, 2)
        );
      }
      // Email failure is logged but doesn't affect the response
    });

  res.json({
    success: true,
    message: 'OTP sent successfully',
  });
};

export const login = async (req: Request, res: Response) => {
  const body = loginSchema.parse(req.body);

  // Find user
  const user = await prisma.user.findUnique({
    where: { email: body.email },
  });

  if (!user) {
    res.status(401).json({
      success: false,
      message: 'Invalid email or password',
    });
    return;
  }

  // Check if account is locked
  const MAX_LOGIN_ATTEMPTS = securityConfig.maxLoginAttempts;
  const LOCKOUT_DURATION_MINUTES = securityConfig.lockoutDurationMinutes;

  if (user.accountLockedUntil && user.accountLockedUntil > new Date()) {
    const minutesRemaining = Math.ceil(
      (user.accountLockedUntil.getTime() - new Date().getTime()) / (1000 * 60)
    );
    res.status(423).json({
      success: false,
      message: `Account is temporarily locked due to too many failed login attempts. Please try again in ${minutesRemaining} minute(s).`,
      lockedUntil: user.accountLockedUntil,
    });
    return;
  }

  // If lockout period has passed, reset failed attempts
  if (user.accountLockedUntil && user.accountLockedUntil <= new Date()) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        accountLockedUntil: null,
      },
    });
  }

  // Check password
  const isPasswordValid = await bcrypt.compare(body.password, user.password);

  if (!isPasswordValid) {
    // Increment failed login attempts
    const newFailedAttempts = user.failedLoginAttempts + 1;
    const shouldLockAccount = newFailedAttempts >= MAX_LOGIN_ATTEMPTS;

    const updateData: any = {
      failedLoginAttempts: newFailedAttempts,
      lastFailedLoginAt: new Date(),
    };

    if (shouldLockAccount) {
      const lockoutUntil = new Date();
      lockoutUntil.setMinutes(
        lockoutUntil.getMinutes() + LOCKOUT_DURATION_MINUTES
      );
      updateData.accountLockedUntil = lockoutUntil;
    }

    await prisma.user.update({
      where: { id: user.id },
      data: updateData,
    });

    const attemptsRemaining = MAX_LOGIN_ATTEMPTS - newFailedAttempts;

    if (shouldLockAccount) {
      res.status(423).json({
        success: false,
        message: `Account has been temporarily locked due to ${MAX_LOGIN_ATTEMPTS} failed login attempts. Please try again in ${LOCKOUT_DURATION_MINUTES} minutes.`,
        lockedUntil: updateData.accountLockedUntil,
      });
      return;
    }

    res.status(401).json({
      success: false,
      message: `Invalid email or password. ${attemptsRemaining} attempt(s) remaining.`,
      attemptsRemaining,
    });
    return;
  }

  // Check if account is active
  if (user.status !== 'ACTIVE') {
    res.status(403).json({
      success: false,
      message: 'Account is not active. Please verify your email first.',
    });
    return;
  }

  // Reset failed login attempts on successful login
  await prisma.user.update({
    where: { id: user.id },
    data: {
      failedLoginAttempts: 0,
      accountLockedUntil: null,
      lastLoginAt: new Date(),
    },
  });

  // Generate OTP for login (optional 2FA)
  const useOTP = securityConfig.requireLoginOTP;

  if (useOTP) {
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.oTP.create({
      data: {
        userId: user.id,
        email: user.email,
        code: otp,
        type: 'LOGIN_OTP',
        expiresAt,
      },
    });

    // Send OTP email (non-blocking - don't wait for it)
    emailService
      .sendOTPEmail(
        { email: user.email, firstName: user.firstName },
        otp,
        'LOGIN'
      )
      .catch((error: any) => {
        console.error('❌ Failed to send OTP email to:', user.email);
        console.error('   Error:', error?.message || error);
        console.error('   Stack:', error?.stack);
        if (error?.response) {
          console.error(
            '   SendGrid Response:',
            JSON.stringify(error.response, null, 2)
          );
        }
        // Email failure is logged but doesn't affect the response
      });

    res.json({
      success: true,
      message: 'OTP sent to your email. Please verify to complete login.',
      requiresOTP: true,
    });
    return;
  }

  // Generate tokens
  const tokenPayload: TokenPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
  };

  const accessToken = generateAccessToken(tokenPayload);
  const refreshToken = generateRefreshToken(tokenPayload);

  // Save refresh token
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      token: refreshToken,
      expiresAt,
    },
  });

  // Set cookies with secure settings
  res.cookie('accessToken', accessToken, getCookieOptions(req, 15 * 60 * 1000)); // 15 minutes
  res.cookie(
    'refreshToken',
    refreshToken,
    getCookieOptions(req, 7 * 24 * 60 * 60 * 1000)
  ); // 7 days

  res.json({
    success: true,
    message: 'Login successful',
    data: {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
      },
      accessToken,
    },
  });
};

export const refreshAccessToken = async (req: Request, res: Response) => {
  const refreshToken = req.cookies?.refreshToken || req.body.refreshToken;

  if (!refreshToken) {
    res.status(401).json({
      success: false,
      message: 'Refresh token required',
    });
    return;
  }

  try {
    // Verify refresh token
    const { verifyRefreshToken } = await import('../utils/jwt');
    const payload = verifyRefreshToken(refreshToken);

    // Check if refresh token exists in DB and is valid
    const tokenRecord = await prisma.refreshToken.findFirst({
      where: {
        token: refreshToken,
        userId: payload.userId,
        isRevoked: false,
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    if (!tokenRecord) {
      res.status(401).json({
        success: false,
        message: 'Invalid or expired refresh token',
      });
      return;
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user || user.status !== 'ACTIVE') {
      res.status(401).json({
        success: false,
        message: 'User not found or inactive',
      });
      return;
    }

    // Generate new access token
    const tokenPayload: TokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    const newAccessToken = generateAccessToken(tokenPayload);

    // Set new access token cookie with secure settings
    res.cookie(
      'accessToken',
      newAccessToken,
      getCookieOptions(req, 15 * 60 * 1000)
    ); // 15 minutes

    res.json({
      success: true,
      data: {
        accessToken: newAccessToken,
      },
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Invalid refresh token',
    });
    return;
  }
};

export const logout = async (req: AuthRequest, res: Response) => {
  const refreshToken = req.cookies?.refreshToken;

  if (refreshToken && req.user) {
    // Revoke refresh token
    await prisma.refreshToken.updateMany({
      where: {
        token: refreshToken,
        userId: req.user.id,
      },
      data: {
        isRevoked: true,
        revokedAt: new Date(),
      },
    });
  }

  // Clear cookies with same options used to set them
  const cookieOptions = getCookieOptions(req);
  res.clearCookie('accessToken', cookieOptions);
  res.clearCookie('refreshToken', cookieOptions);

  res.json({
    success: true,
    message: 'Logged out successfully',
  });
};

export const getMe = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'Authentication required',
    });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: {
      id: true,
      email: true,
      role: true,
      status: true,
      isEmailVerified: true,
      firstName: true,
      lastName: true,
      phone: true,
      profileImage: true,
      failedLoginAttempts: true,
      accountLockedUntil: true,
      createdAt: true,
      lastLoginAt: true,
    },
  });

  res.json({
    success: true,
    data: user,
  });
};

export const updateProfilePicture = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'Authentication required',
    });
    return;
  }

  if (!req.file) {
    res.status(400).json({
      success: false,
      message: 'Profile picture is required',
    });
    return;
  }

  try {
    // Upload to Cloudinary
    const { uploadToCloudinary } = await import('../utils/cloudinaryUpload');
    const uploadResult = await uploadToCloudinary(
      req.file,
      'hr-platform/profiles'
    );

    // Update user profile image
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        profileImage: uploadResult.url,
      },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        isEmailVerified: true,
        firstName: true,
        lastName: true,
        phone: true,
        profileImage: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json({
      success: true,
      message: 'Profile picture updated successfully',
      data: user,
    });
  } catch (error: any) {
    console.error('Error updating profile picture:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update profile picture',
    });
  }
};
