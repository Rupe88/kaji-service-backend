import { Router } from 'express';
import {
  getJobStatistics,
  getUserStatistics,
  getPlatformStatistics,
} from '../controllers/analytics.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/jobs', getJobStatistics);
router.get('/users/:userId?', authenticate, getUserStatistics);
router.get('/platform', authenticate, getPlatformStatistics);

export default router;

