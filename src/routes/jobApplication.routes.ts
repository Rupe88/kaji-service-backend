import { Router } from 'express';
import {
  createJobApplication,
  getJobApplication,
  getAllJobApplications,
  updateApplicationStatus,
} from '../controllers/jobApplication.controller';
import { uploadSingle } from '../middleware/upload';
import { validate, validateParams } from '../utils/validation';
import { jobApplicationSchema } from '../utils/jobValidation';
import { z } from 'zod';

const router = Router();

router.post('/', uploadSingle, validate(jobApplicationSchema), createJobApplication);
router.get('/', getAllJobApplications);
router.get('/:id', validateParams(z.object({ id: z.string().uuid() })), getJobApplication);
router.patch('/:id/status', validateParams(z.object({ id: z.string().uuid() })), updateApplicationStatus);

export default router;

