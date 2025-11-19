import { Router } from 'express';
import {
  createIndividualKYC,
  getIndividualKYC,
  updateIndividualKYC,
  getAllIndividualKYC,
  updateKYCStatus,
} from '../controllers/individualKYC.controller';
import { uploadFields } from '../middleware/upload';
import { authenticate, requireEmailVerification } from '../middleware/auth';
import { validateParams } from '../utils/validation';
import { z } from 'zod';

const router = Router();

// All routes require authentication
router.use(authenticate);
router.use(requireEmailVerification);

// Note: Validation is done in the controller after FormData parsing
// The validate middleware can't handle FormData strings properly
router.post('/', uploadFields, createIndividualKYC);
router.get('/', getAllIndividualKYC);
router.get(
  '/:userId',
  validateParams(z.object({ userId: z.string().uuid() })),
  getIndividualKYC
);
// Note: Validation is done in the controller after FormData parsing
router.put(
  '/:userId',
  uploadFields,
  validateParams(z.object({ userId: z.string().uuid() })),
  updateIndividualKYC
);
router.patch(
  '/:userId/status',
  validateParams(z.object({ userId: z.string().uuid() })),
  updateKYCStatus
);

export default router;
