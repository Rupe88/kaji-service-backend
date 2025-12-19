import { Router } from 'express';
import { notificationController } from '../controllers/notification.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../utils/validation';
import {
  createNotificationSchema,
  notificationPreferencesSchema,
  notificationQuerySchema,
  markAsReadSchema,
} from '../types/notification.types';

const router = Router();

// Authenticated routes
router.get(
  '/',
  authenticate,
  validate(notificationQuerySchema),
  notificationController.getNotifications.bind(notificationController)
);

router.get(
  '/unread-count',
  authenticate,
  notificationController.getUnreadCount.bind(notificationController)
);

router.get(
  '/preferences',
  authenticate,
  notificationController.getPreferences.bind(notificationController)
);

router.get(
  '/:id',
  authenticate,
  notificationController.getNotificationById.bind(notificationController)
);

router.put(
  '/preferences',
  authenticate,
  validate(notificationPreferencesSchema),
  notificationController.updatePreferences.bind(notificationController)
);

router.put(
  '/mark-read',
  authenticate,
  validate(markAsReadSchema),
  notificationController.markAsRead.bind(notificationController)
);

router.put(
  '/mark-all-read',
  authenticate,
  notificationController.markAllAsRead.bind(notificationController)
);

router.delete(
  '/:id',
  authenticate,
  notificationController.deleteNotification.bind(notificationController)
);

// Admin routes
router.post(
  '/',
  authenticate,
  validate(createNotificationSchema),
  notificationController.createNotification.bind(notificationController)
);

export default router;
