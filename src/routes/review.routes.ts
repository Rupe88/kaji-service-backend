import { Router } from 'express';
import { reviewController } from '../controllers/review.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../utils/validation';
import {
  createReviewSchema,
  updateReviewSchema,
  providerResponseSchema,
  reviewQuerySchema,
} from '../types/review.types';

const router = Router();

// Public routes
router.get(
  '/service/:serviceId/stats',
  reviewController.getServiceReviewStats.bind(reviewController)
);

router.get(
  '/',
  validate(reviewQuerySchema),
  reviewController.getReviews.bind(reviewController)
);

router.get(
  '/:id',
  reviewController.getReviewById.bind(reviewController)
);

// Authenticated routes
router.post(
  '/',
  authenticate,
  validate(createReviewSchema),
  reviewController.createReview.bind(reviewController)
);

router.put(
  '/:id',
  authenticate,
  validate(updateReviewSchema),
  reviewController.updateReview.bind(reviewController)
);

router.delete(
  '/:id',
  authenticate,
  reviewController.deleteReview.bind(reviewController)
);

// Provider routes
router.post(
  '/:id/respond',
  authenticate,
  validate(providerResponseSchema),
  reviewController.respondToReview.bind(reviewController)
);

export default router;

