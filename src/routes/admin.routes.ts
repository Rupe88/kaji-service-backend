import { Router } from 'express';
import {
  getAllPendingKYCs,
  getAllKYCs,
  getKYCDetails,
  updateIndividualKYCStatus,
  updateIndustrialKYCStatus,
  getAllUsers,
  updateUserStatus,
  getAdminDashboardStats,
  bulkUpdateKYCStatus,
  getUnverifiedJobs,
  updateJobVerification,
  bulkUpdateJobVerification,
} from '../controllers/admin.controller';
import { adminServiceController } from '../controllers/adminService.controller';
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
// Note: Specific routes must come before dynamic routes to avoid conflicts
router.get('/kyc', getAllKYCs); // Get all KYCs with optional status filter
router.get('/kyc/pending', getAllPendingKYCs); // Legacy endpoint for backward compatibility
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
// Dynamic route must come after specific routes
router.get(
  '/kyc/:type/:userId',
  validateParams(
    z.object({
      type: z.enum(['INDIVIDUAL', 'INDUSTRIAL']),
      userId: z.string().uuid(),
    })
  ),
  getKYCDetails
);

// User Management
router.get('/users', getAllUsers);
router.patch(
  '/users/:userId/status',
  validateParams(z.object({ userId: z.string().uuid() })),
  updateUserStatus
);

// Job Verification Management
router.get('/jobs/unverified', getUnverifiedJobs);
router.patch(
  '/jobs/:jobId/verify',
  validateParams(z.object({ jobId: z.string().uuid() })),
  updateJobVerification
);
router.post('/jobs/bulk-verify', bulkUpdateJobVerification);

// Service Management
router.get('/services', adminServiceController.getAllServices.bind(adminServiceController));
router.get('/services/:id', adminServiceController.getServiceById.bind(adminServiceController));
router.put('/services/:id', adminServiceController.updateService.bind(adminServiceController));
router.delete('/services/:id', adminServiceController.deleteService.bind(adminServiceController));
router.post('/services/bulk-update', adminServiceController.bulkUpdateServices.bind(adminServiceController));

export default router;
