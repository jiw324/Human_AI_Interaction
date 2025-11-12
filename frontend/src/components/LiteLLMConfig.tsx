/**
 * LiteLLM Configuration Component
 * Manages LiteLLM API configuration and model selection
 */

import React, { useState, useEffect } from 'react';
import { liteLLMService, type ModelInfo, type LiteLLMConfig, type ConnectionTestResult } from '../services/litellm.service';
import './LiteLLMConfig.css';

interface LiteLLMConfigProps {
  onModelSelect?: (modelId: string) => void;
}

const LiteLLMConfigComponent: React.FC<LiteLLMConfigProps> = ({ onModelSelect }) => {
  const [config, setConfig] = useState<LiteLLMConfig>({
    apiBaseUrl: 'http://localhost:8000',
    apiKey: '',
    openaiKey: '',
    anthropicKey: '',
    autoUpdateModels: false,
    defaultModel: 'gpt-3.5-turbo',
  });
  
  const [availableModels, setAvailableModels] = useState<ModelInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionTestResult | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  
  // Load configuration on mount
  useEffect(() => {
    loadConfig();
  }, []);
  
  const loadConfig = async () => {
    const loadedConfig = await liteLLMService.getLiteLLMConfig();
    if (loadedConfig) {
      setConfig(loadedConfig);
    }
  };
  
  const loadModels = async () => {
    setIsLoading(true);
    setMessage({ type: 'info', text: 'Fetching available models...' });
    
    const models = await liteLLMService.getAvailableModels();
    setAvailableModels(models);
    
    if (models.length > 0) {
      setMessage({ type: 'success', text: `Found ${models.length} available models` });
    } else {
      setMessage({ type: 'error', text: 'No models found. Check your LiteLLM configuration.' });
    }
    
    setIsLoading(false);
  };
  
  const handleTestConnection = async () => {
    setIsLoading(true);
    setMessage({ type: 'info', text: 'Testing connection...' });
    
    const result = await liteLLMService.testLiteLLMConnection();
    setConnectionStatus(result);
    
    if (result.success) {
      setMessage({ type: 'success', text: `${result.message} (${result.models} models available)` });
      // Auto-load models after successful connection
      await loadModels();
    } else {
      setMessage({ type: 'error', text: result.message });
    }
    
    setIsLoading(false);
  };
  
  const handleSaveConfig = async () => {
    setIsLoading(true);
    setMessage({ type: 'info', text: 'Saving configuration...' });
    
    const result = await liteLLMService.updateLiteLLMConfig(config);
    
    if (result.success) {
      setMessage({ type: 'success', text: 'Configuration saved successfully' });
      
      // If connection test was performed, show results
      if (result.connectionTest) {
        setConnectionStatus(result.connectionTest);
        if (result.connectionTest.success) {
          await loadModels();
        }
      }
    } else {
      setMessage({ type: 'error', text: result.message || 'Failed to save configuration' });
    }
    
    setIsLoading(false);
  };
  
  const handleModelSelect = (modelId: string) => {
    setConfig({ ...config, defaultModel: modelId });
    if (onModelSelect) {
      onModelSelect(modelId);
    }
  };
  
  return (
    <div className="litellm-config">
      <div className="litellm-header">
        <h3>🤖 LiteLLM AI Configuration</h3>
        <p className="litellm-description">
          Configure your LiteLLM proxy to connect to multiple AI providers (OpenAI, Anthropic, Google, etc.)
        </p>
      </div>
      
      {message && (
        <div className={`litellm-message litellm-message-${message.type}`}>
          {message.text}
        </div>
      )}
      
      <div className="litellm-section">
        <label className="litellm-label">
          LiteLLM API Base URL:
          <input
            type="text"
            className="litellm-input"
            value={config.apiBaseUrl}
            onChange={(e) => setConfig({ ...config, apiBaseUrl: e.target.value })}
            placeholder="http://localhost:8000"
          />
        </label>
        
        <label className="litellm-label">
          API Key (optional):
          <input
            type="password"
            className="litellm-input"
            value={config.apiKey}
            onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
            placeholder="Leave empty if not required"
          />
        </label>
        
        <div className="litellm-button-group">
          <button 
            type="button"
            className="litellm-button litellm-button-primary"
            onClick={handleSaveConfig}
            disabled={isLoading}
          >
            {isLoading ? '⏳ Saving...' : '💾 Save Configuration'}
          </button>
          
          <button 
            type="button"
            className="litellm-button litellm-button-secondary"
            onClick={handleTestConnection}
            disabled={isLoading}
          >
            {isLoading ? '⏳ Testing...' : '🔌 Test Connection'}
          </button>
          
          <button 
            type="button"
            className="litellm-button litellm-button-secondary"
            onClick={loadModels}
            disabled={isLoading}
          >
            {isLoading ? '⏳ Loading...' : '🔄 Refresh Models'}
          </button>
        </div>
      </div>
      
      {connectionStatus && (
        <div className={`litellm-connection-status ${connectionStatus.success ? 'success' : 'error'}`}>
          <strong>{connectionStatus.success ? '✅ Connected' : '❌ Disconnected'}</strong>
          <p>{connectionStatus.message}</p>
        </div>
      )}
      
      {availableModels.length > 0 && (
        <div className="litellm-section">
          <h4>Available AI Models ({availableModels.length})</h4>
          <div className="litellm-models-grid">
            {availableModels.map((model) => (
              <div 
                key={model.id} 
                className={`litellm-model-card ${config.defaultModel === model.id ? 'selected' : ''}`}
                onClick={() => handleModelSelect(model.id)}
              >
                <div className="model-id">{model.id}</div>
                {model.owned_by && <div className="model-owner">by {model.owned_by}</div>}
                {config.defaultModel === model.id && <span className="model-badge">Default</span>}
              </div>
            ))}
          </div>
          
          <label className="litellm-label">
            Default Model:
            <select
              className="litellm-select"
              value={config.defaultModel}
              onChange={(e) => handleModelSelect(e.target.value)}
            >
              {availableModels.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.id}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
      
      <div className="litellm-help">
        <details>
          <summary>ℹ️ Need Help?</summary>
          <div className="litellm-help-content">
            <h4>Setting up LiteLLM:</h4>
            <ol>
              <li>Install LiteLLM: <code>pip install litellm[proxy]</code></li>
              <li>Start the proxy: <code>litellm --port 8000</code></li>
              <li>Or with config: <code>litellm --config config.yaml</code></li>
            </ol>
            <p>
              <a href="https://docs.litellm.ai/docs/" target="_blank" rel="noopener noreferrer">
                📖 LiteLLM Documentation
              </a>
            </p>
          </div>
        </details>
      </div>
    </div>
  );
};

export default LiteLLMConfigComponent;

