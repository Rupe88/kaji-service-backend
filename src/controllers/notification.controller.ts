import { Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth';
import {
  createNotificationSchema,
  notificationPreferencesSchema,
  notificationQuerySchema,
  markAsReadSchema,
} from '../types/notification.types';
import { getSocketIOInstance } from '../config/socket';

const prisma = new PrismaClient();

export class NotificationController {
  /**
   * Create a notification (Admin/System use)
   */
  async createNotification(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      // Only admins can create notifications manually
      if (req.user?.role !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          message: 'Only admins can create notifications',
        });
      }

      const body = createNotificationSchema.parse(req.body);

      const notification = await prisma.notification.create({
        data: {
          ...body,
          expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
        },
        include: {
          user: {
            select: {
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      // Emit real-time notification
      this.emitNotification(notification.userId, notification);

      return res.status(201).json({
        success: true,
        message: 'Notification created successfully',
        data: notification,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: error.errors,
        });
      }
      return next(error);
    }
  }

  /**
   * Get user's notifications
   */
  async getNotifications(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const query = notificationQuerySchema.parse(req.query);
      const page = query.page || 1;
      const limit = query.limit || 20;
      const skip = (page - 1) * limit;
      const take = limit;

      const where: any = {
        userId: userId!,
      };

      if (query.isRead !== undefined) {
        where.isRead = query.isRead;
      }

      if (query.type) {
        where.type = query.type;
      }

      if (query.category) {
        where.category = query.category;
      }

      if (query.priority) {
        where.priority = query.priority;
      }

      const orderBy: any = {};
      switch (query.sortBy) {
        case 'newest':
          orderBy.createdAt = 'desc';
          break;
        case 'oldest':
          orderBy.createdAt = 'asc';
          break;
        case 'priority':
          orderBy.priority = 'desc';
          orderBy.createdAt = 'desc';
          break;
      }

      const [notifications, total, unreadCount] = await Promise.all([
        prisma.notification.findMany({
          where,
          skip,
          take,
          orderBy,
        }),
        prisma.notification.count({ where }),
        prisma.notification.count({
          where: {
            userId: userId!,
            isRead: false,
          },
        }),
      ]);

      return res.json({
        success: true,
        data: notifications,
        pagination: {
          page: query.page,
          limit: take,
          total,
          pages: Math.ceil(total / take),
        },
        unreadCount,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: 'Invalid query parameters',
          errors: error.errors,
        });
      }
      return next(error);
    }
  }

  /**
   * Get notification by ID
   */
  async getNotificationById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { id } = req.params;

      const notification = await prisma.notification.findUnique({
        where: { id },
      });

      if (!notification) {
        return res.status(404).json({
          success: false,
          message: 'Notification not found',
        });
      }

      if (notification.userId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to view this notification',
        });
      }

      return res.json({
        success: true,
        data: notification,
      });
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Mark notifications as read
   */
  async markAsRead(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const body = markAsReadSchema.parse(req.body);

      const updated = await prisma.notification.updateMany({
        where: {
          id: { in: body.notificationIds },
          userId: userId!,
        },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      });

      return res.json({
        success: true,
        message: `${updated.count} notification(s) marked as read`,
        data: { count: updated.count },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: error.errors,
        });
      }
      return next(error);
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;

      const updated = await prisma.notification.updateMany({
        where: {
          userId: userId!,
          isRead: false,
        },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      });

      return res.json({
        success: true,
        message: `${updated.count} notification(s) marked as read`,
        data: { count: updated.count },
      });
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Delete notification
   */
  async deleteNotification(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { id } = req.params;

      const notification = await prisma.notification.findUnique({
        where: { id },
      });

      if (!notification) {
        return res.status(404).json({
          success: false,
          message: 'Notification not found',
        });
      }

      if (notification.userId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to delete this notification',
        });
      }

      await prisma.notification.delete({
        where: { id },
      });

      return res.json({
        success: true,
        message: 'Notification deleted successfully',
      });
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Update notification preferences
   */
  async updatePreferences(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const body = notificationPreferencesSchema.parse(req.body);

      const user = await prisma.user.update({
        where: { id: userId! },
        data: {
          emailNotifications: body.emailNotifications,
          pushNotifications: body.pushNotifications,
          // Add more preference fields as needed
        },
        select: {
          emailNotifications: true,
          pushNotifications: true,
        },
      });

      return res.json({
        success: true,
        message: 'Notification preferences updated',
        data: user,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: error.errors,
        });
      }
      return next(error);
    }
  }

  /**
   * Get notification preferences
   */
  async getPreferences(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;

      const user = await prisma.user.findUnique({
        where: { id: userId! },
        select: {
          emailNotifications: true,
          pushNotifications: true,
          applicationUpdates: true,
          jobAlerts: true,
          kycUpdates: true,
        },
      });

      return res.json({
        success: true,
        data: user,
      });
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;

      const count = await prisma.notification.count({
        where: {
          userId: userId!,
          isRead: false,
        },
      });

      return res.json({
        success: true,
        data: { unreadCount: count },
      });
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Helper: Emit real-time notification via Socket.io
   */
  private emitNotification(userId: string, notification: any): void {
    try {
      const io = getSocketIOInstance();
      if (io) {
        io.to(`user:${userId}`).emit('notification', {
          type: 'NEW_NOTIFICATION',
          data: notification,
        });
      }
    } catch (error) {
      console.error('Error emitting notification:', error);
    }
  }

  /**
   * Helper: Create and send notification (for use by other services)
   */
  static async createAndSendNotification(
    userId: string,
    notificationData: {
      type: string;
      title: string;
      message: string;
      data?: any;
      priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
      category?: string;
      actionUrl?: string;
      actionLabel?: string;
      expiresAt?: Date;
    }
  ): Promise<void> {
    try {
      const notification = await prisma.notification.create({
        data: {
          userId,
          ...notificationData,
        },
      });

      // Emit real-time notification
      const io = getSocketIOInstance();
      if (io) {
        io.to(`user:${userId}`).emit('notification', {
          type: 'NEW_NOTIFICATION',
          data: notification,
        });
      }

      // Send email if user has email notifications enabled
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          emailNotifications: true,
          email: true,
        },
      });

      if (user?.emailNotifications && notificationData.priority !== 'LOW') {
        // Email sending logic can be added here
        // await emailService.sendNotificationEmail(user.email, notification);
      }
    } catch (error) {
      console.error('Error creating notification:', error);
    }
  }
}

export const notificationController = new NotificationController();
