// Admin dashboard routes — separate auth path from researcher accounts
// (ADMIN_KEY → admin JWT via `requireAdmin`). Lets an administrator manage
// researcher accounts and inspect any conversation. Mounted at /api/admin.
import { Router } from 'express';
import {
  adminLogin,
  getAllUsers,
  getAllConversations,
  getConversationMessages,
  createUser,
  deleteUser,
  toggleUserStatus
} from '../controllers/admin.controller';
import { requireAdmin } from '../middleware/auth.middleware';

const router = Router();

// POST /api/admin/login — exchange ADMIN_KEY for a short-lived admin JWT
router.post('/login', adminLogin);

// All routes below require a valid admin JWT
router.get('/users', requireAdmin, getAllUsers);
router.post('/users', requireAdmin, createUser);
router.delete('/users/:userId', requireAdmin, deleteUser);
router.put('/users/:userId/status', requireAdmin, toggleUserStatus);

router.get('/conversations', requireAdmin, getAllConversations);
router.get('/conversations/:conversationId/messages', requireAdmin, getConversationMessages);

export default router;
