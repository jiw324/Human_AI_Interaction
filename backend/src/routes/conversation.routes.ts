import { Router } from 'express';
import {
  getConversations,
  getConversation,
  saveConversation,
  deleteConversation
} from '../controllers/conversation.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

/**
 * GET /api/conversations/:userId
 * Get all conversations for a user
 */
router.get('/:userId', authenticate, getConversations);

/**
 * GET /api/conversations/:userId/:conversationId
 * Get a specific conversation
 */
router.get('/:userId/:conversationId', authenticate, getConversation);

/**
 * POST /api/conversations/:userId
 * Save a conversation
 */
router.post('/:userId', authenticate, saveConversation);

/**
 * DELETE /api/conversations/:userId/:conversationId
 * Delete a conversation
 */
router.delete('/:userId/:conversationId', authenticate, deleteConversation);

export default router;

