import { Router } from 'express';
import { messageController } from '../controllers/message.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../utils/validation';
import {
  createMessageSchema,
  updateMessageSchema,
  conversationQuerySchema,
  messageQuerySchema,
  markMessagesAsReadSchema,
} from '../types/message.types';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Conversation routes
router.get(
  '/conversations',
  validate(conversationQuerySchema),
  messageController.getConversations.bind(messageController)
);

router.get(
  '/conversations/:id',
  messageController.getConversationById.bind(messageController)
);

router.put(
  '/conversations/:id/archive',
  messageController.archiveConversation.bind(messageController)
);

// Message routes
router.post(
  '/',
  validate(createMessageSchema),
  messageController.sendMessage.bind(messageController)
);

router.get(
  '/',
  validate(messageQuerySchema),
  messageController.getMessages.bind(messageController)
);

router.put(
  '/:id',
  validate(updateMessageSchema),
  messageController.updateMessage.bind(messageController)
);

router.delete(
  '/:id',
  messageController.deleteMessage.bind(messageController)
);

router.put(
  '/mark-read',
  validate(markMessagesAsReadSchema),
  messageController.markAsRead.bind(messageController)
);

export default router;

