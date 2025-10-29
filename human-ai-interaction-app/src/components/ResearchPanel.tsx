import React, { useState } from 'react';
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

const ResearchPanel: React.FC<ResearchPanelProps> = ({ settingsByModel, onModelSettingsChange, modelNames }) => {
  const [activeTask, setActiveTask] = useState<string>(modelNames[0]);
  
  // Debug logging
  console.log('ResearchPanel props:', { settingsByModel, modelNames });

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

      {/* Task Switcher */}
      <div className="task-switcher">
        {modelNames.map((taskName) => (
          <button
            key={taskName}
            className={`task-tab ${activeTask === taskName ? 'active' : ''}`}
            onClick={() => setActiveTask(taskName)}
          >
            {taskName}
          </button>
        ))}
      </div>

      <div className="panel-content">
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
          <button className="update-btn" onClick={handleUpdate}>
            Update
          </button>
          <button className="reset-btn" onClick={resetToDefaults}>
            Reset
          </button>
        </div>

      </div>
    </div>
  );
};

export default ResearchPanel;
