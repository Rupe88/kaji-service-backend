import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, TokenPayload } from '../utils/jwt';
import prisma from '../config/database';
import { UserRole } from '@prisma/client';

export interface AuthRequest extends Request {
  user?: TokenPayload & {
    id: string;
    role: UserRole;
  };
}

/**
 * Authenticate user and attach user info to request
 */
export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token =
      req.cookies?.accessToken ||
      req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const payload = verifyAccessToken(token);

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        isEmailVerified: true,
      },
    });

    if (!user) {
      res.status(401).json({ success: false, message: 'User not found' });
      return;
    }

    if (user.status !== 'ACTIVE') {
      res.status(403).json({ success: false, message: 'Account is not active' });
      return;
    }

    req.user = {
      ...payload,
      id: user.id,
      role: user.role as UserRole,
    };

    return next();
  } catch (error) {
    console.error('Authentication error:', error);
     res.status(401).json({ success: false, message: 'Invalid or expired token' });
     return
  }
};

/**
 * Role-based authorization
 */
export const requireRole = (...roles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ success: false, message: 'Insufficient permissions' });
      return;
    }

    return next();
  };
};

/**
 * Require verified email
 */
export const requireEmailVerification = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { isEmailVerified: true },
    });

    if (!user?.isEmailVerified) {
      res.status(403).json({ success: false, message: 'Email verification required' });
      return;
    }

    return next();
  } catch (error) {
    console.error('Email verification error:', error);
     res.status(500).json({ success: false, message: 'Error checking email verification' });
     return
  }
};
