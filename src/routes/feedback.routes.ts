import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  createFeedback,
  getAllFeedback,
  getMyFeedback,
  getFeedbackById,
  updateFeedbackStatus,
  deleteFeedback,
} from '../controllers/feedback.controller';

const router = Router();

// Public routes (authenticated users can submit feedback)
router.post('/', authenticate, createFeedback);

// User routes (view own feedback)
router.get('/my-feedback', authenticate, getMyFeedback);
router.get('/:id', authenticate, getFeedbackById);
router.delete('/:id', authenticate, deleteFeedback);

// Admin routes
router.get('/', authenticate, getAllFeedback);
router.patch('/:id/status', authenticate, updateFeedbackStatus);

export default router;

