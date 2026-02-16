import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import db from '../config/database';
import { configService } from '../services/config.service';

/**
 * Admin login — validates ADMIN_KEY from .env, returns a short-lived JWT with role: 'admin'
 */
export const adminLogin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { adminKey } = req.body;

    // Read admin key from the configs table (never from .env)
    const expectedKey = await configService.getValueByKey('ADMIN_KEY');

    if (!expectedKey) {
      res.status(503).json({ success: false, message: 'Admin access not configured. Set ADMIN_KEY in the configs table.' });
      return;
    }

    if (!adminKey || adminKey !== expectedKey) {
      res.status(401).json({ success: false, message: 'Invalid admin key' });
      return;
    }

    const jwtSecret = process.env.JWT_SECRET || 'fallback-secret-key';
    const token = jwt.sign({ role: 'admin' }, jwtSecret, { expiresIn: '8h' });

    console.log('✅ [Admin] Admin login successful');
    res.json({ success: true, token });
  } catch (error) {
    console.error('❌ [Admin] Login error:', error);
    res.status(500).json({ success: false, message: 'Admin login failed' });
  }
};

/**
 * Get all users with task and conversation counts
 */
export const getAllUsers = async (_req: Request, res: Response): Promise<void> => {
  try {
    console.log('👥 [Admin] Fetching all users');

    const users = await db.query(
      `SELECT
         u.id,
         u.username,
         u.email,
         u.research_key,
         u.is_active,
         u.created_at,
         u.last_login,
         COUNT(DISTINCT t.id)  AS task_count,
         COUNT(DISTINCT c.id)  AS conversation_count,
         COUNT(DISTINCT m.id)  AS message_count
       FROM users u
       LEFT JOIN tasks         t ON t.user_id        = u.id AND t.is_active = TRUE
       LEFT JOIN conversations c ON c.user_id        = u.id
       LEFT JOIN messages      m ON m.conversation_id = c.id
       GROUP BY u.id, u.username, u.email, u.research_key, u.is_active, u.created_at, u.last_login
       ORDER BY u.created_at ASC`,
      []
    );

    console.log(`📊 [Admin] Found ${users.length} users`);

    res.json({
      success: true,
      data: users.map((u: any) => ({
        id: u.id,
        username: u.username,
        email: u.email,
        researchKey: u.research_key,
        isActive: Boolean(u.is_active),
        createdAt: u.created_at,
        lastLogin: u.last_login,
        taskCount: Number(u.task_count),
        conversationCount: Number(u.conversation_count),
        messageCount: Number(u.message_count)
      }))
    });
  } catch (error) {
    console.error('❌ [Admin] Error fetching users:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch users' });
  }
};

/**
 * Get all conversations (across all users) with message counts
 */
export const getAllConversations = async (_req: Request, res: Response): Promise<void> => {
  try {
    console.log('💬 [Admin] Fetching all conversations');

    const conversations = await db.query(
      `SELECT
         c.id,
         c.title,
         c.ai_model_name,
         c.ai_model_personality,
         c.created_at,
         c.last_message_at,
         u.id       AS user_id,
         u.username AS username,
         t.id       AS task_id,
         t.name     AS task_name,
         COUNT(m.id) AS message_count
       FROM conversations c
       LEFT JOIN users    u ON c.user_id  = u.id
       LEFT JOIN tasks    t ON c.task_id  = t.id
       LEFT JOIN messages m ON m.conversation_id = c.id
       GROUP BY c.id, c.title, c.ai_model_name, c.ai_model_personality,
                c.created_at, c.last_message_at,
                u.id, u.username, t.id, t.name
       ORDER BY c.last_message_at DESC`,
      []
    );

    console.log(`📊 [Admin] Found ${conversations.length} conversations`);

    res.json({
      success: true,
      data: conversations.map((c: any) => ({
        id: c.id,
        title: c.title,
        aiModelName: c.ai_model_name,
        aiModelPersonality: c.ai_model_personality,
        createdAt: c.created_at,
        lastMessageAt: c.last_message_at,
        userId: c.user_id,
        username: c.username,
        taskId: c.task_id,
        taskName: c.task_name,
        messageCount: Number(c.message_count)
      }))
    });
  } catch (error) {
    console.error('❌ [Admin] Error fetching conversations:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch conversations' });
  }
};

/**
 * Get all messages for a specific conversation
 */
export const getConversationMessages = async (req: Request, res: Response): Promise<void> => {
  try {
    const { conversationId } = req.params;

    console.log(`📨 [Admin] Fetching messages for conversation: ${conversationId}`);

    const messages = await db.query(
      `SELECT id, text, sender, timestamp
       FROM messages
       WHERE conversation_id = ?
       ORDER BY timestamp ASC`,
      [conversationId]
    );

    res.json({ success: true, data: messages });
  } catch (error) {
    console.error('❌ [Admin] Error fetching messages:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch messages' });
  }
};
