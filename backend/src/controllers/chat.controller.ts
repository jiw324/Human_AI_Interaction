import { Request, Response, NextFunction } from 'express';
import { ChatRequest, ChatResponse, Message } from '../types';
import { AppError } from '../middleware/error.middleware';
import { v4 as uuidv4 } from 'uuid';

// Simulated AI response generator
const generateAIResponse = async (
  userMessage: string,
  _aiModel: any,
  settings?: any
): Promise<string> => {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1500));

  // Generate contextual response based on personality
  const responses = {
    analytical: [
      `Let me analyze that systematically. ${userMessage.includes('?') ? 'Based on the available data...' : 'From an analytical perspective...'}`,
      `Breaking this down into components: ${userMessage.toLowerCase().includes('how') ? 'The process involves...' : 'The key factors are...'}`,
      `Looking at this objectively, ${userMessage.toLowerCase().includes('what') ? 'the fundamental concept is...' : 'we can observe that...'}`
    ],
    creative: [
      `What an interesting thought! ${userMessage.includes('?') ? "Let's explore this creatively..." : "I'm imagining..."}`,
      `That sparks an idea! ${userMessage.toLowerCase().includes('how') ? "Here's an innovative approach..." : "Let me paint you a picture..."}`,
      `Fascinating! ${userMessage.toLowerCase().includes('what') ? "Think of it like..." : "Here's a fresh perspective..."}`
    ],
    expert: [
      `As an expert in this domain, I can explain that ${userMessage.includes('?') ? 'the answer involves...' : 'this relates to...'}`,
      `From my extensive experience, ${userMessage.toLowerCase().includes('how') ? 'the best practice is...' : 'the established principle is...'}`,
      `Based on research and practical application, ${userMessage.toLowerCase().includes('what') ? 'the definition encompasses...' : 'we understand that...'}`
    ],
    friendly: [
      `Hey! Great question! ${userMessage.includes('?') ? "I'd be happy to help with that!" : "Let me share my thoughts!"}`,
      `Oh, I love talking about this! ${userMessage.toLowerCase().includes('how') ? "Here's how it works..." : "So basically..."}`,
      `That's a really good point! ${userMessage.toLowerCase().includes('what') ? "To put it simply..." : "You know what I think?..."}`
    ]
  };

  const personality = settings?.personality?.toLowerCase() || 'friendly';
  const responseSet = responses[personality as keyof typeof responses] || responses.friendly;
  const selectedResponse = responseSet[Math.floor(Math.random() * responseSet.length)];

  // Add elaboration based on verbosity
  const verbosity = settings?.verbosity || 50;
  let elaboration = '';
  
  if (verbosity > 70) {
    elaboration = ' Furthermore, it\'s worth noting that this connects to broader concepts and has several important implications. The nuances here are quite fascinating when you examine them closely.';
  } else if (verbosity > 40) {
    elaboration = ' This is particularly relevant because it connects to some key principles in the field.';
  }

  return selectedResponse + elaboration;
};

export const sendMessage = async (
  req: Request<{}, {}, ChatRequest>,
  res: Response<ChatResponse>,
  next: NextFunction
) => {
  try {
    const { message, conversationId, aiModel, settings } = req.body;

    if (!message || !message.trim()) {
      throw new AppError('Message is required', 400);
    }

    if (!conversationId) {
      throw new AppError('Conversation ID is required', 400);
    }

    if (!aiModel) {
      throw new AppError('AI Model is required', 400);
    }

    // Generate AI response
    const aiResponseText = await generateAIResponse(message, aiModel, settings);

    // Create response message
    const responseMessage: Message = {
      id: uuidv4(),
      text: aiResponseText,
      sender: 'ai',
      timestamp: new Date()
    };

    res.json({
      success: true,
      response: responseMessage
    });
  } catch (error) {
    next(error);
  }
};

export const streamMessage = async (
  req: Request<{}, {}, ChatRequest>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { message, aiModel, settings } = req.body;

    if (!message || !message.trim()) {
      throw new AppError('Message is required', 400);
    }

    // Set up SSE (Server-Sent Events)
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Generate response
    const aiResponseText = await generateAIResponse(message, aiModel, settings);

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
  } catch (error) {
    next(error);
  }
};

