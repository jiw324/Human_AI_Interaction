import React, { useState, useRef, useEffect } from 'react';
import { tasksAPI, type Task } from '../services/api';
import './ResearchPanel.css';

interface AISettings {
  // AI Model Settings
  personality: string;
  responseSpeed: number;
  creativity: number;
  helpfulness: number;
  verbosity: number;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
  taskPrompt: string;
  // System Configuration (Task-specific)
  llamaBaseUrl?: string;
  llamaServiceUrl?: string;
  llamaApiKey?: string;
  openaiApiKey?: string;
  anthropicApiKey?: string;
  defaultModel?: string;
  autoUpdateRobotList?: boolean;
}

interface ResearchPanelProps {
  tasks: Task[];
  onTasksChange: (tasks: Task[]) => void;
}

interface ModelInfo {
  id: string;
  name: string;
  modelId: string;
  provider: string;
  status: 'available' | 'unknown';
}

const ResearchPanel: React.FC<ResearchPanelProps> = ({ tasks, onTasksChange }) => {
  const [activeTaskId, setActiveTaskId] = useState<string>(tasks[0]?.id || '');
  const [newTaskName, setNewTaskName] = useState<string>('');
  const isAddingTask = useRef(false);
  
  // Local editing state to prevent focus loss on text inputs
  const [editingSettings, setEditingSettings] = useState<AISettings | null>(null);
  
  // Log when tasks are received
  useEffect(() => {
    console.log('📋 ResearchPanel received tasks:', tasks);
    console.log(`📊 Active Task ID: ${activeTaskId}`);
  }, [tasks, activeTaskId]);
  
  // Update active task if tasks change and current active task doesn't exist
  useEffect(() => {
    if (tasks.length > 0 && !tasks.find(t => t.id === activeTaskId)) {
      console.log(`⚠️ Active task ${activeTaskId} not found, switching to first task`);
      setActiveTaskId(tasks[0].id);
    }
  }, [tasks, activeTaskId]);
  
  // Reset editing state when active task changes
  useEffect(() => {
    setEditingSettings(null);
  }, [activeTaskId]);
  
  // System Config State (just for UI, actual values come from currentSettings)
  const [showLlamaKey, setShowLlamaKey] = useState<boolean>(false);
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
  if (!tasks || tasks.length === 0) {
    return (
      <div className="research-panel">
        <div className="panel-header">
          <h2>AI Research Panel</h2>
        </div>
        <div className="panel-content">
          <p>No tasks available. Please check your connection.</p>
        </div>
      </div>
    );
  }
  
  const activeTask = tasks.find(t => t.id === activeTaskId);
  if (!activeTask) {
    return (
      <div className="research-panel">
        <div className="panel-header">
          <h2>AI Research Panel</h2>
        </div>
        <div className="panel-content">
          <p>Task not found.</p>
        </div>
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

  // Get current settings (from editing state or active task)
  const currentSettings = editingSettings || activeTask.settings;

  const handleSettingChange = (key: keyof AISettings, value: string | number | boolean) => {
    if (!activeTask) return;
    
    // Update local editing state only (prevents re-render and focus loss)
    const newSettings = { ...currentSettings, [key]: value };
    setEditingSettings(newSettings);
  };

  const handleUpdate = async () => {
    if (!activeTask) return;
    
    try {
      console.log('🔄 Updating task settings to backend...', {
        taskId: activeTask.id,
        taskName: activeTask.name,
        settings: currentSettings
      });
      
      const updatedTask = await tasksAPI.update(activeTask.id, undefined, currentSettings);
      
      if (updatedTask) {
        // Update local state and localStorage
        const updatedTasks = tasks.map(t =>
          t.id === activeTaskId ? updatedTask : t
        );
        onTasksChange(updatedTasks);
        
        // Clear editing state after successful save
        setEditingSettings(null);
        
        // Explicitly save to localStorage
        localStorage.setItem('research_tasks', JSON.stringify(updatedTasks));
        console.log('💾 Tasks updated in localStorage');
        
        alert('✅ Settings updated successfully!');
      }
    } catch (error) {
      console.error('❌ Failed to update settings:', error);
      alert('Failed to update settings. Please try again.');
    }
  };

  const resetToDefaults = async () => {
    if (!activeTask) return;
    
    const defaultSettings: AISettings = {
      personality: 'friendly',
      responseSpeed: 1.0,
      creativity: 0.7,
      helpfulness: 0.9,
      verbosity: 0.6,
      temperature: 0.7,
      maxTokens: 1000,
      systemPrompt: 'You are a helpful AI assistant. Be friendly, informative, and engaging in your responses.',
      taskPrompt: '',
      llamaBaseUrl: 'https://llm-proxy.oai-at.org/',
      llamaServiceUrl: '',
      llamaApiKey: '',
      openaiApiKey: '',
      anthropicApiKey: '',
      defaultModel: 'GPT-4',
      autoUpdateRobotList: false
    };
    
    try {
      console.log('🔄 Resetting task to default settings...');
      const updatedTask = await tasksAPI.update(activeTask.id, undefined, defaultSettings);
      if (updatedTask) {
        const updatedTasks = tasks.map(t =>
          t.id === activeTaskId ? updatedTask : t
        );
        onTasksChange(updatedTasks);
        
        // Clear editing state
        setEditingSettings(null);
        
        // Save to localStorage
        localStorage.setItem('research_tasks', JSON.stringify(updatedTasks));
        console.log('💾 Task reset saved to localStorage');
        
        alert('Settings reset to defaults!');
      }
    } catch (error) {
      console.error('❌ Failed to reset settings:', error);
      alert('Failed to reset settings. Please try again.');
    }
  };

  const addTask = async () => {
    // FIRST: Check lock to prevent any duplicate calls
    if (isAddingTask.current) {
      console.warn('addTask called while already adding, ignoring');
      return;
    }
    
    // SECOND: Set lock immediately
    isAddingTask.current = true;
    
    const trimmedName = newTaskName.trim();
    
    if (trimmedName === '') {
      isAddingTask.current = false; // Reset lock
      alert('Please enter a task name');
      return;
    }
    
    if (tasks.some(t => t.name === trimmedName)) {
      isAddingTask.current = false; // Reset lock
      alert('Task name already exists');
      return;
    }
    
    const defaultSettings: AISettings = {
      personality: 'friendly',
      responseSpeed: 1.0,
      creativity: 0.7,
      helpfulness: 0.9,
      verbosity: 0.6,
      temperature: 0.7,
      maxTokens: 1000,
      systemPrompt: 'You are a helpful AI assistant. Be friendly, informative, and engaging in your responses.',
      taskPrompt: '',
      llamaBaseUrl: 'https://llm-proxy.oai-at.org/',
      llamaServiceUrl: '',
      llamaApiKey: '',
      openaiApiKey: '',
      anthropicApiKey: '',
      defaultModel: 'GPT-4',
      autoUpdateRobotList: false
    };
    
    try {
      console.log('➕ Creating new task:', trimmedName);
      const newTask = await tasksAPI.create(trimmedName, defaultSettings);
      
      if (newTask) {
        const updatedTasks = [...tasks, newTask];
        onTasksChange(updatedTasks);
        
        // Save to localStorage
        localStorage.setItem('research_tasks', JSON.stringify(updatedTasks));
        console.log('💾 New task saved to localStorage');
        
        setActiveTaskId(newTask.id);
        setNewTaskName('');
        alert('✅ Task created successfully!');
      } else {
        alert('Failed to create task. Please try again.');
      }
    } catch (error) {
      console.error('❌ Error creating task:', error);
      alert('Failed to create task. Please try again.');
    } finally {
      // Reset flag after operation completes
      setTimeout(() => {
        isAddingTask.current = false;
      }, 300);
    }
  };

  const deleteTask = async (taskId: string) => {
    if (tasks.length <= 1) {
      alert('Cannot delete the last task');
      return;
    }
    
    const taskToDelete = tasks.find(t => t.id === taskId);
    if (!taskToDelete) return;
    
    if (window.confirm(`Are you sure you want to delete task "${taskToDelete.name}"?`)) {
      try {
        console.log('🗑️ Deleting task:', taskToDelete.name);
        const success = await tasksAPI.delete(taskId);
        
        if (success) {
          const newTasks = tasks.filter(t => t.id !== taskId);
          onTasksChange(newTasks);
          
          // Save to localStorage
          localStorage.setItem('research_tasks', JSON.stringify(newTasks));
          console.log('💾 Task deletion saved to localStorage');
          
          if (activeTaskId === taskId) {
            setActiveTaskId(newTasks[0].id);
          }
          alert('✅ Task deleted successfully!');
        } else {
          alert('Failed to delete task. Please try again.');
        }
      } catch (error) {
        console.error('❌ Error deleting task:', error);
        alert('Failed to delete task. Please try again.');
      }
    }
  };

  // System Config Handlers
  const handleRefreshModelList = () => {
    alert('Refreshing model list...');
  };

  const handleSaveConfiguration = async () => {
    // System config is now part of task settings, so use handleUpdate
    await handleUpdate();
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

  // Use currentSettings which includes any unsaved edits
  const settings = currentSettings;

  return (
    <div className="research-panel">
      <div className="panel-header">
        <h2>AI Research Panel</h2>
      </div>

      <div className="panel-content">
        {/* TASK CONFIGURATION (merged with System Configuration) */}
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
            {tasks.map((task) => (
              <div
                key={task.id}
                className={`task-item ${activeTaskId === task.id ? 'active' : ''}`}
              >
                <button
                  type="button"
                  className="task-select-btn"
                  onClick={() => setActiveTaskId(task.id)}
                >
                  <span className="task-name">{task.name}</span>
                  {activeTaskId === task.id && <span className="active-badge">Active</span>}
                </button>
                <button
                  type="button"
                  className="task-delete-btn"
                  onClick={() => deleteTask(task.id)}
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
          <h3>Configure Task: <span className="task-highlight">{activeTask.name}</span></h3>
        </div>

        {/* System Prompt and Task Prompt Side by Side */}
        <div className="prompts-container">
          <div className="config-section prompt-section">
            <h3 className="section-title">System Prompt</h3>
            <div className="setting-group full-width">
              <textarea
                value={settings.systemPrompt}
                onChange={(e) => handleSettingChange('systemPrompt', e.target.value)}
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
                onChange={(e) => handleSettingChange('taskPrompt', e.target.value)}
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
                onChange={(e) => handleSettingChange('personality', e.target.value)}
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
                onChange={(e) => handleSettingChange('responseSpeed', parseFloat(e.target.value))}
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
                onChange={(e) => handleSettingChange('creativity', parseFloat(e.target.value))}
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
                onChange={(e) => handleSettingChange('helpfulness', parseFloat(e.target.value))}
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
                onChange={(e) => handleSettingChange('verbosity', parseFloat(e.target.value))}
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
                onChange={(e) => handleSettingChange('temperature', parseFloat(e.target.value))}
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
                onChange={(e) => handleSettingChange('maxTokens', parseInt(e.target.value))}
                className="setting-slider"
              />
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="config-divider">
          <h2 className="divider-title">⚙️ System Configuration</h2>
        </div>

        {/* System Configuration Section */}
        <div className="system-config-section">
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
                    value={currentSettings.llamaBaseUrl || ''}
                    onChange={(e) => handleSettingChange('llamaBaseUrl', e.target.value)}
                    className="form-input"
                    placeholder="https://llm-proxy.oai-at.org/"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Llama.LM Service base URL</label>
                  <input
                    type="text"
                    value={currentSettings.llamaServiceUrl || ''}
                    onChange={(e) => handleSettingChange('llamaServiceUrl', e.target.value)}
                    className="form-input"
                    placeholder="Enter service base URL"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Llama.LM API Key</label>
                  <div className="input-with-toggle">
                    <input
                      type={showLlamaKey ? 'text' : 'password'}
                      value={currentSettings.llamaApiKey || ''}
                      onChange={(e) => handleSettingChange('llamaApiKey', e.target.value)}
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
                      checked={currentSettings.autoUpdateRobotList || false}
                      onChange={(e) => handleSettingChange('autoUpdateRobotList', e.target.checked)}
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
                    value={currentSettings.openaiApiKey || ''}
                    onChange={(e) => handleSettingChange('openaiApiKey', e.target.value)}
                    className="form-input"
                    placeholder="sk-..."
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Anthropic API Key</label>
                  <input
                    type="password"
                    value={currentSettings.anthropicApiKey || ''}
                    onChange={(e) => handleSettingChange('anthropicApiKey', e.target.value)}
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
                    value={currentSettings.defaultModel || ''}
                    onChange={(e) => handleSettingChange('defaultModel', e.target.value)}
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
                    Select the default model for this task.
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

        {/* Action Buttons */}
        <div className="action-buttons">
          <button type="button" className="update-btn" onClick={handleUpdate}>
            💾 Update All Settings
          </button>
          <button type="button" className="reset-btn" onClick={resetToDefaults}>
            🔄 Reset to Defaults
          </button>
        </div>
        </>
      </div>
    </div>
  );
};

export default ResearchPanel;
