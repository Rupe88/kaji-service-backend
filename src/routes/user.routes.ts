import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { validate } from '../utils/validation';
import {
  getNotificationPreferences,
  updateNotificationPreferences,
  getPrivacySettings,
  updatePrivacySettings,
  getUrgentJobPreferences,
  updateUrgentJobPreferences,
  notificationPreferencesSchema,
  privacySettingsSchema,
  urgentJobPreferencesSchema,
} from '../controllers/user.controller';

const router = Router();

// Notification Preferences Routes
router.get(
  '/preferences',
  authenticate,
  getNotificationPreferences
);
router.patch(
  '/preferences',
  authenticate,
  validate(notificationPreferencesSchema),
  updateNotificationPreferences
);

// Privacy Settings Routes
router.get(
  '/privacy',
  authenticate,
  getPrivacySettings
);
router.patch(
  '/privacy',
  authenticate,
  validate(privacySettingsSchema),
  updatePrivacySettings
);

// Urgent Job Notification Preferences Routes
router.get(
  '/urgent-job-preferences',
  authenticate,
  getUrgentJobPreferences
);
router.patch(
  '/urgent-job-preferences',
  authenticate,
  validate(urgentJobPreferencesSchema),
  updateUrgentJobPreferences
);

export default router;

