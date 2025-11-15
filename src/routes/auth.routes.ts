import { Router } from 'express';
import {
  register,
  login,
  verifyOTP,
  resendOTP,
  refreshAccessToken,
  logout,
  getMe,
} from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../utils/validation';
import {
  registerSchema,
  loginSchema,
  verifyOTPSchema,
  resendOTPSchema,
} from '../controllers/auth.controller';

const router = Router();

router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.post('/verify-otp', validate(verifyOTPSchema), verifyOTP);
router.post('/resend-otp', validate(resendOTPSchema), resendOTP);
router.post('/refresh-token', refreshAccessToken);
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, getMe);

export default router;
