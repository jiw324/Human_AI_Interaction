// API Service for backend communication
const API_BASE_URL = 'http://localhost:3001/api';

// Types matching backend
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
}

export interface AISettings {
  personality: string;
  responseSpeed: string;
  creativity: number;
  helpfulness: number;
  verbosity: number;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
  taskPrompt: string;
}

export interface Conversation {
  id: string;
  title: string;
  aiModel: AIModel;
  messages: Message[];
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
  }
};

// HTTP helper with auth
async function fetchAPI(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = authService.getToken();
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers
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
        message: 'Failed to connect to server. Make sure backend is running on port 3001.'
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
    settings?: AISettings
  ): Promise<{ success: boolean; response?: Message; error?: string }> => {
    try {
      const response = await fetchAPI('/chat/message', {
        method: 'POST',
        body: JSON.stringify({
          message,
          conversationId,
          aiModel,
          settings
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

