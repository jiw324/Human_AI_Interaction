import React, { useState, useRef } from 'react';
import './ResearchPanel.css';

interface AISettings {
  personality: string;
  responseSpeed: number;
  creativity: number;
  helpfulness: number;
  verbosity: number;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
  taskPrompt: string;
}

interface ResearchPanelProps {
  settingsByModel: Record<string, AISettings>;
  onModelSettingsChange: (model: string, settings: AISettings) => void;
  modelNames: string[];
}

interface ModelInfo {
  id: string;
  name: string;
  modelId: string;
  provider: string;
  status: 'available' | 'unknown';
}

const ResearchPanel: React.FC<ResearchPanelProps> = ({ settingsByModel, onModelSettingsChange, modelNames }) => {
  const [activeTask, setActiveTask] = useState<string>(modelNames[0]);
  const [tasks, setTasks] = useState<string[]>(modelNames);
  const [newTaskName, setNewTaskName] = useState<string>('');
  const [viewMode, setViewMode] = useState<'tasks' | 'config'>('tasks');
  const isAddingTask = useRef(false);
  
  // System Config State
  const [llamaBaseUrl, setLlamaBaseUrl] = useState<string>(
    localStorage.getItem('llamaBaseUrl') || 'https://llm-proxy.oai-at.org/'
  );
  const [llamaServiceUrl, setLlamaServiceUrl] = useState<string>(
    localStorage.getItem('llamaServiceUrl') || ''
  );
  const [llamaApiKey, setLlamaApiKey] = useState<string>(
    localStorage.getItem('llamaApiKey') || ''
  );
  const [showLlamaKey, setShowLlamaKey] = useState<boolean>(false);
  const [autoUpdateRobotList, setAutoUpdateRobotList] = useState<boolean>(
    localStorage.getItem('autoUpdateRobotList') === 'true'
  );
  const [openaiApiKey, setOpenaiApiKey] = useState<string>(
    localStorage.getItem('openaiApiKey') || ''
  );
  const [anthropicApiKey, setAnthropicApiKey] = useState<string>(
    localStorage.getItem('anthropicApiKey') || ''
  );
  const [defaultModel, setDefaultModel] = useState<string>(
    localStorage.getItem('defaultModel') || ''
  );
  const [availableModels] = useState<string[]>([
    'Mistral 7B Instruct',
    'Nova Pro',
    'Meta llama3.3b',
    'Amazon Titan Express',
    'GPT-4',
    'Claude-3.5-Sonnet'
  ]);
  const [configTab, setConfigTab] = useState<'clear' | 'reset' | 'update'>('update');
  const [models] = useState<ModelInfo[]>([
    {
      id: '1',
      name: 'Anthropic Claude-V2.1',
      modelId: 'Anthropic Claude-V...',
      provider: 'unknown',
      status: 'unknown'
    },
    {
      id: '2',
      name: 'Anthropic Claude-V3.5 Sonnet',
      modelId: 'Anthropic Claude-V...',
      provider: 'unknown',
      status: 'unknown'
    },
    {
      id: '3',
      name: 'Meta llama3-7bb',
      modelId: 'Meta llama3-7bb',
      provider: 'unknown',
      status: 'unknown'
    },
    {
      id: '4',
      name: 'Anthropic Claude-V3.7 Sonnet',
      modelId: 'Anthropic Claude-V...',
      provider: 'unknown',
      status: 'unknown'
    },
    {
      id: '5',
      name: 'GPT-3.5-Turbo',
      modelId: 'GPT-3.5-Turbo',
      provider: 'unknown',
      status: 'unknown'
    },
    {
      id: '6',
      name: 'Titan Text Embeddings V2',
      modelId: 'Titan Text Embeddin...',
      provider: 'unknown',
      status: 'unknown'
    },
    {
      id: '7',
      name: 'Anthropic Claude-V3',
      modelId: 'Anthropic Claude-V3',
      provider: 'unknown',
      status: 'unknown'
    },
    {
      id: '8',
      name: 'Anthropic Claude-V2',
      modelId: 'Anthropic Claude-V2',
      provider: 'unknown',
      status: 'unknown'
    },
    {
      id: '9',
      name: 'Amazon Titan Lite',
      modelId: 'Amazon Titan Lite',
      provider: 'unknown',
      status: 'unknown'
    }
  ]);
  
  // Safety check
  if (!settingsByModel || !modelNames) {
    return (
      <div className="research-panel">
        <h2>Research Panel</h2>
        <p>Error: Missing required props</p>
      </div>
    );
  }

  const personalityOptions = [
    { value: 'friendly', label: 'Friendly & Warm' },
    { value: 'professional', label: 'Professional & Formal' },
    { value: 'creative', label: 'Creative & Imaginative' },
    { value: 'analytical', label: 'Analytical & Logical' },
    { value: 'casual', label: 'Casual & Relaxed' },
    { value: 'expert', label: 'Expert & Authoritative' }
  ];

  const handleSettingChange = (model: string, key: keyof AISettings, value: string | number) => {
    const current = settingsByModel[model];
    const newSettings = { ...current, [key]: value };
    onModelSettingsChange(model, newSettings);
  };

  const handleUpdate = () => {
    // Settings are already saved in real-time via handleSettingChange
    // This provides visual feedback
    alert('Settings updated successfully!');
  };

  const resetToDefaults = () => {
    const defaultSettings: AISettings = {
      personality: 'friendly',
      responseSpeed: 1.0,
      creativity: 0.7,
      helpfulness: 0.9,
      verbosity: 0.6,
      temperature: 0.7,
      maxTokens: 1000,
      systemPrompt: 'You are a helpful AI assistant. Be friendly, informative, and engaging in your responses.',
      taskPrompt: ''
    };
    onModelSettingsChange(activeTask, defaultSettings);
  };

  const addTask = () => {
    // Prevent multiple simultaneous additions
    if (isAddingTask.current) {
      return;
    }
    
    const trimmedName = newTaskName.trim();
    
    if (trimmedName === '') {
      alert('Please enter a task name');
      return;
    }
    
    if (tasks.includes(trimmedName)) {
      alert('Task name already exists');
      return;
    }
    
    // Set flag to prevent duplicate calls
    isAddingTask.current = true;
    
    const defaultSettings: AISettings = {
      personality: 'friendly',
      responseSpeed: 1.0,
      creativity: 0.7,
      helpfulness: 0.9,
      verbosity: 0.6,
      temperature: 0.7,
      maxTokens: 1000,
      systemPrompt: 'You are a helpful AI assistant. Be friendly, informative, and engaging in your responses.',
      taskPrompt: ''
    };
    
    // Use functional update to ensure we're working with the latest state
    setTasks(prevTasks => [...prevTasks, trimmedName]);
    onModelSettingsChange(trimmedName, defaultSettings);
    setActiveTask(trimmedName);
    setNewTaskName('');
    
    // Reset flag after a short delay
    setTimeout(() => {
      isAddingTask.current = false;
    }, 100);
  };

  const deleteTask = (taskName: string) => {
    if (tasks.length <= 1) {
      alert('Cannot delete the last task');
      return;
    }
    
    if (window.confirm(`Are you sure you want to delete task "${taskName}"?`)) {
      const newTasks = tasks.filter(t => t !== taskName);
      setTasks(newTasks);
      
      if (activeTask === taskName) {
        setActiveTask(newTasks[0]);
      }
    }
  };

  // System Config Handlers
  const handleRefreshModelList = () => {
    alert('Refreshing model list...');
  };

  const handleSaveConfiguration = () => {
    localStorage.setItem('llamaBaseUrl', llamaBaseUrl);
    localStorage.setItem('llamaServiceUrl', llamaServiceUrl);
    localStorage.setItem('llamaApiKey', llamaApiKey);
    localStorage.setItem('autoUpdateRobotList', autoUpdateRobotList.toString());
    localStorage.setItem('openaiApiKey', openaiApiKey);
    localStorage.setItem('anthropicApiKey', anthropicApiKey);
    localStorage.setItem('defaultModel', defaultModel);
    
    alert('Configuration saved and models updated successfully!');
  };

  const handleClearTestRobots = () => {
    if (window.confirm('Are you sure you want to clear all test robots?')) {
      alert('Test robots cleared!');
    }
  };

  const handleResetAndSyncRobots = () => {
    if (window.confirm('Are you sure you want to reset and sync robots?')) {
      alert('Robots reset and synced!');
    }
  };

  const settings = settingsByModel[activeTask];

  if (!settings) {
    return (
      <div className="research-panel">
        <h2>Research Panel</h2>
        <p>Settings not found for this task.</p>
      </div>
    );
  }

  return (
    <div className="research-panel">
      <div className="panel-header">
        <h2>AI Research Panel</h2>
      </div>

      {/* View Switcher */}
      <div className="view-switcher">
        <button
          type="button"
          className={`view-tab ${viewMode === 'tasks' ? 'active' : ''}`}
          onClick={() => setViewMode('tasks')}
        >
          📋 Task Configuration
        </button>
        <button
          type="button"
          className={`view-tab ${viewMode === 'config' ? 'active' : ''}`}
          onClick={() => setViewMode('config')}
        >
          ⚙️ System Configuration
        </button>
      </div>

      <div className="panel-content">{viewMode === 'tasks' ? (
        // TASK CONFIGURATION VIEW
        <>
        {/* Tasks Management Section */}
        <div className="config-section tasks-section">
          <h3 className="section-title">Tasks Management</h3>
          
          <div className="tasks-add-container">
            <input
              type="text"
              value={newTaskName}
              onChange={(e) => setNewTaskName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addTask();
                }
              }}
              placeholder="Enter new task name..."
              className="task-input"
            />
            <button type="button" onClick={addTask} className="add-task-btn">
              + Add Task
            </button>
          </div>

          <div className="tasks-list">
            {tasks.map((taskName) => (
              <div
                key={taskName}
                className={`task-item ${activeTask === taskName ? 'active' : ''}`}
              >
                <button
                  type="button"
                  className="task-select-btn"
                  onClick={() => setActiveTask(taskName)}
                >
                  <span className="task-name">{taskName}</span>
                  {activeTask === taskName && <span className="active-badge">Active</span>}
                </button>
                <button
                  type="button"
                  className="task-delete-btn"
                  onClick={() => deleteTask(taskName)}
                  title="Delete task"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Current Task Configuration */}
        <div className="current-task-header">
          <h3>Configure Task: <span className="task-highlight">{activeTask}</span></h3>
        </div>

        {/* System Prompt and Task Prompt Side by Side */}
        <div className="prompts-container">
          <div className="config-section prompt-section">
            <h3 className="section-title">System Prompt</h3>
            <div className="setting-group full-width">
              <textarea
                value={settings.systemPrompt}
                onChange={(e) => handleSettingChange(activeTask, 'systemPrompt', e.target.value)}
                className="setting-textarea"
                rows={6}
                placeholder="Enter the system prompt that defines the AI's behavior..."
              />
            </div>
          </div>

          <div className="config-section prompt-section">
            <h3 className="section-title">Task Prompt</h3>
            <div className="setting-group full-width">
              <textarea
                value={settings.taskPrompt || ''}
                onChange={(e) => handleSettingChange(activeTask, 'taskPrompt', e.target.value)}
                className="setting-textarea"
                rows={6}
                placeholder="Enter the specific task prompt or instructions..."
              />
            </div>
          </div>
        </div>

        {/* AI Model Config Section */}
        <div className="config-section">
          <h3 className="section-title">AI Model Config</h3>
          <div className="settings-grid">
            <div className="setting-group">
              <label className="setting-label">Personality</label>
              <select
                value={settings.personality}
                onChange={(e) => handleSettingChange(activeTask, 'personality', e.target.value)}
                className="setting-select"
              >
                {personalityOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="setting-group">
              <label className="setting-label">Response Speed: {settings.responseSpeed}x</label>
              <input
                type="range"
                min="0.1"
                max="3.0"
                step="0.1"
                value={settings.responseSpeed}
                onChange={(e) => handleSettingChange(activeTask, 'responseSpeed', parseFloat(e.target.value))}
                className="setting-slider"
              />
            </div>

            <div className="setting-group">
              <label className="setting-label">Creativity: {Math.round(settings.creativity * 100)}%</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={settings.creativity}
                onChange={(e) => handleSettingChange(activeTask, 'creativity', parseFloat(e.target.value))}
                className="setting-slider"
              />
            </div>

            <div className="setting-group">
              <label className="setting-label">Helpfulness: {Math.round(settings.helpfulness * 100)}%</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={settings.helpfulness}
                onChange={(e) => handleSettingChange(activeTask, 'helpfulness', parseFloat(e.target.value))}
                className="setting-slider"
              />
            </div>

            <div className="setting-group">
              <label className="setting-label">Verbosity: {Math.round(settings.verbosity * 100)}%</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={settings.verbosity}
                onChange={(e) => handleSettingChange(activeTask, 'verbosity', parseFloat(e.target.value))}
                className="setting-slider"
              />
            </div>

            <div className="setting-group">
              <label className="setting-label">Temperature: {settings.temperature}</label>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={settings.temperature}
                onChange={(e) => handleSettingChange(activeTask, 'temperature', parseFloat(e.target.value))}
                className="setting-slider"
              />
            </div>

            <div className="setting-group">
              <label className="setting-label">Max Tokens: {settings.maxTokens}</label>
              <input
                type="range"
                min="100"
                max="4000"
                step="100"
                value={settings.maxTokens}
                onChange={(e) => handleSettingChange(activeTask, 'maxTokens', parseInt(e.target.value))}
                className="setting-slider"
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="action-buttons">
          <button type="button" className="update-btn" onClick={handleUpdate}>
            Update
          </button>
          <button type="button" className="reset-btn" onClick={resetToDefaults}>
            Reset
          </button>
        </div>
        </>
      ) : (
        // SYSTEM CONFIGURATION VIEW
        <div className="system-config-view">
          <div className="config-container">
            {/* Left Column */}
            <div className="config-left-column">
              {/* LLM Settings */}
              <section className="config-section">
                <h3 className="section-title">Llama.LM Settings</h3>
                
                <div className="form-group">
                  <label className="form-label">Llama.LM Base URL</label>
                  <input
                    type="text"
                    value={llamaBaseUrl}
                    onChange={(e) => setLlamaBaseUrl(e.target.value)}
                    className="form-input"
                    placeholder="https://llm-proxy.oai-at.org/"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Llama.LM Service base URL</label>
                  <input
                    type="text"
                    value={llamaServiceUrl}
                    onChange={(e) => setLlamaServiceUrl(e.target.value)}
                    className="form-input"
                    placeholder="Enter service base URL"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Llama.LM API Key</label>
                  <div className="input-with-toggle">
                    <input
                      type={showLlamaKey ? 'text' : 'password'}
                      value={llamaApiKey}
                      onChange={(e) => setLlamaApiKey(e.target.value)}
                      className="form-input"
                      placeholder="••••••••••••••••••"
                    />
                    <button
                      type="button"
                      className="toggle-visibility-btn"
                      onClick={() => setShowLlamaKey(!showLlamaKey)}
                    >
                      {showLlamaKey ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>

                <div className="form-actions">
                  <button type="button" className="btn-secondary" onClick={handleRefreshModelList}>
                    🔄 REFRESH MODEL LIST
                  </button>
                  <button type="button" className="btn-primary" onClick={handleSaveConfiguration}>
                    💾 SAVE CONFIGURATION
                  </button>
                </div>

                <div className="checkbox-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={autoUpdateRobotList}
                      onChange={(e) => setAutoUpdateRobotList(e.target.checked)}
                    />
                    <span>Automatically Update Robot List</span>
                  </label>
                </div>
              </section>

              {/* Other API Keys */}
              <section className="config-section">
                <h3 className="section-title">Other API Keys</h3>
                
                <div className="form-group">
                  <label className="form-label">OpenAI API Key</label>
                  <input
                    type="password"
                    value={openaiApiKey}
                    onChange={(e) => setOpenaiApiKey(e.target.value)}
                    className="form-input"
                    placeholder="sk-..."
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Anthropic API Key</label>
                  <input
                    type="password"
                    value={anthropicApiKey}
                    onChange={(e) => setAnthropicApiKey(e.target.value)}
                    className="form-input"
                    placeholder="sk-ant-..."
                  />
                </div>

                <div className="form-actions">
                  <button type="button" className="btn-primary full-width" onClick={handleSaveConfiguration}>
                    💾 SAVE ALL CONFIGURATIONS
                  </button>
                </div>
              </section>

              {/* Task Settings */}
              <section className="config-section">
                <h3 className="section-title">Task Settings</h3>
                
                <div className="form-group">
                  <label className="form-label">Default Model</label>
                  <select
                    value={defaultModel}
                    onChange={(e) => setDefaultModel(e.target.value)}
                    className="form-select"
                  >
                    <option value="">Select default model for all tasks</option>
                    {availableModels.map((model) => (
                      <option key={model} value={model}>
                        {model}
                      </option>
                    ))}
                  </select>
                  <p className="form-hint">
                    Select the default model for all tasks. It will affect other existing tasks.
                  </p>
                </div>
              </section>
            </div>

            {/* Right Column */}
            <div className="config-right-column">
              {/* Available Models */}
              <section className="config-section available-models-section">
                <h3 className="section-title">Available models</h3>
                <div className="models-list">
                  {availableModels.map((model, index) => (
                    <div key={index} className="model-item">
                      <div className="model-name">{model}</div>
                      <div className="model-status">unknown | {model}</div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Model and Robot Management */}
              <section className="config-section robot-management-section">
                <h3 className="section-title">Model and Robot Management</h3>
                
                <div className="tab-navigation">
                  <button
                    type="button"
                    className={`config-tab-btn ${configTab === 'clear' ? 'active' : ''}`}
                    onClick={() => setConfigTab('clear')}
                  >
                    CLEAR TEST ROBOTS
                  </button>
                  <button
                    type="button"
                    className={`config-tab-btn ${configTab === 'reset' ? 'active' : ''}`}
                    onClick={() => setConfigTab('reset')}
                  >
                    ⚠️ RESET AND SYNC ROBOTS
                  </button>
                  <button
                    type="button"
                    className={`config-tab-btn ${configTab === 'update' ? 'active' : ''}`}
                    onClick={() => setConfigTab('update')}
                  >
                    🔄 UPDATE ROBOT LIST
                  </button>
                </div>

                <div className="tab-content">
                  {configTab === 'clear' && (
                    <div className="tab-panel">
                      <p className="tab-description">
                        Clear all test robots from the system. This action cannot be undone.
                      </p>
                      <button type="button" className="btn-danger" onClick={handleClearTestRobots}>
                        Clear All Test Robots
                      </button>
                    </div>
                  )}

                  {configTab === 'reset' && (
                    <div className="tab-panel">
                      <p className="tab-description">
                        Reset and synchronize all robots with the latest configuration.
                      </p>
                      <button type="button" className="btn-warning" onClick={handleResetAndSyncRobots}>
                        Reset and Sync Robots
                      </button>
                    </div>
                  )}

                  {configTab === 'update' && (
                    <div className="models-grid">
                      {models.map((model) => (
                        <div key={model.id} className="model-card">
                          <div className="model-card-header">
                            <h4 className="model-card-title">{model.name}</h4>
                          </div>
                          <div className="model-card-body">
                            <p className="model-detail">
                              <strong>Model:</strong> {model.modelId}
                            </p>
                            <p className="model-detail">
                              <strong>Provider:</strong> {model.provider}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default ResearchPanel;
