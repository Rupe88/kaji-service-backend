import { z } from 'zod';

export const createMessageSchema = z.object({
  conversationId: z.string().uuid().optional(),
  recipientId: z.string().uuid('Invalid recipient ID'),
  serviceId: z.string().uuid().optional(),
  bookingId: z.string().uuid().optional(),
  content: z.string().min(1, 'Message cannot be empty').max(5000, 'Message too long'),
  messageType: z.enum(['TEXT', 'IMAGE', 'FILE', 'SYSTEM']).default('TEXT').optional(),
  attachments: z.array(z.object({
    url: z.string().url(),
    type: z.string(),
    name: z.string().optional(),
    size: z.number().optional(),
  })).max(10).optional(),
});

export const updateMessageSchema = z.object({
  content: z.string().min(1).max(5000),
});

export const conversationQuerySchema = z.object({
  serviceId: z.string().uuid().optional(),
  bookingId: z.string().uuid().optional(),
  isArchived: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20).optional(),
});

export const messageQuerySchema = z.object({
  conversationId: z.string().uuid(),
  before: z.string().datetime().optional(), // For pagination
  limit: z.coerce.number().int().min(1).max(100).default(50).optional(),
});

export const markMessagesAsReadSchema = z.object({
  conversationId: z.string().uuid(),
  messageIds: z.array(z.string().uuid()).optional(), // If not provided, mark all as read
});

export type CreateMessageInput = z.infer<typeof createMessageSchema>;
export type UpdateMessageInput = z.infer<typeof updateMessageSchema>;
export type ConversationQueryInput = z.infer<typeof conversationQuerySchema>;
export type MessageQueryInput = z.infer<typeof messageQuerySchema>;
export type MarkMessagesAsReadInput = z.infer<typeof markMessagesAsReadSchema>;

