import { z } from 'zod';

export const createNotificationSchema = z.object({
  userId: z.string().uuid(),
  type: z.string().min(1),
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(1000),
  data: z.record(z.any()).optional(),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).default('NORMAL').optional(),
  category: z.string().optional(),
  actionUrl: z.string().url().optional(),
  actionLabel: z.string().max(50).optional(),
  expiresAt: z.string().datetime().optional(),
});

export const updateNotificationSchema = z.object({
  isRead: z.boolean().optional(),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).optional(),
});

export const notificationPreferencesSchema = z.object({
  emailNotifications: z.boolean().optional(),
  pushNotifications: z.boolean().optional(),
  bookingNotifications: z.boolean().optional(),
  paymentNotifications: z.boolean().optional(),
  messageNotifications: z.boolean().optional(),
  serviceNotifications: z.boolean().optional(),
  systemNotifications: z.boolean().optional(),
});

export const notificationQuerySchema = z.object({
  isRead: z.coerce.boolean().optional(),
  type: z.string().optional(),
  category: z.string().optional(),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).optional(),
  page: z.coerce.number().int().min(1).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20).optional(),
  sortBy: z.enum(['newest', 'oldest', 'priority']).default('newest').optional(),
});

export const markAsReadSchema = z.object({
  notificationIds: z.array(z.string().uuid()).min(1),
});

export type CreateNotificationInput = z.infer<typeof createNotificationSchema>;
export type UpdateNotificationInput = z.infer<typeof updateNotificationSchema>;
export type NotificationPreferencesInput = z.infer<typeof notificationPreferencesSchema>;
export type NotificationQueryInput = z.infer<typeof notificationQuerySchema>;
export type MarkAsReadInput = z.infer<typeof markAsReadSchema>;

