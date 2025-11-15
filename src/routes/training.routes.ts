import { Router } from 'express';
import {
  createTrainingCourse,
  getTrainingCourse,
  getAllTrainingCourses,
  enrollInTraining,
  updateEnrollmentProgress,
  getEnrollments,
} from '../controllers/training.controller';
import { validate, validateParams } from '../utils/validation';
import { trainingCourseSchema, enrollmentSchema, updateEnrollmentSchema } from '../utils/trainingValidation';
import { z } from 'zod';

const router = Router();

router.post('/courses', validate(trainingCourseSchema), createTrainingCourse);
router.get('/courses', getAllTrainingCourses);
router.get('/courses/:id', validateParams(z.object({ id: z.string().uuid() })), getTrainingCourse);
router.post('/enroll', validate(enrollmentSchema), enrollInTraining);
router.get('/enrollments', getEnrollments);
router.patch('/enrollments/:id', validateParams(z.object({ id: z.string().uuid() })), validate(updateEnrollmentSchema), updateEnrollmentProgress);

export default router;

