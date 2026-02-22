// API Service for backend communication
// In production, default to the commresearch-dev host (or override with VITE_API_URL).
// In development, default to the local backend on port 3001 (or override with VITE_API_URL).
// This value is baked into the build output, so remember to rebuild before deploying.
export const API_BASE_URL =
  import.meta.env.VITE_API_URL ??
  (import.meta.env.PROD
    ? 'https://commresearch-dev.org.ohio-state.edu/api'
    : 'http://localhost:3001/api');

// Types matching backend
export interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

export interface AIModel {
  id?: string;
  name: string;
  greeting: string;
  description?: string;
  personality?: 'friendly' | 'professional' | 'casual' | 'enthusiastic';
  icon?: string;
}

export interface AISettings {
  systemPrompt: string;
  taskPrompt: string;
  defaultModel?: string;
  chatbotName?: string;
}

export interface Conversation {
  id: string;
  title: string;
  aiModel: AIModel;
  messages: Message[];
  messageCount?: number; // Total message count (used in history display)
  createdAt: Date;
  lastMessageAt: Date;
}

// Auth token management
export const authService = {
  getToken: (): string | null => {
    return localStorage.getItem('authToken');
  },

  setToken: (token: string): void => {
    localStorage.setItem('authToken', token);
  },

  clearToken: (): void => {
    localStorage.removeItem('authToken');
  },

  isAuthenticated: (): boolean => {
    return !!authService.getToken();
  },

  /** Decode the JWT payload (no signature verification needed — just for display).
   *  Returns the user's `id` field from the token, or null if not logged in. */
  getUserId: (): string | null => {
    const token = authService.getToken();
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.id ?? null;
    } catch {
      return null;
    }
  }
};

// HTTP helper with auth
async function fetchAPI(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = authService.getToken();

  // Use a simple string map for headers to avoid type issues when adding Authorization
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined || {})
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
    cache: 'no-store'
  });

  return response;
}

// Authentication API
export const authAPI = {
  login: async (researchKey: string): Promise<{ success: boolean; token?: string; message: string }> => {
    try {
      const response = await fetchAPI('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ researchKey })
      });

      const data = await response.json();

      if (data.success && data.token) {
        authService.setToken(data.token);
      }

      return data;
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        message: 'Failed to connect to the backend server. Please try again later or contact the administrator.'
      };
    }
  },

  verify: async (): Promise<boolean> => {
    try {
      const response = await fetchAPI('/auth/verify');
      const data = await response.json();
      return data.success;
    } catch (error) {
      return false;
    }
  },

  logout: (): void => {
    authService.clearToken();
  }
};

// Chat API
export const chatAPI = {
  sendMessage: async (
    message: string,
    conversationId: string,
    aiModel: AIModel,
    settings?: AISettings,
    messageHistory?: Message[]
  ): Promise<{ success: boolean; response?: Message; error?: string }> => {
    try {
      const response = await fetchAPI('/chat/message', {
        method: 'POST',
        body: JSON.stringify({
          message,
          conversationId,
          aiModel,
          settings,
          messageHistory
        })
      });

      const data = await response.json();

      if (data.success && data.response) {
        // Convert timestamp string to Date object
        data.response.timestamp = new Date(data.response.timestamp);
      }

      return data;
    } catch (error) {
      console.error('Chat error:', error);
      return {
        success: false,
        error: 'Failed to send message. Make sure backend is running.'
      };
    }
  }
};

// Settings API
export const settingsAPI = {
  getSettings: async (userId: string): Promise<Record<string, AISettings> | null> => {
    try {
      const response = await fetchAPI(`/settings/${userId}`);
      const data = await response.json();

      if (data.success) {
        return data.settings;
      }
      return null;
    } catch (error) {
      console.error('Get settings error:', error);
      return null;
    }
  },

  updateSettings: async (
    userId: string,
    modelName: string,
    settings: AISettings
  ): Promise<boolean> => {
    try {
      const response = await fetchAPI(`/settings/${userId}/${modelName}`, {
        method: 'PUT',
        body: JSON.stringify(settings)
      });

      const data = await response.json();
      return data.success;
    } catch (error) {
      console.error('Update settings error:', error);
      return false;
    }
  },

  resetSettings: async (userId: string, modelName: string): Promise<boolean> => {
    try {
      const response = await fetchAPI(`/settings/${userId}/${modelName}`, {
        method: 'DELETE'
      });

      const data = await response.json();
      return data.success;
    } catch (error) {
      console.error('Reset settings error:', error);
      return false;
    }
  }
};

// Conversations API
export const conversationsAPI = {
  getAll: async (userId: string): Promise<Conversation[]> => {
    try {
      const response = await fetchAPI(`/conversations/${userId}`);
      const data = await response.json();

      if (data.success) {
        // Convert date strings to Date objects
        return data.conversations.map((conv: any) => ({
          ...conv,
          createdAt: new Date(conv.createdAt),
          lastMessageAt: new Date(conv.lastMessageAt),
          messages: conv.messages.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }))
        }));
      }
      return [];
    } catch (error) {
      console.error('Get conversations error:', error);
      return [];
    }
  },

  getOne: async (userId: string, conversationId: string): Promise<Conversation | null> => {
    try {
      const response = await fetchAPI(`/conversations/${userId}/${conversationId}`);
      const data = await response.json();

      if (data.success && data.conversation) {
        // Convert date strings to Date objects
        return {
          ...data.conversation,
          createdAt: new Date(data.conversation.createdAt),
          lastMessageAt: new Date(data.conversation.lastMessageAt),
          messages: data.conversation.messages.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }))
        };
      }
      return null;
    } catch (error) {
      console.error('Get conversation error:', error);
      return null;
    }
  },

  save: async (userId: string, conversation: Conversation): Promise<boolean> => {
    try {
      const response = await fetchAPI(`/conversations/${userId}`, {
        method: 'POST',
        body: JSON.stringify(conversation)
      });

      const data = await response.json();
      return data.success;
    } catch (error) {
      console.error('Save conversation error:', error);
      return false;
    }
  },

  delete: async (userId: string, conversationId: string): Promise<boolean> => {
    try {
      const response = await fetchAPI(`/conversations/${userId}/${conversationId}`, {
        method: 'DELETE'
      });

      const data = await response.json();
      return data.success;
    } catch (error) {
      console.error('Delete conversation error:', error);
      return false;
    }
  }
};

// Health check
export const healthAPI = {
  check: async (): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE_URL}/health`);
      const data = await response.json();
      return data.status === 'ok';
    } catch (error) {
      console.error('Health check error:', error);
      return false;
    }
  }
};

// Task interface
export interface Task {
  id: string;
  name: string;
  settings: AISettings;
}

// Research Groups API (public — no auth required)
export interface ResearchGroup {
  id: string;
  name: string;
  taskCount: number;
}

export const groupsAPI = {
  getAll: async (): Promise<ResearchGroup[]> => {
    try {
      const response = await fetchAPI('/tasks/groups');
      const data = await response.json();
      if (data.success) return data.data;
      return [];
    } catch (error) {
      console.error('❌ Get research groups error:', error);
      return [];
    }
  }
};

// Tasks API
export const tasksAPI = {
  getByUserId: async (userId: string): Promise<Task[] | null> => {
    try {
      console.log('📡 Fetching tasks for study userId:', userId);
      const response = await fetchAPI(`/tasks/by-user/${encodeURIComponent(userId)}`);
      const data = await response.json();

      if (data.success) {
        console.log(`✅ Loaded ${data.data.length} tasks for userId: ${userId}`);
        return data.data;
      }
      console.warn('⚠️ Research group not found or no tasks available');
      return null;
    } catch (error) {
      console.error('❌ Get tasks by userId error:', error);
      return null;
    }
  },

  getAll: async (): Promise<Task[] | null> => {
    try {
      console.log('📡 Fetching tasks from backend...');
      const response = await fetchAPI('/tasks');
      const data = await response.json();

      if (data.success) {
        console.log('✅ Tasks loaded successfully:', data.data);
        console.log(`📊 Total tasks: ${data.data.length}`);
        return data.data;
      }
      console.warn('⚠️ Backend returned unsuccessful response');
      return null;
    } catch (error) {
      console.error('❌ Get tasks error:', error);
      return null;
    }
  },

  getById: async (id: string): Promise<Task | null> => {
    try {
      const response = await fetchAPI(`/tasks/${id}`);
      const data = await response.json();

      if (data.success) {
        return data.data;
      }
      return null;
    } catch (error) {
      console.error('Get task error:', error);
      return null;
    }
  },

  create: async (name: string, settings: AISettings): Promise<Task | null> => {
    try {
      console.log(`➕ Creating new task: "${name}"`);
      const response = await fetchAPI('/tasks', {
        method: 'POST',
        body: JSON.stringify({ name, settings })
      });

      const data = await response.json();

      if (data.success) {
        console.log('✅ Task created successfully:', data.data);
        return data.data;
      }
      
      // Throw error with backend message
      const errorMessage = data.message || 'Failed to create task';
      console.warn('⚠️ Failed to create task:', errorMessage);
      throw new Error(errorMessage);
    } catch (error: any) {
      console.error('❌ Create task error:', error);
      // Re-throw to let caller handle it
      throw new Error(error.message || 'Failed to create task');
    }
  },

  update: async (id: string, name?: string, settings?: AISettings): Promise<Task | null> => {
    try {
      console.log(`🔄 Updating task: ${id}`, { name, settings });
      const response = await fetchAPI(`/tasks/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ name, settings })
      });

      const data = await response.json();

      if (data.success) {
        console.log('✅ Task updated successfully:', data.data);
        return data.data;
      }
      console.warn('⚠️ Failed to update task');
      return null;
    } catch (error) {
      console.error('❌ Update task error:', error);
      return null;
    }
  },

  delete: async (id: string): Promise<boolean> => {
    try {
      console.log(`🗑️ Deleting task: ${id}`);
      const response = await fetchAPI(`/tasks/${id}`, {
        method: 'DELETE'
      });

      const data = await response.json();
      if (data.success) {
        console.log('✅ Task deleted successfully');
        return true;
      }
      console.warn('⚠️ Failed to delete task');
      return false;
    } catch (error) {
      console.error('❌ Delete task error:', error);
      return false;
    }
  }
};

// ── Admin types ───────────────────────────────────────────────────────────────

export interface AdminUser {
  id: string;
  username: string;
  email: string;
  researchKey: string | null;
  isActive: boolean;
  createdAt: string;
  taskCount: number;
  conversationCount: number;
  messageCount: number;
}

export interface AdminConversation {
  id: string;
  title: string;
  aiModelName: string | null;
  aiModelPersonality: string | null;
  createdAt: string;
  lastMessageAt: string;
  userId: string;
  username: string;
  messageCount: number;
}

export interface AdminMessage {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: string;
}

// Admin token stored in sessionStorage — survives page refresh within the same
// browser session, but is cleared when the tab/browser is closed.
// Also purge any leftover key from older localStorage-based versions.
localStorage.removeItem('adminToken');

export const adminAuthService = {
  getToken: (): string | null => sessionStorage.getItem('adminToken'),
  setToken: (token: string): void => { sessionStorage.setItem('adminToken', token); },
  clearToken: (): void => { sessionStorage.removeItem('adminToken'); },
  isAuthenticated: (): boolean => !!sessionStorage.getItem('adminToken'),
  /** Returns a stable admin ID — always 'admin' for the single admin account. */
  getAdminId: (): string => 'admin'
};

async function fetchAdmin(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const token = adminAuthService.getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined || {})
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return fetch(`${API_BASE_URL}/admin${endpoint}`, { ...options, headers, cache: 'no-store' });
}

export const adminAPI = {
  login: async (adminKey: string): Promise<{ success: boolean; message?: string }> => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminKey })
      });
      const data = await response.json();
      if (data.success && data.token) {
        adminAuthService.setToken(data.token);
      }
      return data;
    } catch {
      return { success: false, message: 'Failed to connect to backend' };
    }
  },

  getUsers: async (): Promise<AdminUser[]> => {
    try {
      const response = await fetchAdmin('/users');
      const data = await response.json();
      return data.success ? data.data : [];
    } catch {
      return [];
    }
  },

  getConversations: async (): Promise<AdminConversation[]> => {
    try {
      const response = await fetchAdmin('/conversations');
      const data = await response.json();
      return data.success ? data.data : [];
    } catch {
      return [];
    }
  },

  getMessages: async (conversationId: string): Promise<AdminMessage[]> => {
    try {
      const response = await fetchAdmin(`/conversations/${encodeURIComponent(conversationId)}/messages`);
      const data = await response.json();
      return data.success ? data.data : [];
    } catch {
      return [];
    }
  },

  createUser: async (
    username: string,
    email: string,
    researchKey: string,
    password?: string
  ): Promise<{ success: boolean; data?: AdminUser; message?: string }> => {
    try {
      const response = await fetchAdmin('/users', {
        method: 'POST',
        body: JSON.stringify({ username, email, researchKey, password })
      });
      return await response.json();
    } catch {
      return { success: false, message: 'Failed to connect to backend' };
    }
  },

  deleteUser: async (userId: string): Promise<{ success: boolean; message?: string }> => {
    try {
      const response = await fetchAdmin(`/users/${encodeURIComponent(userId)}`, { method: 'DELETE' });
      return await response.json();
    } catch {
      return { success: false, message: 'Failed to connect to backend' };
    }
  },

  toggleUserStatus: async (
    userId: string,
    isActive: boolean
  ): Promise<{ success: boolean; message?: string }> => {
    try {
      const response = await fetchAdmin(`/users/${encodeURIComponent(userId)}/status`, {
        method: 'PUT',
        body: JSON.stringify({ isActive })
      });
      return await response.json();
    } catch {
      return { success: false, message: 'Failed to connect to backend' };
    }
  }
};

