import { Router } from 'express';
import {
  createJobApplication,
  getJobApplication,
  getAllJobApplications,
  updateApplicationStatus,
  getApplicationsByUser,
} from '../controllers/jobApplication.controller';
import { uploadSingle } from '../middleware/upload';
import { validate, validateParams } from '../utils/validation';
import { jobApplicationSchema } from '../utils/jobValidation';
import { authenticate } from '../middleware/auth';
import { z } from 'zod';

const router = Router();

router.post('/', authenticate, uploadSingle, validate(jobApplicationSchema), createJobApplication);
router.get('/', getAllJobApplications);
// This route must come before /:id to avoid route conflicts
router.get('/user/:userId', validateParams(z.object({ userId: z.string().uuid() })), getApplicationsByUser);
router.get('/:id', validateParams(z.object({ id: z.string().uuid() })), getJobApplication);
router.patch('/:id/status', validateParams(z.object({ id: z.string().uuid() })), updateApplicationStatus);

export default router;

