import { Router } from 'express';
import {
  createIndividualKYC,
  getIndividualKYC,
  updateIndividualKYC,
  getAllIndividualKYC,
  updateKYCStatus,
} from '../controllers/individualKYC.controller';
import { uploadSingle } from '../middleware/upload';
import { authenticate, requireEmailVerification } from '../middleware/auth';
import { validate, validateParams } from '../utils/validation';
import { individualKYCSchema } from '../utils/kycValidation';
import { updateIndividualKYCSchema } from '../utils/updateValidation';
import { z } from 'zod';

const router = Router();

// All routes require authentication
router.use(authenticate);
router.use(requireEmailVerification);

router.post('/', uploadSingle, validate(individualKYCSchema), createIndividualKYC);
router.get('/', getAllIndividualKYC);
router.get('/:userId', validateParams(z.object({ userId: z.string().uuid() })), getIndividualKYC);
router.put('/:userId', uploadSingle, validateParams(z.object({ userId: z.string().uuid() })), validate(updateIndividualKYCSchema), updateIndividualKYC);
router.patch('/:userId/status', validateParams(z.object({ userId: z.string().uuid() })), updateKYCStatus);

export default router;

