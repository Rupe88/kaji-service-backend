import { Router } from 'express';
import {
  getAllPendingKYCs,
  updateIndividualKYCStatus,
  updateIndustrialKYCStatus,
  getAllUsers,
  updateUserStatus,
  getAdminDashboardStats,
  bulkUpdateKYCStatus,
} from '../controllers/admin.controller';
import { authenticate, requireRole } from '../middleware/auth';
import { validateParams } from '../utils/validation';
import { z } from 'zod';

const router = Router();

// All admin routes require authentication and ADMIN role
router.use(authenticate);
router.use(requireRole('ADMIN'));

// Dashboard stats
router.get('/dashboard/stats', getAdminDashboardStats);

// KYC Management
router.get('/kyc/pending', getAllPendingKYCs);
router.patch(
  '/kyc/individual/:userId',
  validateParams(z.object({ userId: z.string().uuid() })),
  updateIndividualKYCStatus
);
router.patch(
  '/kyc/industrial/:userId',
  validateParams(z.object({ userId: z.string().uuid() })),
  updateIndustrialKYCStatus
);
router.post('/kyc/bulk-update', bulkUpdateKYCStatus);

// User Management
router.get('/users', getAllUsers);
router.patch(
  '/users/:userId/status',
  validateParams(z.object({ userId: z.string().uuid() })),
  updateUserStatus
);

export default router;

