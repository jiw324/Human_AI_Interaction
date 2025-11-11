// ============================================
// Database Type Definitions
// ============================================

export interface User {
  id: string;
  username: string;
  email: string;
  password_hash: string;
  research_key: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  last_login: Date | null;
}

export interface Task {
  id: string;
  user_id: string;
  name: string;
  personality: string;
  response_speed: number;
  creativity: number;
  helpfulness: number;
  verbosity: number;
  temperature: number;
  max_tokens: number;
  system_prompt: string;
  task_prompt: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface AIModel {
  id: string;
  name: string;
  model_id: string;
  provider: string;
  status: 'available' | 'unavailable' | 'unknown';
  description: string | null;
  max_tokens: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Conversation {
  id: string;
  user_id: string;
  task_id: string | null;
  title: string;
  ai_model_id: string | null;
  ai_model_name: string | null;
  ai_greeting: string | null;
  ai_personality: string | null;
  ai_icon: string | null;
  message_count: number;
  created_at: Date;
  updated_at: Date;
  last_message_at: Date;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender: 'user' | 'ai';
  content: string;
  tokens_used: number;
  created_at: Date;
}

export interface SystemConfig {
  id: number;
  user_id: string;
  config_key: string;
  config_value: string | null;
  is_encrypted: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface SessionToken {
  id: number;
  user_id: string;
  token_hash: string;
  expires_at: Date;
  is_revoked: boolean;
  created_at: Date;
}

export interface ActivityLog {
  id: number;
  user_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  details: any; // JSON object
  ip_address: string | null;
  user_agent: string | null;
  created_at: Date;
}

// ============================================
// View Types
// ============================================

export interface ViewUserTask extends Task {
  username: string;
  email: string;
}

export interface ViewConversationSummary {
  id: string;
  user_id: string;
  title: string;
  ai_model_name: string | null;
  message_count: number;
  created_at: Date;
  last_message_at: Date;
  username: string;
  actual_message_count: number;
}

export interface ViewUserActivity {
  user_id: string;
  username: string;
  email: string;
  task_count: number;
  conversation_count: number;
  message_count: number;
  last_activity: Date | null;
  user_since: Date;
}

// ============================================
// Request/Response Types
// ============================================

export interface CreateUserRequest {
  username: string;
  email: string;
  password: string;
  research_key?: string;
}

export interface CreateTaskRequest {
  name: string;
  personality?: string;
  response_speed?: number;
  creativity?: number;
  helpfulness?: number;
  verbosity?: number;
  temperature?: number;
  max_tokens?: number;
  system_prompt: string;
  task_prompt?: string;
}

export interface UpdateTaskRequest extends Partial<CreateTaskRequest> {}

export interface CreateConversationRequest {
  task_id?: string;
  title: string;
  ai_model_name?: string;
  initial_message?: string;
}

export interface CreateMessageRequest {
  sender: 'user' | 'ai';
  content: string;
  tokens_used?: number;
}

// ============================================
// Database Response Types
// ============================================

export interface DatabaseResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ============================================
// Stored Procedure Parameter Types
// ============================================

export interface CreateConversationParams {
  user_id: string;
  task_id?: string;
  title: string;
  ai_model_name?: string;
  initial_message?: string;
}

export interface AddMessageParams {
  conversation_id: string;
  sender: 'user' | 'ai';
  content: string;
  tokens_used?: number;
}

