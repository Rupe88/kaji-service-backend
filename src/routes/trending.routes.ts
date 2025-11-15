import { Router } from 'express';
import {
  getTrendingJobs,
  getTrendingSkills,
  createTrendingJob,
  createTrendingSkill,
} from '../controllers/trending.controller';

const router = Router();

router.get('/jobs', getTrendingJobs);
router.get('/skills', getTrendingSkills);
router.post('/jobs', createTrendingJob);
router.post('/skills', createTrendingSkill);

export default router;

