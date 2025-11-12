import { Request, Response, NextFunction } from 'express';
import { Conversation } from '../types';
import { AppError } from '../middleware/error.middleware';
import db from '../config/database';

/**
 * Ensure user exists in database (auto-create for device IDs)
 */
async function ensureUserExists(userId: string): Promise<void> {
  try {
    const existingUser = await db.queryOne(
      'SELECT id FROM users WHERE id = ?',
      [userId]
    );
    
    if (!existingUser) {
      // Auto-create user record for this device
      await db.query(
        `INSERT INTO users (id, username, email, password_hash, research_key) 
         VALUES (?, ?, ?, ?, ?)`,
        [
          userId,
          `device_${userId.substring(0, 8)}`, // Username: device_xxxxxxxx
          `${userId}@device.local`, // Email: deviceid@device.local
          '', // No password for device users
          null // NULL for research_key (empty string would violate UNIQUE constraint)
        ]
      );
      console.log('✨ [Backend] Auto-created user record for device:', userId);
    }
  } catch (error) {
    console.error('⚠️ [Backend] Error ensuring user exists:', error);
    // Don't throw - let the conversation operation continue
  }
}

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

    console.log('📡 [Backend] Fetching conversations from database for device:', userId);
    
    // Auto-create user record if device ID doesn't exist
    await ensureUserExists(userId);

    // Fetch conversations from database
    const dbConversations = await db.query(
      `SELECT * FROM conversations 
       WHERE user_id = ? 
       ORDER BY last_message_at DESC`,
      [userId]
    );

    // Fetch messages for each conversation
    const conversations = await Promise.all(
      dbConversations.map(async (conv: any) => {
        const messages = await db.query(
          `SELECT id, text, sender, timestamp 
           FROM messages 
           WHERE conversation_id = ? 
           ORDER BY timestamp ASC`,
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
          messages: messages.map((msg: any) => ({
            id: msg.id,
            text: msg.text,
            sender: msg.sender,
            timestamp: new Date(msg.timestamp)
          })),
          createdAt: new Date(conv.created_at),
          lastMessageAt: new Date(conv.last_message_at)
        };
      })
    );

    console.log(`✅ [Backend] Found ${conversations.length} conversations`);

    res.json({
      success: true,
      conversations
    });
  } catch (error) {
    console.error('❌ [Backend] Error fetching conversations:', error);
    next(error);
  }
};

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

    // Fetch conversation
    const conv = await db.queryOne(
      `SELECT * FROM conversations 
       WHERE id = ? AND user_id = ?`,
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
    
    // Auto-create user record if device ID doesn't exist
    await ensureUserExists(userId);

    // Check if conversation exists
    const existing = await db.queryOne(
      'SELECT id FROM conversations WHERE id = ?',
      [conversation.id]
    );

    if (existing) {
      // Update existing conversation
      // Convert JavaScript Date to MySQL format
      const lastMessageAt = new Date(conversation.lastMessageAt).toISOString().slice(0, 19).replace('T', ' ');
      
      await db.query(
        `UPDATE conversations 
         SET title = ?, last_message_at = ? 
         WHERE id = ?`,
        [conversation.title, lastMessageAt, conversation.id]
      );
    } else {
      // Insert new conversation
      // Convert JavaScript Date to MySQL format (YYYY-MM-DD HH:MM:SS)
      const createdAt = new Date(conversation.createdAt).toISOString().slice(0, 19).replace('T', ' ');
      const lastMessageAt = new Date(conversation.lastMessageAt).toISOString().slice(0, 19).replace('T', ' ');
      
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

    // Delete old messages and insert new ones
    await db.query('DELETE FROM messages WHERE conversation_id = ?', [conversation.id]);
    
    for (const message of conversation.messages) {
      // Convert JavaScript Date to MySQL format
      const timestamp = new Date(message.timestamp).toISOString().slice(0, 19).replace('T', ' ');
      
      await db.query(
        `INSERT INTO messages (id, conversation_id, text, sender, timestamp) 
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

    // Delete conversation (messages will cascade delete)
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

