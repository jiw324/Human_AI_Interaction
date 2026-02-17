// ============================================
// Database Type Definitions
// Core Tables Only (Simplified Version)
// ============================================

export interface User {
  id: string;
  username: string;
  email: string;
  research_key: string | null;
  is_active: boolean;
  created_at: Date;
}

export interface Task {
  id: string;
  user_id: string;
  name: string;
  // AI Model Settings
  personality: string;
  response_speed: number;
  creativity: number;
  helpfulness: number;
  verbosity: number;
  temperature: number;
  max_tokens: number;
  system_prompt: string;
  task_prompt: string | null;
  // System Configuration (Task-specific)
  llama_base_url: string;
  llama_service_url: string | null;
  llama_api_key: string | null;
  openai_api_key: string | null;
  anthropic_api_key: string | null;
  default_model: string | null;
  auto_update_robot_list: boolean;
  // Metadata
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

// ============================================
// Request/Response Types
// ============================================

export interface CreateUserRequest {
  username: string;
  email: string;
  research_key: string;
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

export interface GetUserTasksParams {
  user_id: string;
}

export interface GetModelsByProviderParams {
  provider: string;
}

