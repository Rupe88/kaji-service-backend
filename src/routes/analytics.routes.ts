import { Router } from 'express';
import { analyticsController } from '../controllers/analytics.controller';
import { authenticate, requireRole } from '../middleware/auth';
import { UserRole } from '@prisma/client';

const router = Router();

// Public routes
router.get('/category-stats', analyticsController.getCategoryStatistics.bind(analyticsController));
router.get('/all-categories-stats', analyticsController.getAllCategoriesStatistics.bind(analyticsController));
router.get('/trending-services', analyticsController.getTrendingServices.bind(analyticsController));
router.get('/trending-providers', analyticsController.getTrendingProviders.bind(analyticsController));
router.get('/trending-seekers', analyticsController.getTrendingSeekers.bind(analyticsController));
router.get('/trending/jobs', analyticsController.getTrendingJobs.bind(analyticsController));
router.get('/trending/skills', analyticsController.getTrendingSkills.bind(analyticsController));
router.get('/users/:userId', analyticsController.getUserAnalytics.bind(analyticsController));
router.get('/teachers', analyticsController.getTeachersList.bind(analyticsController));
router.get('/entertainers', analyticsController.getEntertainersList.bind(analyticsController));
router.get('/platform', analyticsController.getPlatformAnalytics.bind(analyticsController));

// Admin routes
router.get(
  '/insights',
  authenticate,
  requireRole(UserRole.ADMIN),
  analyticsController.getDataInsights.bind(analyticsController)
);

export default router;

