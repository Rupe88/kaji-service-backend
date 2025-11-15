import { Router } from 'express';
import {
  createJobPosting,
  getJobPosting,
  getAllJobPostings,
  updateJobPosting,
  deleteJobPosting,
} from '../controllers/jobPosting.controller';
import { validate, validateParams } from '../utils/validation';
import { jobPostingSchema } from '../utils/jobValidation';
import { updateJobPostingSchema } from '../utils/updateValidation';
import { z } from 'zod';

const router = Router();

router.post('/', validate(jobPostingSchema), createJobPosting);
router.get('/', getAllJobPostings);
router.get('/:id', validateParams(z.object({ id: z.string().uuid() })), getJobPosting);
router.put('/:id', validateParams(z.object({ id: z.string().uuid() })), validate(updateJobPostingSchema), updateJobPosting);
router.delete('/:id', validateParams(z.object({ id: z.string().uuid() })), deleteJobPosting);

export default router;

