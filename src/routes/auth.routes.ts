import { Router } from 'express';
import {
  register,
  login,
  verifyOTP,
  resendOTP,
  refreshAccessToken,
  logout,
  getMe,
  updateProfile,
  updateProfilePicture,
  updateProfileSchema,
} from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../utils/validation';
import {
  registerSchema,
  loginSchema,
  verifyOTPSchema,
  resendOTPSchema,
} from '../controllers/auth.controller';
import { uploadSingle } from '../middleware/upload';

const router = Router();

router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.post('/verify-otp', validate(verifyOTPSchema), verifyOTP);
router.post('/resend-otp', validate(resendOTPSchema), resendOTP);
router.post('/refresh-token', refreshAccessToken);
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, getMe);
router.patch('/profile', authenticate, validate(updateProfileSchema), updateProfile);
router.post(
  '/profile/picture',
  authenticate,
  uploadSingle,
  updateProfilePicture
);

export default router;
