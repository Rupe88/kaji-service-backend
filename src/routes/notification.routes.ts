import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllNotifications,
} from '../controllers/notification.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get all notifications
router.get('/', getNotifications);

// Get unread count
router.get('/unread-count', getUnreadCount);

// Mark notification as read
router.patch('/:id/read', markAsRead);

// Mark all notifications as read
router.patch('/read-all', markAllAsRead);

// Delete a notification
router.delete('/:id', deleteNotification);

// Delete all notifications
router.delete('/', deleteAllNotifications);

export default router;

