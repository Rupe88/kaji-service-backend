import { Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth';
import {
  createMessageSchema,
  updateMessageSchema,
  conversationQuerySchema,
  messageQuerySchema,
  markMessagesAsReadSchema,
} from '../types/message.types';
import { getSocketIOInstance } from '../config/socket';
import { NotificationController } from './notification.controller';

const prisma = new PrismaClient();

export class MessageController {
  /**
   * Create or get conversation and send message
   */
  async sendMessage(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const body = createMessageSchema.parse(req.body);

      // Ensure user is not messaging themselves
      if (body.recipientId === userId) {
        return res.status(400).json({
          success: false,
          message: 'Cannot send message to yourself',
        });
      }

      // Find or create conversation
      let conversation = await prisma.conversation.findFirst({
        where: {
          OR: [
            {
              participant1Id: userId!,
              participant2Id: body.recipientId,
              ...(body.serviceId && { serviceId: body.serviceId }),
              ...(body.bookingId && { bookingId: body.bookingId }),
            },
            {
              participant1Id: body.recipientId,
              participant2Id: userId!,
              ...(body.serviceId && { serviceId: body.serviceId }),
              ...(body.bookingId && { bookingId: body.bookingId }),
            },
          ],
        },
      });

      if (!conversation) {
        // Create new conversation
        conversation = await prisma.conversation.create({
          data: {
            participant1Id: userId!,
            participant2Id: body.recipientId,
            serviceId: body.serviceId,
            bookingId: body.bookingId,
          },
        });
      }

      // Create message
      const message = await prisma.message.create({
        data: {
          conversationId: conversation.id,
          senderId: userId!,
          recipientId: body.recipientId,
          content: body.content,
          messageType: body.messageType || 'TEXT',
          attachments: body.attachments,
        },
        include: {
          sender: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profileImage: true,
            },
          },
          recipient: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      // Update conversation
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          lastMessageAt: new Date(),
          lastMessageId: message.id,
          participant1Unread:
            conversation.participant1Id === userId
              ? conversation.participant1Unread
              : conversation.participant1Unread + 1,
          participant2Unread:
            conversation.participant2Id === userId
              ? conversation.participant2Unread
              : conversation.participant2Unread + 1,
        },
      });

      // Emit real-time message
      this.emitMessage(body.recipientId, message);

      // Send notification to recipient
      await NotificationController.createAndSendNotification(body.recipientId, {
        type: 'NEW_MESSAGE',
        title: 'New Message',
        message: `${message.sender.firstName || 'Someone'} sent you a message`,
        data: {
          conversationId: conversation.id,
          messageId: message.id,
          senderId: userId,
        },
        priority: 'NORMAL',
        category: 'MESSAGE',
        actionUrl: `/messages/${conversation.id}`,
        actionLabel: 'View Message',
      });

      return res.status(201).json({
        success: true,
        message: 'Message sent successfully',
        data: {
          message,
          conversationId: conversation.id,
        },
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
   * Get user's conversations
   */
  async getConversations(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const query = conversationQuerySchema.parse(req.query);
      const page = query.page || 1;
      const limit = query.limit || 20;
      const skip = (page - 1) * limit;
      const take = limit;

      const where: any = {
        OR: [
          { participant1Id: userId! },
          { participant2Id: userId! },
        ],
      };

      if (query.isArchived !== undefined) {
        where.isArchived = query.isArchived;
      }

      if (query.serviceId) {
        where.serviceId = query.serviceId;
      }

      if (query.bookingId) {
        where.bookingId = query.bookingId;
      }

      const [conversations, total] = await Promise.all([
        prisma.conversation.findMany({
          where,
          include: {
            participant1: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                profileImage: true,
              },
            },
            participant2: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                profileImage: true,
              },
            },
            service: {
              select: {
                id: true,
                title: true,
              },
            },
            messages: {
              take: 1,
              orderBy: { createdAt: 'desc' },
              include: {
                sender: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
          },
          skip,
          take,
          orderBy: { lastMessageAt: 'desc' },
        }),
        prisma.conversation.count({ where }),
      ]);

      // Calculate unread count for current user
      const conversationsWithUnread = conversations.map((conv: any) => ({
        ...conv,
        unreadCount:
          conv.participant1Id === userId
            ? conv.participant1Unread
            : conv.participant2Unread,
        otherParticipant:
          conv.participant1Id === userId ? conv.participant2 : conv.participant1,
      }));

      return res.json({
        success: true,
        data: conversationsWithUnread,
        pagination: {
          page: query.page,
          limit: take,
          total,
          pages: Math.ceil(total / take),
        },
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
   * Get conversation by ID
   */
  async getConversationById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { id } = req.params;

      const conversation = await prisma.conversation.findUnique({
        where: { id },
        include: {
          participant1: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profileImage: true,
            },
          },
          participant2: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profileImage: true,
            },
          },
          service: {
            select: {
              id: true,
              title: true,
            },
          },
          booking: {
            select: {
              id: true,
              scheduledDate: true,
            },
          },
        },
      });

      if (!conversation) {
        return res.status(404).json({
          success: false,
          message: 'Conversation not found',
        });
      }

      if (
        conversation.participant1Id !== userId &&
        conversation.participant2Id !== userId
      ) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to view this conversation',
        });
      }

      return res.json({
        success: true,
        data: {
          ...conversation,
          unreadCount:
            conversation.participant1Id === userId
              ? conversation.participant1Unread
              : conversation.participant2Unread,
          otherParticipant:
            conversation.participant1Id === userId
              ? conversation.participant2
              : conversation.participant1,
        },
      });
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Get messages in a conversation
   */
  async getMessages(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const query = messageQuerySchema.parse(req.query);

      // Verify user is part of conversation
      const conversation = await prisma.conversation.findUnique({
        where: { id: query.conversationId },
      });

      if (!conversation) {
        return res.status(404).json({
          success: false,
          message: 'Conversation not found',
        });
      }

      if (
        conversation.participant1Id !== userId &&
        conversation.participant2Id !== userId
      ) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to view this conversation',
        });
      }

      const where: any = {
        conversationId: query.conversationId,
        isDeleted: false,
      };

      if (query.before) {
        where.createdAt = { lt: new Date(query.before) };
      }

      const messages = await prisma.message.findMany({
        where,
        include: {
          sender: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profileImage: true,
            },
          },
        },
        take: query.limit,
        orderBy: { createdAt: 'desc' },
      });

      return res.json({
        success: true,
        data: messages.reverse(), // Reverse to show oldest first
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
   * Update message (edit)
   */
  async updateMessage(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { id } = req.params;
      const body = updateMessageSchema.parse(req.body);

      const message = await prisma.message.findUnique({
        where: { id },
      });

      if (!message) {
        return res.status(404).json({
          success: false,
          message: 'Message not found',
        });
      }

      if (message.senderId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'You can only edit your own messages',
        });
      }

      const updatedMessage = await prisma.message.update({
        where: { id },
        data: {
          content: body.content,
          isEdited: true,
          editedAt: new Date(),
        },
        include: {
          sender: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      // Emit update to conversation participants
      const conversation = await prisma.conversation.findUnique({
        where: { id: message.conversationId },
      });

      if (conversation) {
        this.emitMessageUpdate(conversation.participant1Id, updatedMessage);
        this.emitMessageUpdate(conversation.participant2Id, updatedMessage);
      }

      return res.json({
        success: true,
        message: 'Message updated successfully',
        data: updatedMessage,
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
   * Delete message (soft delete)
   */
  async deleteMessage(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { id } = req.params;

      const message = await prisma.message.findUnique({
        where: { id },
      });

      if (!message) {
        return res.status(404).json({
          success: false,
          message: 'Message not found',
        });
      }

      if (message.senderId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'You can only delete your own messages',
        });
      }

      const updatedMessage = await prisma.message.update({
        where: { id },
        data: {
          isDeleted: true,
          deletedAt: new Date(),
          content: '[Message deleted]',
        },
      });

      return res.json({
        success: true,
        message: 'Message deleted successfully',
        data: updatedMessage,
      });
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Mark messages as read
   */
  async markAsRead(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const body = markMessagesAsReadSchema.parse(req.query);

      // Verify user is part of conversation
      const conversation = await prisma.conversation.findUnique({
        where: { id: body.conversationId },
      });

      if (!conversation) {
        return res.status(404).json({
          success: false,
          message: 'Conversation not found',
        });
      }

      if (
        conversation.participant1Id !== userId &&
        conversation.participant2Id !== userId
      ) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized',
        });
      }

      const where: any = {
        conversationId: body.conversationId,
        recipientId: userId!,
        isRead: false,
      };

      if (body.messageIds && body.messageIds.length > 0) {
        where.id = { in: body.messageIds };
      }

      const updated = await prisma.message.updateMany({
        where,
        data: {
          isRead: true,
          readAt: new Date(),
        },
      });

      // Update conversation unread count
      await prisma.conversation.update({
        where: { id: body.conversationId },
        data: {
          participant1Unread:
            conversation.participant1Id === userId ? 0 : conversation.participant1Unread,
          participant2Unread:
            conversation.participant2Id === userId ? 0 : conversation.participant2Unread,
        },
      });

      return res.json({
        success: true,
        message: `${updated.count} message(s) marked as read`,
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
   * Archive/unarchive conversation
   */
  async archiveConversation(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { id } = req.params;
      const { archive } = req.body; // boolean

      const conversation = await prisma.conversation.findUnique({
        where: { id },
      });

      if (!conversation) {
        return res.status(404).json({
          success: false,
          message: 'Conversation not found',
        });
      }

      if (
        conversation.participant1Id !== userId &&
        conversation.participant2Id !== userId
      ) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized',
        });
      }

      const updated = await prisma.conversation.update({
        where: { id },
        data: {
          isArchived: archive === true,
          archivedBy: archive === true ? userId : null,
        },
      });

      return res.json({
        success: true,
        message: `Conversation ${archive ? 'archived' : 'unarchived'} successfully`,
        data: updated,
      });
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Helper: Emit real-time message via Socket.io
   */
  private emitMessage(recipientId: string, message: any): void {
    try {
      const io = getSocketIOInstance();
      if (io) {
        io.to(`user:${recipientId}`).emit('message', {
          type: 'NEW_MESSAGE',
          data: message,
        });
      }
    } catch (error) {
      console.error('Error emitting message:', error);
    }
  }

  /**
   * Helper: Emit message update via Socket.io
   */
  private emitMessageUpdate(userId: string, message: any): void {
    try {
      const io = getSocketIOInstance();
      if (io) {
        io.to(`user:${userId}`).emit('message:update', {
          type: 'MESSAGE_UPDATED',
          data: message,
        });
      }
    } catch (error) {
      console.error('Error emitting message update:', error);
    }
  }
}

export const messageController = new MessageController();

