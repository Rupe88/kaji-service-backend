import { Router } from 'express';
import {
  bulkDeleteJobPostings,
  bulkUpdateKYCStatus,
  bulkCreateJobPostings,
} from '../controllers/bulkOperations.controller';
import { authenticate, requireRole } from '../middleware/auth';
import { validate } from '../utils/validation';
import { z } from 'zod';

const router = Router();

// All routes require authentication
router.use(authenticate);

const bulkDeleteSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
});

const bulkUpdateStatusSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
  status: z.string(),
  rejectionReason: z.string().optional(),
  adminNotes: z.string().optional(),
  verifiedBy: z.string().optional(),
});

router.post('/jobs/delete', requireRole('INDUSTRIAL', 'ADMIN'), validate(bulkDeleteSchema), bulkDeleteJobPostings);
router.post('/jobs/create', requireRole('INDUSTRIAL', 'ADMIN'), bulkCreateJobPostings);
router.post('/kyc/status', requireRole('ADMIN'), validate(bulkUpdateStatusSchema), bulkUpdateKYCStatus);

export default router;

