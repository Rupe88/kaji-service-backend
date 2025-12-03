import { Router } from 'express';
import {
  createUrgentJob,
  getUrgentJobs,
  getNearbyUrgentJobs,
  getUrgentJobById,
  updateUrgentJob,
  deleteUrgentJob,
  applyToUrgentJob,
  acceptApplication,
  completeJob,
  getMyUrgentJobs,
  getMyApplications,
} from '../controllers/urgentJob.controller';
import { authenticate } from '../middleware/auth';
import { upload } from '../middleware/upload';
import { uploadLogger } from '../middleware/uploadLogger';

const router = Router();

// Public routes
router.get('/', getUrgentJobs);
router.get('/nearby', getNearbyUrgentJobs);
router.get('/:id', getUrgentJobById);

// Protected routes (require authentication)
router.post('/', authenticate, upload.single('image'), uploadLogger, createUrgentJob);
router.put('/:id', authenticate, upload.single('image'), uploadLogger, updateUrgentJob);
router.delete('/:id', authenticate, deleteUrgentJob);
router.post('/:id/apply', authenticate, applyToUrgentJob);
router.post('/:id/accept/:applicationId', authenticate, acceptApplication);
router.post('/:id/complete', authenticate, completeJob);
router.get('/my-jobs/list', authenticate, getMyUrgentJobs);
router.get('/applications/my-applications', authenticate, getMyApplications);

export default router;

