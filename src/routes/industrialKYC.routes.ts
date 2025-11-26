import { Router } from 'express';
import {
  createIndustrialKYC,
  getIndustrialKYC,
  updateIndustrialKYC,
  getAllIndustrialKYC,
  updateKYCStatus,
  deleteIndustrialKYC,
} from '../controllers/industrialKYC.controller';
import { uploadFields } from '../middleware/upload';
import { authenticate, requireEmailVerification } from '../middleware/auth';
import { validate, validateParams } from '../utils/validation';
import { industrialKYCSchema } from '../utils/kycValidation';
import { z } from 'zod';

const router = Router();

// All routes require authentication
router.use(authenticate);
router.use(requireEmailVerification);

router.post('/', uploadFields, createIndustrialKYC);
router.get('/', getAllIndustrialKYC);
router.get('/:userId', validateParams(z.object({ userId: z.string().uuid() })), getIndustrialKYC);
router.put('/:userId', uploadFields, validateParams(z.object({ userId: z.string().uuid() })), updateIndustrialKYC);
router.patch('/:userId/status', validateParams(z.object({ userId: z.string().uuid() })), updateKYCStatus);
router.delete('/:userId', validateParams(z.object({ userId: z.string().uuid() })), deleteIndustrialKYC);

export default router;

