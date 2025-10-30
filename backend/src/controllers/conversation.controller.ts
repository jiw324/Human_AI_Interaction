import { Request, Response, NextFunction } from 'express';
import { Conversation } from '../types';
import { AppError } from '../middleware/error.middleware';

// In-memory storage for conversations (replace with database in production)
const conversationStore: Map<string, Conversation[]> = new Map();

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

    const conversations = conversationStore.get(userId) || [];

    res.json({
      success: true,
      conversations: conversations.sort((a, b) => 
        b.lastMessageAt.getTime() - a.lastMessageAt.getTime()
      )
    });
  } catch (error) {
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

    const conversations = conversationStore.get(userId) || [];
    const conversation = conversations.find(c => c.id === conversationId);

    if (!conversation) {
      throw new AppError('Conversation not found', 404);
    }

    res.json({
      success: true,
      conversation
    });
  } catch (error) {
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

    const conversations = conversationStore.get(userId) || [];
    const existingIndex = conversations.findIndex(c => c.id === conversation.id);

    if (existingIndex >= 0) {
      conversations[existingIndex] = conversation;
    } else {
      conversations.push(conversation);
    }

    conversationStore.set(userId, conversations);

    res.json({
      success: true,
      message: 'Conversation saved successfully',
      conversation
    });
  } catch (error) {
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

    const conversations = conversationStore.get(userId) || [];
    const filteredConversations = conversations.filter(c => c.id !== conversationId);

    if (filteredConversations.length === conversations.length) {
      throw new AppError('Conversation not found', 404);
    }

    conversationStore.set(userId, filteredConversations);

    res.json({
      success: true,
      message: 'Conversation deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

