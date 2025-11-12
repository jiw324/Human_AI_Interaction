import { Request, Response, NextFunction } from 'express';
import { ChatRequest, ChatResponse, Message } from '../types';
import { AppError } from '../middleware/error.middleware';
import { v4 as uuidv4 } from 'uuid';
import { liteLLMService } from '../services/litellm.service';
import { LiteLLMMessage } from '../types/litellm.types';

/**
 * Generate AI response using LiteLLM service
 * 
 * Flow:
 * 1. System Prompt: Sets the AI's behavior and personality (from task settings)
 * 2. Task Prompt: Displayed as initial greeting to user (shown in chat UI)
 * 3. Conversation History: Previous messages for context
 * 4. User Message: Current user input
 * 
 * The System Prompt instructs the AI on HOW to respond
 * The Task Prompt tells the USER what the task is about
 */
const generateAIResponse = async (
  userMessage: string,
  aiModel: any,
  settings?: any,
  messageHistory?: Message[]
): Promise<string> => {
  try {
    console.log(`🤖 [Chat] Generating AI response using ${settings?.modelId || 'default model'}...`);
    
    // Build message history for LiteLLM in the correct format
    const messages: LiteLLMMessage[] = [];
    
    // 1. Add System Prompt - This sets the AI's behavior and personality
    // Example: "You are a helpful AI assistant. Be friendly, informative, and engaging."
    if (settings?.systemPrompt) {
      console.log(`📋 [Chat] Using System Prompt: "${settings.systemPrompt.substring(0, 50)}..."`);
      messages.push({
        role: 'system',
        content: settings.systemPrompt,
      });
    }
    
    // Add conversation history (last 10 messages for context)
    if (messageHistory && messageHistory.length > 0) {
      const recentHistory = messageHistory.slice(-10);
      for (const msg of recentHistory) {
        if (msg.sender === 'user') {
          messages.push({
            role: 'user',
            content: msg.text,
          });
        } else if (msg.sender === 'ai') {
          messages.push({
            role: 'assistant',
            content: msg.text,
          });
        }
      }
    }
    
    // Add current user message
    messages.push({
      role: 'user',
      content: userMessage,
    });
    
    console.log(`📝 [Chat] Message history: ${messages.length} messages`);
    
    // Call LiteLLM service
    const response = await liteLLMService.sendChatCompletion(
      messages,
      settings?.modelId,
      settings?.temperature,
      settings?.maxTokens,
      settings?.topP,
      settings?.presencePenalty,
      settings?.frequencyPenalty
    );
    
    if (response.success && response.data?.choices?.[0]?.message?.content) {
      const aiMessage = response.data.choices[0].message.content;
      console.log(`✅ [Chat] AI response generated (${aiMessage.length} characters)`);
      return aiMessage;
    } else {
      console.error(`❌ [Chat] LiteLLM failed: ${response.error}`);
      throw new Error(response.error || 'Failed to generate AI response');
    }
  } catch (error) {
    console.error('❌ [Chat] Error generating AI response:', error);
    
    // Fallback to a simple response
    console.log('⚠️ [Chat] Using fallback response due to LiteLLM error');
    return `I apologize, but I'm having trouble connecting to the AI service right now. Error: ${(error as Error).message}. Please check your LiteLLM configuration or try again later.`;
  }
};

export const sendMessage = async (
  req: Request<{}, {}, ChatRequest>,
  res: Response<ChatResponse>,
  next: NextFunction
) => {
  try {
    const { message, conversationId, aiModel, settings, messageHistory } = req.body;

    if (!message || !message.trim()) {
      throw new AppError('Message is required', 400);
    }

    if (!conversationId) {
      throw new AppError('Conversation ID is required', 400);
    }

    if (!aiModel) {
      throw new AppError('AI Model is required', 400);
    }

    console.log(`💬 [Chat] Processing message for conversation: ${conversationId}`);

    // Generate AI response using LiteLLM
    const aiResponseText = await generateAIResponse(message, aiModel, settings, messageHistory);

    // Create response message
    const responseMessage: Message = {
      id: uuidv4(),
      text: aiResponseText,
      sender: 'ai',
      timestamp: new Date()
    };

    console.log(`✅ [Chat] Response sent successfully`);

    res.json({
      success: true,
      response: responseMessage
    });
  } catch (error) {
    console.error('❌ [Chat] Error in sendMessage:', error);
    next(error);
  }
};

export const streamMessage = async (
  req: Request<{}, {}, ChatRequest>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { message, aiModel, settings, messageHistory } = req.body;

    if (!message || !message.trim()) {
      throw new AppError('Message is required', 400);
    }

    console.log(`📡 [Chat] Streaming message...`);

    // Set up SSE (Server-Sent Events)
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Generate response using LiteLLM
    const aiResponseText = await generateAIResponse(message, aiModel, settings, messageHistory);

    // Stream response word by word
    const words = aiResponseText.split(' ');
    for (let i = 0; i < words.length; i++) {
      const chunk = words[i] + (i < words.length - 1 ? ' ' : '');
      res.write(`data: ${JSON.stringify({ chunk, done: false })}\n\n`);
      await new Promise(resolve => setTimeout(resolve, 50)); // Delay between words
    }

    // Send completion signal
    res.write(`data: ${JSON.stringify({ chunk: '', done: true })}\n\n`);
    res.end();

    console.log(`✅ [Chat] Streaming completed`);
  } catch (error) {
    console.error('❌ [Chat] Error in streamMessage:', error);
    next(error);
  }
};

