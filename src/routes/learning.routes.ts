import { Router } from 'express';
import { learningController } from '../controllers/learning.controller';
import { classBookingController } from '../controllers/classBooking.controller';
import { authenticate, requireRole } from '../middleware/auth';
import { UserRole } from '@prisma/client';
import { validate } from '../utils/validation';
import { validateParams } from '../utils/validation';
import { createCourseSchema, createLearningMaterialSchema, createPublicResourceSchema, createClassBookingSchema } from '../types/learning.types';
import { z } from 'zod';

const router = Router();

// Provider routes
router.post(
  '/courses',
  authenticate,
  requireRole(UserRole.INDUSTRIAL),
  validate(createCourseSchema),
  learningController.createCourse.bind(learningController)
);

router.get(
  '/courses/my-courses',
  authenticate,
  requireRole(UserRole.INDUSTRIAL),
  learningController.getMyCourses.bind(learningController)
);

router.post(
  '/materials',
  authenticate,
  requireRole(UserRole.INDUSTRIAL),
  validate(createLearningMaterialSchema),
  learningController.uploadLearningMaterial.bind(learningController)
);

router.get(
  '/materials/:id',
  authenticate,
  validateParams(z.object({ id: z.string().uuid() })),
  learningController.getLearningMaterial.bind(learningController)
);

router.post(
  '/public-resources',
  authenticate,
  requireRole(UserRole.INDUSTRIAL),
  validate(createPublicResourceSchema),
  learningController.createPublicResource.bind(learningController)
);

// Public routes
router.get(
  '/public-resources',
  learningController.getPublicResources.bind(learningController)
);

router.get(
  '/courses',
  learningController.getAllCourses.bind(learningController)
);

// Student routes
router.post(
  '/enroll',
  authenticate,
  requireRole(UserRole.INDIVIDUAL),
  learningController.enrollInCourseBody.bind(learningController)
);

router.post(
  '/courses/:courseId/enroll',
  authenticate,
  requireRole(UserRole.INDIVIDUAL),
  validateParams(z.object({ courseId: z.string().uuid() })),
  learningController.enrollInCourse.bind(learningController)
);

// Class booking routes
router.post(
  '/classes/book',
  authenticate,
  requireRole(UserRole.INDIVIDUAL),
  validate(createClassBookingSchema),
  classBookingController.bookClass.bind(classBookingController)
);

router.get(
  '/classes/my-bookings',
  authenticate,
  requireRole(UserRole.INDIVIDUAL),
  classBookingController.getMyClassBookings.bind(classBookingController)
);

router.patch(
  '/classes/:id/status',
  authenticate,
  validateParams(z.object({ id: z.string().uuid() })),
  classBookingController.updateClassBookingStatus.bind(classBookingController)
);

router.post(
  '/enrollments/:enrollmentId/complete',
  authenticate,
  validateParams(z.object({ enrollmentId: z.string().uuid() })),
  learningController.completeEnrollment.bind(learningController)
);

export default router;

