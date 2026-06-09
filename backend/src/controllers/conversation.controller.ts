/**
 * CRUD for a user's saved conversations and their messages.
 * All routes are scoped to a `userId` URL param; `saveConversation` does
 * an upsert of the conversation row plus a REPLACE INTO of every message
 * (so re-saving an existing conversation just overwrites in place).
 */
import { Request, Response, NextFunction } from 'express';
import { Conversation } from '../types';
import { AppError } from '../middleware/error.middleware';
import db from '../config/database';


// GET /api/conversations/:userId — list summaries (last message preview +
// message count) rather than full message bodies, to keep payloads small.
export const getConversations = async (
  req: Request<{ userId: string }>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      throw new AppError('User ID is required', 400);
    }

    console.log('📡 [Backend] Fetching conversations from database for:', userId);

    const dbConversations = await db.query(
      `SELECT * FROM conversations
       WHERE user_id = ?
       ORDER BY last_message_at DESC`,
      [userId]
    );

    // For each conversation, only fetch message count and last message preview
    const conversations = await Promise.all(
      dbConversations.map(async (conv: any) => {
        // Get message count
        const countResult = await db.queryOne(
          `SELECT COUNT(*) as count FROM messages WHERE conversation_id = ?`,
          [conv.id]
        );
        const messageCount = countResult?.count || 0;

        // Get last message for preview (only the last one, not all messages)
        const lastMessage = await db.queryOne(
          `SELECT id, text, sender, timestamp 
           FROM messages 
           WHERE conversation_id = ? 
           ORDER BY timestamp DESC 
           LIMIT 1`,
          [conv.id]
        );

        return {
          id: conv.id,
          title: conv.title,
          aiModel: {
            name: conv.ai_model_name,
            personality: conv.ai_model_personality,
            icon: conv.ai_model_icon,
            greeting: ''
          },
          messages: lastMessage ? [{
            id: lastMessage.id,
            text: lastMessage.text,
            sender: lastMessage.sender,
            timestamp: new Date(lastMessage.timestamp)
          }] : [],
          messageCount: messageCount, // Add message count separately
          createdAt: new Date(conv.created_at),
          lastMessageAt: new Date(conv.last_message_at)
        };
      })
    );

    console.log(`✅ [Backend] Found ${conversations.length} conversations`);
    console.log(`📋 [Backend] Conversation IDs: ${conversations.map(c => c.id).join(', ')}`);
    console.log(`📋 [Backend] Conversation Titles: ${conversations.map(c => c.title).join(', ')}`);

    res.json({
      success: true,
      conversations
    });
  } catch (error) {
    console.error('❌ [Backend] Error fetching conversations:', error);
    next(error);
  }
};

// GET /api/conversations/:userId/:conversationId — full conversation
// including every message, ordered chronologically.
export const getConversation = async (
  req: Request<{ userId: string; conversationId: string }>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { userId, conversationId } = req.params;

    if (!userId || !conversationId) {
      throw new AppError('User ID and conversation ID are required', 400);
    }

    console.log('🔍 [Backend] Fetching conversation from database:', conversationId);

    const conv = await db.queryOne(
      `SELECT * FROM conversations WHERE id = ? AND user_id = ?`,
      [conversationId, userId]
    );

    if (!conv) {
      throw new AppError('Conversation not found', 404);
    }

    // Fetch messages
    const messages = await db.query(
      `SELECT id, text, sender, timestamp 
       FROM messages 
       WHERE conversation_id = ? 
       ORDER BY timestamp ASC`,
      [conversationId]
    );

    const conversation = {
      id: conv.id,
      title: conv.title,
      aiModel: {
        name: conv.ai_model_name,
        personality: conv.ai_model_personality,
        icon: conv.ai_model_icon,
        greeting: ''
      },
      messages: messages.map((msg: any) => ({
        id: msg.id,
        text: msg.text,
        sender: msg.sender,
        timestamp: new Date(msg.timestamp)
      })),
      createdAt: new Date(conv.created_at),
      lastMessageAt: new Date(conv.last_message_at)
    };

    console.log('✅ [Backend] Conversation found');

    res.json({
      success: true,
      conversation
    });
  } catch (error) {
    console.error('❌ [Backend] Error fetching conversation:', error);
    next(error);
  }
};

// Helper: format a Date as EST (America/New_York) in MySQL DATETIME format.
// MySQL columns store naive datetimes, so timestamps are normalized to a
// single timezone here to keep ordering/comparison consistent regardless
// of the server's or client's local timezone.
const formatAsESTDateTime = (date: Date) => {
  const estDate = new Date(
    date.toLocaleString('en-US', { timeZone: 'America/New_York' })
  );
  const year = estDate.getFullYear();
  const month = String(estDate.getMonth() + 1).padStart(2, '0');
  const day = String(estDate.getDate()).padStart(2, '0');
  const hour = String(estDate.getHours()).padStart(2, '0');
  const minute = String(estDate.getMinutes()).padStart(2, '0');
  const second = String(estDate.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
};

// POST /api/conversations/:userId — upsert: updates the conversation row
// if it exists (title/last_message_at only), otherwise inserts a new one,
// then writes every message via REPLACE INTO so resaving is idempotent.
export const saveConversation = async (
  req: Request<{ userId: string }, {}, Conversation>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { userId } = req.params;
    const conversation = req.body;

    if (!userId) {
      throw new AppError('User ID is required', 400);
    }

    if (!conversation.id || !conversation.messages) {
      throw new AppError('Invalid conversation data', 400);
    }

    console.log('💾 [Backend] Saving conversation to database:', conversation.id);

    // Check if conversation exists
    const existing = await db.queryOne(
      'SELECT id FROM conversations WHERE id = ?',
      [conversation.id]
    );

    if (existing) {
      // Update existing conversation
      // Convert JavaScript Date to MySQL format (force EST)
      const lastMessageAt = formatAsESTDateTime(new Date(conversation.lastMessageAt));
      
      await db.query(
        `UPDATE conversations 
         SET title = ?, last_message_at = ? 
         WHERE id = ?`,
        [conversation.title, lastMessageAt, conversation.id]
      );
    } else {
      // Insert new conversation
      // Convert JavaScript Date to MySQL format (YYYY-MM-DD HH:MM:SS) in EST
      const createdAt = formatAsESTDateTime(new Date(conversation.createdAt));
      const lastMessageAt = formatAsESTDateTime(new Date(conversation.lastMessageAt));
      
      await db.query(
        `INSERT INTO conversations 
         (id, user_id, title, ai_model_name, ai_model_personality, ai_model_icon, created_at, last_message_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          conversation.id,
          userId,
          conversation.title,
          conversation.aiModel.name,
          conversation.aiModel.personality,
          conversation.aiModel.icon,
          createdAt,
          lastMessageAt
        ]
      );
    }

    // Use REPLACE INTO to handle duplicates (deletes and inserts in one atomic operation)
    for (const message of conversation.messages) {
      // Convert JavaScript Date to MySQL format in EST
      const timestamp = formatAsESTDateTime(new Date(message.timestamp));
      
      await db.query(
        `REPLACE INTO messages (id, conversation_id, text, sender, timestamp) 
         VALUES (?, ?, ?, ?, ?)`,
        [message.id, conversation.id, message.text, message.sender, timestamp]
      );
    }

    console.log('✅ [Backend] Conversation saved successfully');

    res.json({
      success: true,
      message: 'Conversation saved successfully',
      conversation
    });
  } catch (error) {
    console.error('❌ [Backend] Error saving conversation:', error);
    next(error);
  }
};

// DELETE /api/conversations/:userId/:conversationId — relies on the
// `user_id` match in the WHERE clause to prevent deleting another user's
// conversation; affectedRows === 0 means "not found or not yours".
export const deleteConversation = async (
  req: Request<{ userId: string; conversationId: string }>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { userId, conversationId } = req.params;

    if (!userId || !conversationId) {
      throw new AppError('User ID and conversation ID are required', 400);
    }

    console.log('🗑️ [Backend] Deleting conversation from database:', conversationId);

    const result = await db.query(
      'DELETE FROM conversations WHERE id = ? AND user_id = ?',
      [conversationId, userId]
    );

    if ((result as any).affectedRows === 0) {
      throw new AppError('Conversation not found', 404);
    }

    console.log('✅ [Backend] Conversation deleted successfully');

    res.json({
      success: true,
      message: 'Conversation deleted successfully'
    });
  } catch (error) {
    console.error('❌ [Backend] Error deleting conversation:', error);
    next(error);
  }
};

