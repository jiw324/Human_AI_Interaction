/**
 * LiteLLM Service
 * Frontend service for LiteLLM configuration and model management
 */

const API_BASE_URL =
  import.meta.env.VITE_API_URL ??
  (import.meta.env.PROD
    ? 'https://commresearch-dev.org.ohio-state.edu/api'
    : 'http://localhost:3001/api');

// Helper function for API calls
async function fetchAPI(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const defaultOptions: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const token = localStorage.getItem('authToken');
  if (token) {
    defaultOptions.headers = {
      ...defaultOptions.headers,
      'Authorization': `Bearer ${token}`,
    };
  }

  return fetch(url, { ...defaultOptions, ...options });
}

export interface LiteLLMConfig {
  apiBaseUrl: string;
  apiKey?: string;
  openaiKey?: string;
  anthropicKey?: string;
  googleKey?: string;
  mistralKey?: string;
  cohereKey?: string;
  replicateKey?: string;
  huggingfaceKey?: string;
  autoUpdateModels: boolean;
  defaultModel: string;
}

export interface ModelInfo {
  id: string;
  object?: string;
  created?: number;
  owned_by?: string;
}

export interface ConnectionTestResult {
  success: boolean;
  message: string;
  models?: number;
}

/**
 * Get available AI models from LiteLLM
 */
export async function getAvailableModels(): Promise<ModelInfo[]> {
  try {
    console.log('📡 Fetching available models from LiteLLM...');
    const response = await fetchAPI('/litellm/models');
    const data = await response.json() as { success: boolean; models: ModelInfo[]; count: number };
    
    if (data && data.success) {
      console.log(`✅ Found ${data.count} models`);
      return data.models;
    } else {
      console.warn('⚠️ Failed to get models:', data);
      return [];
    }
  } catch (error) {
    console.error('❌ Error fetching models:', error);
    return [];
  }
}

/**
 * Get current LiteLLM configuration
 */
export async function getLiteLLMConfig(): Promise<LiteLLMConfig | null> {
  try {
    console.log('🔧 Fetching LiteLLM configuration...');
    const response = await fetchAPI('/litellm/config');
    const data = await response.json() as { success: boolean; config: LiteLLMConfig };
    
    if (data && data.success) {
      console.log('✅ LiteLLM configuration retrieved');
      return data.config;
    } else {
      console.warn('⚠️ Failed to get config:', data);
      return null;
    }
  } catch (error) {
    console.error('❌ Error fetching config:', error);
    return null;
  }
}

/**
 * Update LiteLLM configuration
 */
export async function updateLiteLLMConfig(config: Partial<LiteLLMConfig>): Promise<{ success: boolean; message?: string; connectionTest?: ConnectionTestResult }> {
  try {
    console.log('🔧 Updating LiteLLM configuration...');
    const response = await fetchAPI('/litellm/config', {
      method: 'POST',
      body: JSON.stringify(config),
    });
    const data = await response.json() as { success: boolean; message: string; connectionTest?: ConnectionTestResult };
    
    if (data && data.success) {
      console.log('✅ LiteLLM configuration updated');
      return data;
    } else {
      console.warn('⚠️ Failed to update config:', data);
      return { success: false, message: 'Failed to update configuration' };
    }
  } catch (error) {
    console.error('❌ Error updating config:', error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Test connection to LiteLLM service
 */
export async function testLiteLLMConnection(): Promise<ConnectionTestResult> {
  try {
    console.log('🔌 Testing LiteLLM connection...');
    const response = await fetchAPI('/litellm/test-connection', {
      method: 'POST',
    });
    const data = await response.json() as ConnectionTestResult;
    
    if (data) {
      if (data.success) {
        console.log(`✅ Connection successful (${data.models} models available)`);
      } else {
        console.error(`❌ Connection failed: ${data.message}`);
      }
      return data;
    } else {
      return {
        success: false,
        message: 'No response from server',
      };
    }
  } catch (error) {
    console.error('❌ Error testing connection:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Connection test failed',
    };
  }
}

export const liteLLMService = {
  getAvailableModels,
  getLiteLLMConfig,
  updateLiteLLMConfig,
  testLiteLLMConnection,
};

