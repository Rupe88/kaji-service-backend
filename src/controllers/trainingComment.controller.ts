import { Request, Response } from 'express';
import prisma from '../config/database';
import { z } from 'zod';

const createCommentSchema = z.object({
  courseId: z.string().uuid(),
  userId: z.string().uuid(),
  parentId: z.string().uuid().optional(),
  content: z.string().min(1, 'Comment cannot be empty').max(5000, 'Comment is too long'),
});

const updateCommentSchema = z.object({
  content: z.string().min(1, 'Comment cannot be empty').max(5000, 'Comment is too long'),
});

export const createComment = async (req: Request, res: Response) => {
  try {
    const body = createCommentSchema.parse(req.body);
    const { courseId, userId, parentId, content } = body;

    // Check if course exists
    const course = await prisma.trainingCourse.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      res.status(404).json({
        success: false,
        message: 'Course not found',
      });
      return;
    }

    // If replying, check if parent comment exists
    if (parentId) {
      const parentComment = await prisma.trainingComment.findUnique({
        where: { id: parentId },
      });

      if (!parentComment) {
        res.status(404).json({
          success: false,
          message: 'Parent comment not found',
        });
        return;
      }

      // Ensure parent comment belongs to the same course
      if (parentComment.courseId !== courseId) {
        res.status(400).json({
          success: false,
          message: 'Parent comment does not belong to this course',
        });
        return;
      }
    }

    const comment = await prisma.trainingComment.create({
      data: {
        courseId,
        userId,
        parentId,
        content,
      },
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
        replies: {
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
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    res.status(201).json({
      success: true,
      data: comment,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.errors,
      });
      return;
    }

    console.error('Error creating comment:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      meta: error.meta,
      stack: error.stack,
    });
    
    // Check if it's a table doesn't exist error
    if (error.code === 'P2021' || error.message?.includes('does not exist') || error.message?.includes('relation') || error.message?.includes('table')) {
      res.status(500).json({
        success: false,
        message: 'Training comments table does not exist. Please run database migration.',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
      return;
    }
    
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create comment',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

export const getComments = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;

    if (!courseId) {
      res.status(400).json({
        success: false,
        message: 'Course ID is required',
      });
      return;
    }

    // Get all top-level comments (no parent) with their replies
    const comments = await prisma.trainingComment.findMany({
      where: {
        courseId,
        parentId: null, // Only top-level comments
      },
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
        replies: {
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
            replies: {
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
              orderBy: { createdAt: 'asc' },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: comments,
    });
  } catch (error: any) {
    console.error('Error fetching comments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch comments',
    });
  }
};

export const updateComment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const body = updateCommentSchema.parse(req.body);
    const { content } = body;

    const comment = await prisma.trainingComment.findUnique({
      where: { id },
    });

    if (!comment) {
      res.status(404).json({
        success: false,
        message: 'Comment not found',
      });
      return;
    }

    const updatedComment = await prisma.trainingComment.update({
      where: { id },
      data: {
        content,
        isEdited: true,
      },
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
        replies: {
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
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    res.json({
      success: true,
      data: updatedComment,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.errors,
      });
      return;
    }

    console.error('Error updating comment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update comment',
    });
  }
};

export const deleteComment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const comment = await prisma.trainingComment.findUnique({
      where: { id },
    });

    if (!comment) {
      res.status(404).json({
        success: false,
        message: 'Comment not found',
      });
      return;
    }

    // Delete comment (cascade will delete replies)
    await prisma.trainingComment.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Comment deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting comment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete comment',
    });
  }
};

