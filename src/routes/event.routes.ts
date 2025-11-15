import { Router } from 'express';
import {
  createEvent,
  getEvent,
  getAllEvents,
  registerForEvent,
  getEventRegistrations,
} from '../controllers/event.controller';
import { validate, validateParams } from '../utils/validation';
import { eventSchema, eventRegistrationSchema } from '../utils/eventValidation';
import { z } from 'zod';

const router = Router();

router.post('/', validate(eventSchema), createEvent);
router.get('/', getAllEvents);
router.get('/:id', validateParams(z.object({ id: z.string().uuid() })), getEvent);
router.post('/register', validate(eventRegistrationSchema), registerForEvent);
router.get('/registrations', getEventRegistrations);

export default router;

