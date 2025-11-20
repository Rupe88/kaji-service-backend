import { Router } from 'express';
import {
  createTrainingCourse,
  getTrainingCourse,
  getAllTrainingCourses,
  updateTrainingCourse,
  deleteTrainingCourse,
  enrollInTraining,
  updateEnrollmentProgress,
  getEnrollments,
} from '../controllers/training.controller';
import {
  createComment,
  getComments,
  updateComment,
  deleteComment,
} from '../controllers/trainingComment.controller';
import { validate, validateParams } from '../utils/validation';
import { trainingCourseSchema, enrollmentSchema, updateEnrollmentSchema, updateTrainingCourseSchema } from '../utils/trainingValidation';
import { authenticate } from '../middleware/auth';
import { z } from 'zod';

const router = Router();

// Comments routes - must be defined first to avoid route conflicts
router.post('/comments', createComment);
router.get('/courses/:courseId/comments', getComments);
router.put('/comments/:id', updateComment);
router.delete('/comments/:id', deleteComment);

// Course routes
router.post('/courses', authenticate, validate(trainingCourseSchema), createTrainingCourse);
router.get('/courses', getAllTrainingCourses);
router.get('/courses/:id', validateParams(z.object({ id: z.string().uuid() })), getTrainingCourse);
router.put('/courses/:id', authenticate, validateParams(z.object({ id: z.string().uuid() })), validate(updateTrainingCourseSchema), updateTrainingCourse);
router.delete('/courses/:id', authenticate, validateParams(z.object({ id: z.string().uuid() })), deleteTrainingCourse);

// Enrollment routes
router.post('/enroll', validate(enrollmentSchema), enrollInTraining);
router.get('/enrollments', getEnrollments);
router.patch('/enrollments/:id', validateParams(z.object({ id: z.string().uuid() })), validate(updateEnrollmentSchema), updateEnrollmentProgress);

export default router;

