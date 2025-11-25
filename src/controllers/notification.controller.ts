import { Request, Response } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { z } from 'zod';

// Get all notifications for the authenticated user
export const getNotifications = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'Authentication required',
    });
    return;
  }

  try {
    const { page = '1', limit = '20', type, isRead } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    const where: any = {
      userId: req.user.id,
    };

    if (type) {
      where.type = type;
    }

    if (isRead !== undefined) {
      where.isRead = isRead === 'true';
    }

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.notification.count({ where }),
    ]);

    res.json({
      success: true,
      data: notifications,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error: any) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch notifications',
    });
  }
};

// Get unread count
export const getUnreadCount = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'Authentication required',
    });
    return;
  }

  try {
    const count = await prisma.notification.count({
      where: {
        userId: req.user.id,
        isRead: false,
      },
    });

    res.json({
      success: true,
      data: { unreadCount: count },
    });
  } catch (error: any) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch unread count',
    });
  }
};

// Mark notification as read
export const markAsRead = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'Authentication required',
    });
    return;
  }

  try {
    const { id } = req.params;

    const notification = await prisma.notification.findUnique({
      where: { id },
    });

    if (!notification) {
      res.status(404).json({
        success: false,
        message: 'Notification not found',
      });
      return;
    }

    // Verify the notification belongs to the user
    if (notification.userId !== req.user.id) {
      res.status(403).json({
        success: false,
        message: 'You can only mark your own notifications as read',
      });
      return;
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    res.json({
      success: true,
      data: updated,
    });
  } catch (error: any) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to mark notification as read',
    });
  }
};

// Mark all notifications as read
export const markAllAsRead = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'Authentication required',
    });
    return;
  }

  try {
    const updated = await prisma.notification.updateMany({
      where: {
        userId: req.user.id,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    res.json({
      success: true,
      message: `Marked ${updated.count} notifications as read`,
      data: { count: updated.count },
    });
  } catch (error: any) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to mark all notifications as read',
    });
  }
};

// Delete a notification
export const deleteNotification = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'Authentication required',
    });
    return;
  }

  try {
    const { id } = req.params;

    const notification = await prisma.notification.findUnique({
      where: { id },
    });

    if (!notification) {
      res.status(404).json({
        success: false,
        message: 'Notification not found',
      });
      return;
    }

    // Verify the notification belongs to the user
    if (notification.userId !== req.user.id) {
      res.status(403).json({
        success: false,
        message: 'You can only delete your own notifications',
      });
      return;
    }

    await prisma.notification.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Notification deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting notification:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete notification',
    });
  }
};

// Delete all notifications
export const deleteAllNotifications = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'Authentication required',
    });
    return;
  }

  try {
    const deleted = await prisma.notification.deleteMany({
      where: {
        userId: req.user.id,
      },
    });

    res.json({
      success: true,
      message: `Deleted ${deleted.count} notifications`,
      data: { count: deleted.count },
    });
  } catch (error: any) {
    console.error('Error deleting all notifications:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete all notifications',
    });
  }
};

