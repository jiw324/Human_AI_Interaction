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
}

interface ResearchPanelProps {
  settingsByModel: Record<string, AISettings>;
  onModelSettingsChange: (model: string, settings: AISettings) => void;
  modelNames: string[];
}

const ResearchPanel: React.FC<ResearchPanelProps> = ({ settingsByModel, onModelSettingsChange, modelNames }) => {
  const [isEditing, setIsEditing] = useState(false);

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

  const resetToDefaults = () => {
    const defaultSettings: AISettings = {
      personality: 'friendly',
      responseSpeed: 1.0,
      creativity: 0.7,
      helpfulness: 0.9,
      verbosity: 0.6,
      temperature: 0.7,
      maxTokens: 1000,
      systemPrompt: 'You are a helpful AI assistant. Be friendly, informative, and engaging in your responses.'
    };
    modelNames.forEach((name) => onModelSettingsChange(name, defaultSettings));
  };

  const exportSettings = () => {
    const dataStr = JSON.stringify(settingsByModel, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'ai-settings-by-model.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  const importSettings = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const imported = JSON.parse(e.target?.result as string);
          modelNames.forEach((name) => {
            if (imported[name]) {
              onModelSettingsChange(name, imported[name]);
            }
          });
        } catch (error) {
          alert('Invalid settings file');
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="research-panel">
      <div className="panel-header">
        <h2>AI Research Panel</h2>
        <div className="header-actions">
          <button 
            className={`edit-toggle ${isEditing ? 'active' : ''}`}
            onClick={() => setIsEditing(!isEditing)}
          >
            {isEditing ? 'Save' : 'Edit'}
          </button>
          <button className="reset-btn" onClick={resetToDefaults}>
            Reset
          </button>
        </div>
      </div>

      <div className="panel-content">
        {modelNames.map((modelName) => {
          const settings = settingsByModel[modelName];
          if (!settings) {
            return (
              <div key={modelName} className="model-section">
                <h3>{modelName}</h3>
                <p>Settings not found for this model.</p>
              </div>
            );
          }
          return (
            <div key={modelName} className="model-section">
              <h3>{modelName}</h3>
              <div className="settings-grid">
                <div className="setting-group">
                  <label className="setting-label">Personality</label>
                  <select
                    value={settings.personality}
                    onChange={(e) => handleSettingChange(modelName, 'personality', e.target.value)}
                    disabled={!isEditing}
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
                    onChange={(e) => handleSettingChange(modelName, 'responseSpeed', parseFloat(e.target.value))}
                    disabled={!isEditing}
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
                    onChange={(e) => handleSettingChange(modelName, 'creativity', parseFloat(e.target.value))}
                    disabled={!isEditing}
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
                    onChange={(e) => handleSettingChange(modelName, 'helpfulness', parseFloat(e.target.value))}
                    disabled={!isEditing}
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
                    onChange={(e) => handleSettingChange(modelName, 'verbosity', parseFloat(e.target.value))}
                    disabled={!isEditing}
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
                    onChange={(e) => handleSettingChange(modelName, 'temperature', parseFloat(e.target.value))}
                    disabled={!isEditing}
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
                    onChange={(e) => handleSettingChange(modelName, 'maxTokens', parseInt(e.target.value))}
                    disabled={!isEditing}
                    className="setting-slider"
                  />
                </div>
              </div>

              <div className="setting-group full-width">
                <label className="setting-label">System Prompt</label>
                <textarea
                  value={settings.systemPrompt}
                  onChange={(e) => handleSettingChange(modelName, 'systemPrompt', e.target.value)}
                  disabled={!isEditing}
                  className="setting-textarea"
                  rows={4}
                  placeholder="Enter the system prompt that defines the AI's behavior..."
                />
              </div>
              <hr />
            </div>
          );
        })}

        {/* Import/Export */}
        <div className="import-export-section">
          <div className="file-actions">
            <label className="file-input-label">
              Import Settings
              <input
                type="file"
                accept=".json"
                onChange={importSettings}
                className="file-input"
              />
            </label>
            <button className="export-btn" onClick={exportSettings}>
              Export Settings
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ResearchPanel;
