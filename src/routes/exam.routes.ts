import { Router } from 'express';
import {
  createExam,
  getExam,
  getAllExams,
  updateExam,
  deleteExam,
  bookExam,
  updateExamBooking,
  requestRetotaling,
  getExamBookings,
} from '../controllers/exam.controller';
import { uploadMultiple } from '../middleware/upload';
import { validate, validateParams } from '../utils/validation';
import { examSchema, examBookingSchema, updateExamBookingSchema } from '../utils/examValidation';
import { z } from 'zod';

const router = Router();

router.post('/', validate(examSchema), createExam);
router.get('/', getAllExams);
router.get('/:id', validateParams(z.object({ id: z.string().uuid() })), getExam);
router.put('/:id', validateParams(z.object({ id: z.string().uuid() })), validate(examSchema), updateExam);
router.delete('/:id', validateParams(z.object({ id: z.string().uuid() })), deleteExam);
router.post('/book', validate(examBookingSchema), bookExam);
router.get('/bookings', getExamBookings);
router.patch('/bookings/:id', uploadMultiple, validateParams(z.object({ id: z.string().uuid() })), validate(updateExamBookingSchema), updateExamBooking);
router.patch('/bookings/:id/retotaling', validateParams(z.object({ id: z.string().uuid() })), requestRetotaling);

export default router;

