import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import db from '../config/database';
import { configService } from '../services/config.service';

/**
 * Admin login — validates ADMIN_KEY from .env, returns a short-lived JWT with role: 'admin'
 */
export const adminLogin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { adminKey } = req.body;

    // Read admin key from env first, then fall back to configs table
    const expectedKey = process.env.ADMIN_KEY || await configService.getValueByKey('ADMIN_KEY');

    if (!expectedKey) {
      res.status(503).json({ success: false, message: 'Admin access not configured. Set ADMIN_KEY in environment or configs table.' });
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
         COUNT(DISTINCT t.id)  AS task_count,
         COUNT(DISTINCT c.id)  AS conversation_count,
         COUNT(DISTINCT m.id)  AS message_count
       FROM users u
       LEFT JOIN tasks         t ON t.user_id = u.id
       LEFT JOIN conversations c ON c.user_id = u.id
       LEFT JOIN messages      m ON m.conversation_id = c.id
       GROUP BY u.id, u.username, u.email, u.research_key, u.is_active, u.created_at
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
         COUNT(m.id) AS message_count
       FROM conversations c
       LEFT JOIN users    u ON c.user_id  = u.id
       LEFT JOIN messages m ON m.conversation_id = c.id
       GROUP BY c.id, c.title, c.ai_model_name, c.ai_model_personality,
                c.created_at, c.last_message_at,
                u.id, u.username
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

/**
 * Create a new researcher (user)
 */
export const createUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, email, researchKey } = req.body;

    if (!username || !email || !researchKey) {
      res.status(400).json({ success: false, message: 'username, email, and researchKey are required' });
      return;
    }

    const existing = await db.queryOne(
      'SELECT id FROM users WHERE email = ? OR research_key = ?',
      [email, researchKey]
    );
    if (existing) {
      res.status(409).json({ success: false, message: 'Email or research key already exists' });
      return;
    }

    const id = uuidv4();

    await db.query(
      'INSERT INTO users (id, username, email, research_key, is_active) VALUES (?, ?, ?, ?, TRUE)',
      [id, username, email, researchKey]
    );

    const created = await db.queryOne(
      `SELECT u.id, u.username, u.email, u.research_key, u.is_active, u.created_at,
              0 AS task_count, 0 AS conversation_count, 0 AS message_count
       FROM users u WHERE u.id = ?`,
      [id]
    );

    console.log(`✅ [Admin] Created researcher: ${username} (${email})`);
    res.status(201).json({
      success: true,
      data: {
        id: created.id,
        username: created.username,
        email: created.email,
        researchKey: created.research_key,
        isActive: Boolean(created.is_active),
        createdAt: created.created_at,
        taskCount: 0,
        conversationCount: 0,
        messageCount: 0
      }
    });
  } catch (error) {
    console.error('❌ [Admin] Error creating user:', error);
    res.status(500).json({ success: false, message: 'Failed to create researcher' });
  }
};

/**
 * Delete a researcher and all their data
 */
export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;

    const user = await db.queryOne('SELECT id, username FROM users WHERE id = ?', [userId]);
    if (!user) {
      res.status(404).json({ success: false, message: 'Researcher not found' });
      return;
    }

    await db.query('DELETE FROM users WHERE id = ?', [userId]);

    console.log(`✅ [Admin] Deleted researcher: ${user.username} (${userId})`);
    res.json({ success: true, message: 'Researcher deleted successfully' });
  } catch (error) {
    console.error('❌ [Admin] Error deleting user:', error);
    res.status(500).json({ success: false, message: 'Failed to delete researcher' });
  }
};

/**
 * Toggle a researcher's active status
 */
export const toggleUserStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      res.status(400).json({ success: false, message: 'isActive (boolean) is required' });
      return;
    }

    const user = await db.queryOne('SELECT id FROM users WHERE id = ?', [userId]);
    if (!user) {
      res.status(404).json({ success: false, message: 'Researcher not found' });
      return;
    }

    await db.query('UPDATE users SET is_active = ? WHERE id = ?', [isActive ? 1 : 0, userId]);

    console.log(`✅ [Admin] Set researcher ${userId} active=${isActive}`);
    res.json({ success: true });
  } catch (error) {
    console.error('❌ [Admin] Error toggling user status:', error);
    res.status(500).json({ success: false, message: 'Failed to update researcher status' });
  }
};
