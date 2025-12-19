import { Router } from 'express';
import { entertainmentController } from '../controllers/entertainment.controller';
import { authenticate, requireRole } from '../middleware/auth';
import { UserRole } from '@prisma/client';
import { validate } from '../utils/validation';
import { validateParams } from '../utils/validation';
import { createEntertainmentServiceSchema, updateEntertainmentServiceSchema } from '../types/entertainment.types';
import { z } from 'zod';

const router = Router();

// Public routes
router.get('/', entertainmentController.getEntertainmentServices.bind(entertainmentController));
router.get('/:id', validateParams(z.object({ id: z.string().uuid() })), entertainmentController.getEntertainmentServiceById.bind(entertainmentController));

// Provider routes
router.post(
  '/',
  authenticate,
  requireRole(UserRole.INDUSTRIAL, UserRole.INDIVIDUAL),
  validate(createEntertainmentServiceSchema),
  entertainmentController.createEntertainmentService.bind(entertainmentController)
);

router.put(
  '/:id',
  authenticate,
  requireRole(UserRole.INDUSTRIAL, UserRole.INDIVIDUAL),
  validateParams(z.object({ id: z.string().uuid() })),
  validate(updateEntertainmentServiceSchema),
  entertainmentController.updateEntertainmentService.bind(entertainmentController)
);

router.delete(
  '/:id',
  authenticate,
  requireRole(UserRole.INDUSTRIAL, UserRole.INDIVIDUAL),
  validateParams(z.object({ id: z.string().uuid() })),
  entertainmentController.deleteEntertainmentService.bind(entertainmentController)
);

export default router;

