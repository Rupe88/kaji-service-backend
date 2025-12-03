import { Response } from 'express';
import { z } from 'zod';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { feedbackSchema, updateFeedbackStatusSchema } from '../utils/feedbackValidation';
import { getSocketIOInstance, emitNotificationToAllAdmins, emitNotification } from '../config/socket';

/**
 * Create new feedback
 */
export const createFeedback = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Unauthorized' });
    return;
  }

  try {
    const body = feedbackSchema.parse(req.body);

    const feedback = await prisma.feedback.create({
      data: {
        userId: req.user.id,
        type: body.type,
        category: body.category,
        title: body.title,
        description: body.description,
        rating: body.rating,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Notify all admins about new feedback
    const io = getSocketIOInstance();
    if (io) {
      const userName = feedback.user.firstName && feedback.user.lastName
        ? `${feedback.user.firstName} ${feedback.user.lastName}`
        : feedback.user.email;

      await emitNotificationToAllAdmins(io, {
        type: 'NEW_FEEDBACK',
        title: 'New User Feedback',
        message: `${userName} submitted ${body.type.replace('_', ' ').toLowerCase()}: ${body.title}`,
        data: {
          feedbackId: feedback.id,
          type: body.type,
          category: body.category,
          userId: feedback.userId,
        },
      });
    }

    res.status(201).json({
      success: true,
      data: feedback,
      message: 'Thank you for your feedback! We appreciate your input.',
    });
  } catch (error: any) {
    console.error('Error creating feedback:', error);
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.errors,
      });
      return;
    }
    res.status(500).json({
      success: false,
      message: 'Failed to submit feedback',
      error: error.message,
    });
  }
};

/**
 * Get all feedback (admin only)
 */
export const getAllFeedback = async (req: AuthRequest, res: Response) => {
  if (!req.user || req.user.role !== 'ADMIN') {
    res.status(403).json({ success: false, message: 'Admin access required' });
    return;
  }

  try {
    const { page = '1', limit = '20', status, type, category } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    const where: any = {};
    if (status && status !== 'ALL') where.status = status;
    if (type && type !== 'ALL') where.type = type;
    if (category && category !== 'ALL') where.category = category;

    const [feedbacks, total] = await Promise.all([
      prisma.feedback.findMany({
        where,
        skip,
        take,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              profileImage: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.feedback.count({ where }),
    ]);

    res.json({
      success: true,
      data: feedbacks,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error: any) {
    console.error('Error fetching feedback:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch feedback',
      error: error.message,
    });
  }
};

/**
 * Get user's own feedback
 */
export const getMyFeedback = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Unauthorized' });
    return;
  }

  try {
    const { page = '1', limit = '20' } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    const [feedbacks, total] = await Promise.all([
      prisma.feedback.findMany({
        where: { userId: req.user.id },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.feedback.count({ where: { userId: req.user.id } }),
    ]);

    res.json({
      success: true,
      data: feedbacks,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error: any) {
    console.error('Error fetching user feedback:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch feedback',
      error: error.message,
    });
  }
};

/**
 * Get feedback by ID
 */
export const getFeedbackById = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Unauthorized' });
    return;
  }

  try {
    const { id } = req.params;

    const feedback = await prisma.feedback.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            profileImage: true,
          },
        },
      },
    });

    if (!feedback) {
      res.status(404).json({ success: false, message: 'Feedback not found' });
      return;
    }

    // Users can only view their own feedback unless they're admin
    if (feedback.userId !== req.user.id && req.user.role !== 'ADMIN') {
      res.status(403).json({ success: false, message: 'Access denied' });
      return;
    }

    res.json({
      success: true,
      data: feedback,
    });
  } catch (error: any) {
    console.error('Error fetching feedback:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch feedback',
      error: error.message,
    });
  }
};

/**
 * Update feedback status (admin only)
 */
export const updateFeedbackStatus = async (req: AuthRequest, res: Response) => {
  if (!req.user || req.user.role !== 'ADMIN') {
    res.status(403).json({ success: false, message: 'Admin access required' });
    return;
  }

  try {
    const { id } = req.params;
    const body = updateFeedbackStatusSchema.parse(req.body);

    const feedback = await prisma.feedback.update({
      where: { id },
      data: {
        status: body.status,
        adminNotes: body.adminNotes,
        respondedAt: new Date(),
        respondedBy: req.user.id,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Notify user about feedback status update
    const io = getSocketIOInstance();
    if (io) {
      let title = 'Feedback Status Updated';
      let message = `Your feedback "${feedback.title}" has been ${body.status.toLowerCase()}`;

      if (body.status === 'RESOLVED') {
        title = 'Feedback Resolved! 🎉';
        message = `Thank you for your feedback! Your "${feedback.title}" has been resolved.`;
      } else if (body.status === 'IN_PROGRESS') {
        title = 'Feedback Under Review';
        message = `Your feedback "${feedback.title}" is now being reviewed by our team.`;
      }

      await emitNotification(io, feedback.userId, {
        type: 'FEEDBACK_STATUS',
        title,
        message,
        data: {
          feedbackId: feedback.id,
          status: body.status,
          adminNotes: body.adminNotes || undefined,
        },
      });
    }

    res.json({
      success: true,
      data: feedback,
      message: 'Feedback status updated successfully',
    });
  } catch (error: any) {
    console.error('Error updating feedback status:', error);
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.errors,
      });
      return;
    }
    res.status(500).json({
      success: false,
      message: 'Failed to update feedback status',
      error: error.message,
    });
  }
};

/**
 * Delete feedback (admin only or own feedback)
 */
export const deleteFeedback = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Unauthorized' });
    return;
  }

  try {
    const { id } = req.params;

    const feedback = await prisma.feedback.findUnique({
      where: { id },
    });

    if (!feedback) {
      res.status(404).json({ success: false, message: 'Feedback not found' });
      return;
    }

    // Users can only delete their own feedback unless they're admin
    if (feedback.userId !== req.user.id && req.user.role !== 'ADMIN') {
      res.status(403).json({ success: false, message: 'Access denied' });
      return;
    }

    await prisma.feedback.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Feedback deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting feedback:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete feedback',
      error: error.message,
    });
  }
};

