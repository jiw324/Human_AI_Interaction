/**
 * Shared backend type definitions for chat/conversation/auth payloads.
 * These mirror the shapes the frontend sends and expects — keep them in
 * sync with `frontend/src/services/api.ts` and the database row shapes
 * in `database.types.ts` (controllers translate between the two).
 */

export interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

export interface AIModel {
  id: string;
  name: string;
  greeting: string;
  description: string;
  personality?: string;
  icon?: string;
}

// Per-model AI behavior config: systemPrompt drives the AI's persona,
// taskPrompt is shown to the participant as the task description/greeting.
export interface AISettings {
  systemPrompt: string;
  taskPrompt: string;
  defaultModel?: string;
}

export interface Conversation {
  id: string;
  title: string;
  aiModel: AIModel;
  messages: Message[];
  createdAt: Date;
  lastMessageAt: Date;
}

export interface AuthRequest {
  researchKey: string;
}

export interface AuthResponse {
  success: boolean;
  token?: string;
  message: string;
}

export interface ChatRequest {
  message: string;
  conversationId: string;
  aiModel: AIModel;
  settings?: AISettings;
  messageHistory?: Message[];
}

export interface ChatResponse {
  success: boolean;
  response?: Message;
  error?: string;
}

export interface User {
  id: string;
  isAuthenticated: boolean;
}

