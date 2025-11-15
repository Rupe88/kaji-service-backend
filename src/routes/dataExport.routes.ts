import { Router } from 'express';
import {
  exportJobPostings,
  exportApplications,
  exportKYCs,
} from '../controllers/dataExport.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/jobs', exportJobPostings);
router.get('/applications', authenticate, exportApplications);
router.get('/kycs', authenticate, exportKYCs);

export default router;

