import { Router } from 'express';
import {
  getConversations,
  getConversation,
  saveConversation,
  deleteConversation
} from '../controllers/conversation.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// GET /api/conversations/:userId — researcher views their own history (requires auth)
router.get('/:userId', authenticate, getConversations);

// GET /api/conversations/:userId/:conversationId — researcher fetches full convo (requires auth)
router.get('/:userId/:conversationId', authenticate, getConversation);

// POST /api/conversations/:userId — save a conversation
// No auth: participants save under the researcher's UUID without holding a JWT
router.post('/:userId', saveConversation);

// DELETE /api/conversations/:userId/:conversationId — researcher deletes a convo (requires auth)
router.delete('/:userId/:conversationId', authenticate, deleteConversation);

export default router;

