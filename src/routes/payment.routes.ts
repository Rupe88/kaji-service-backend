import { Router } from 'express';
import { paymentController } from '../controllers/payment.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../utils/validation';
import { createPaymentMethodSchema, createPaymentTransactionSchema } from '../types/payment.types';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.post(
  '/methods',
  validate(createPaymentMethodSchema),
  paymentController.createPaymentMethod.bind(paymentController)
);

router.get(
  '/methods',
  paymentController.getPaymentMethods.bind(paymentController)
);

router.post(
  '/transactions',
  validate(createPaymentTransactionSchema),
  paymentController.createPaymentTransaction.bind(paymentController)
);

router.get(
  '/history',
  paymentController.getPaymentHistory.bind(paymentController)
);

export default router;

