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
  system_prompt: string;
  task_prompt: string | null;
  default_model: string | null;
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
  system_prompt: string;
  task_prompt?: string;
  default_model?: string;
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

