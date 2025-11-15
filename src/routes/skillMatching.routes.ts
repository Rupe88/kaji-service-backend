import { Router } from 'express';
import {
  matchJobToUsers,
  matchUserToJobs,
  searchBySkills,
} from '../controllers/skillMatching.controller';

const router = Router();

router.get('/job/:jobId', matchJobToUsers);
router.get('/user/:userId', matchUserToJobs);
router.get('/search', searchBySkills);

export default router;

