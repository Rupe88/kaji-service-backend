import { Router } from 'express';
import {
  matchJobToUsers,
  matchUserToJobs,
  searchBySkills,
  getJobRecommendations,
} from '../controllers/skillMatching.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/job/:jobId', matchJobToUsers);
router.get('/user/:userId', matchUserToJobs);
router.get('/search', searchBySkills);
router.get('/recommendations', authenticate, getJobRecommendations);

export default router;

