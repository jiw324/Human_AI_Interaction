import React, { useState, useRef, useEffect } from 'react';
import { tasksAPI, type Task } from '../services/api';
import './ResearchPanel.css';
import './ResearchPanel_additions.css';

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
  googleApiKey?: string;
  mistralApiKey?: string;
  cohereApiKey?: string;
  replicateApiKey?: string;
  huggingfaceApiKey?: string;
  defaultModel?: string;
  autoUpdateRobotList?: boolean;
}

interface ResearchPanelProps {
  tasks: Task[];
  onTasksChange: (tasks: Task[]) => void;
}

const ResearchPanel: React.FC<ResearchPanelProps> = ({ tasks, onTasksChange }) => {
  const [activeTaskId, setActiveTaskId] = useState<string>(tasks[0]?.id || '');
  const [newTaskName, setNewTaskName] = useState<string>('');
  const isAddingTask = useRef(false);
  
  // Local editing state to prevent focus loss on most settings
  const [editingSettings, setEditingSettings] = useState<AISettings | null>(null);
  // Dedicated draft state for prompts so they don't reset while typing
  const [systemPromptDraft, setSystemPromptDraft] = useState<string>('');
  const [taskPromptDraft, setTaskPromptDraft] = useState<string>('');
  // AI-SUGGESTION: Dirty flags prevent background task/settings refreshes from overwriting user edits mid-typing.
  const [isSystemPromptDirty, setIsSystemPromptDirty] = useState<boolean>(false);
  const [isTaskPromptDirty, setIsTaskPromptDirty] = useState<boolean>(false);
  
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
  
  // Find active task (may be null if no tasks exist)
  const activeTask = tasks.length > 0 ? tasks.find(t => t.id === activeTaskId) : null;

  // Get current settings (from editing state or active task, or defaults if no task)
  const defaultSettings: AISettings = {
    personality: 'friendly',
    responseSpeed: 1.0,
    creativity: 0.7,
    helpfulness: 0.9,
    verbosity: 0.6,
    temperature: 0.7,
    maxTokens: 1000,
    systemPrompt: 'You are a helpful AI assistant. Be friendly, informative, and engaging in your responses.',
    taskPrompt: 'Please provide specific instructions or context for this task. This prompt will guide the AI in understanding your specific requirements and objectives.',
    llamaBaseUrl: 'https://litellm.cloud.osu.edu',
    llamaServiceUrl: '',
    llamaApiKey: '',
    openaiApiKey: '',
    anthropicApiKey: '',
    googleApiKey: '',
    mistralApiKey: '',
    cohereApiKey: '',
    replicateApiKey: '',
    huggingfaceApiKey: '',
    defaultModel: 'gpt-4o-2024-11-20', // Use latest working model
    autoUpdateRobotList: false
  };
  
  const currentSettings = editingSettings || (activeTask?.settings) || defaultSettings;

  // AI-SUGGESTION: Persist prompt drafts per-task so refreshes (or background updates) don't wipe in-progress edits.
  const getSystemPromptDraftStorageKey = (taskId: string) => `research_prompt_draft:${taskId}:system`;
  const getTaskPromptDraftStorageKey = (taskId: string) => `research_prompt_draft:${taskId}:task`;

  // Keep prompt drafts in sync with the active task's settings,
  // but ONLY when switching tasks (not when the task object reference changes).
  useEffect(() => {
    // Reset dirty flags when switching tasks.
    setIsSystemPromptDirty(false);
    setIsTaskPromptDirty(false);

    if (!activeTaskId) {
      setSystemPromptDraft(defaultSettings.systemPrompt);
      setTaskPromptDraft(defaultSettings.taskPrompt);
      return;
    }

    const storedSystemDraft = localStorage.getItem(getSystemPromptDraftStorageKey(activeTaskId));
    const storedTaskDraft = localStorage.getItem(getTaskPromptDraftStorageKey(activeTaskId));

    const baseSystemPrompt = activeTask?.settings?.systemPrompt ?? defaultSettings.systemPrompt;
    const baseTaskPrompt = activeTask?.settings?.taskPrompt ?? defaultSettings.taskPrompt;

    if (storedSystemDraft !== null) {
      setSystemPromptDraft(storedSystemDraft);
      setIsSystemPromptDirty(true);
    } else {
      setSystemPromptDraft(baseSystemPrompt);
    }

    if (storedTaskDraft !== null) {
      setTaskPromptDraft(storedTaskDraft);
      setIsTaskPromptDirty(true);
    } else {
      setTaskPromptDraft(baseTaskPrompt);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTaskId]);

  // AI-SUGGESTION: If the active task settings change (e.g., after save), re-sync drafts only when the user isn't editing.
  useEffect(() => {
    if (!activeTaskId) return;

    const storedSystemDraft = localStorage.getItem(getSystemPromptDraftStorageKey(activeTaskId));
    const storedTaskDraft = localStorage.getItem(getTaskPromptDraftStorageKey(activeTaskId));

    if (!isSystemPromptDirty && storedSystemDraft === null && activeTask?.settings?.systemPrompt) {
      setSystemPromptDraft(activeTask.settings.systemPrompt);
    }

    if (!isTaskPromptDirty && storedTaskDraft === null && activeTask?.settings?.taskPrompt) {
      setTaskPromptDraft(activeTask.settings.taskPrompt);
    }
  }, [
    activeTaskId,
    activeTask?.settings?.systemPrompt,
    activeTask?.settings?.taskPrompt,
    isSystemPromptDirty,
    isTaskPromptDirty,
  ]);

  const handleSettingChange = (key: keyof AISettings, value: string | number | boolean) => {
    if (!activeTask) return;
    
    // Update local editing state only (prevents re-render and focus loss)
    const newSettings = { ...currentSettings, [key]: value };
    setEditingSettings(newSettings);
  };

  const handleUpdate = async () => {
    if (!activeTask) {
      alert('⚠️ Please create a task first before updating settings.');
      return;
    }
    
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

  const handleUpdateSystemPrompt = async () => {
    if (!activeTask) {
      alert('⚠️ Please create a task first before updating the system prompt.');
      return;
    }
    
    try {
      console.log('🔄 Updating system prompt to backend...', {
        taskId: activeTask.id,
        taskName: activeTask.name,
        systemPrompt: systemPromptDraft
      });
      
      const updatedTask = await tasksAPI.update(activeTask.id, undefined, {
        ...currentSettings,
        systemPrompt: systemPromptDraft
      });
      
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
        console.log('💾 System prompt updated in localStorage');

        // AI-SUGGESTION: Clear saved draft after successful save so future refreshes show the saved value.
        localStorage.removeItem(getSystemPromptDraftStorageKey(activeTaskId));
        setIsSystemPromptDirty(false);
        
        alert('✅ System Prompt updated successfully!');
      }
    } catch (error) {
      console.error('❌ Failed to update system prompt:', error);
      alert('Failed to update system prompt. Please try again.');
    }
  };

  const handleUpdateTaskPrompt = async () => {
    if (!activeTask) {
      alert('⚠️ Please create a task first before updating the task prompt.');
      return;
    }
    
    try {
      console.log('🔄 Updating task prompt to backend...', {
        taskId: activeTask.id,
        taskName: activeTask.name,
        taskPrompt: taskPromptDraft
      });
      
      const updatedTask = await tasksAPI.update(activeTask.id, undefined, {
        ...currentSettings,
        taskPrompt: taskPromptDraft
      });
      
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
        console.log('💾 Task prompt updated in localStorage');

        // AI-SUGGESTION: Clear saved draft after successful save so future refreshes show the saved value.
        localStorage.removeItem(getTaskPromptDraftStorageKey(activeTaskId));
        setIsTaskPromptDirty(false);
        
        alert('✅ Task Prompt updated successfully!');
      }
    } catch (error) {
      console.error('❌ Failed to update task prompt:', error);
      alert('Failed to update task prompt. Please try again.');
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
      taskPrompt: 'Please provide specific instructions or context for this task. This prompt will guide the AI in understanding your specific requirements and objectives.',
      llamaBaseUrl: 'https://litellm.cloud.osu.edu',
      llamaServiceUrl: '',
      llamaApiKey: '',
      openaiApiKey: '',
      anthropicApiKey: '',
      googleApiKey: '',
      mistralApiKey: '',
      cohereApiKey: '',
      replicateApiKey: '',
      huggingfaceApiKey: '',
      defaultModel: 'gpt-4o-2024-11-20',
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
    } catch (error: any) {
      console.error('❌ Error creating task:', error);
      
      // Show specific error message from backend
      const errorMessage = error.message || 'Failed to create task. Please try again.';
      alert(`⚠️ ${errorMessage}`);
    } finally {
      // Reset flag after operation completes
      setTimeout(() => {
        isAddingTask.current = false;
      }, 300);
    }
  };

  const deleteTask = async (taskId: string) => {
    const taskToDelete = tasks.find(t => t.id === taskId);
    if (!taskToDelete) return;
    
    if (window.confirm(`Are you sure you want to delete task "${taskToDelete.name}"?`)) {
      try {
        console.log('🗑️ Deleting task:', taskToDelete.name);
        const success = await tasksAPI.delete(taskId);
        
        if (success) {
          // AI-SUGGESTION: Remove any persisted drafts for the deleted task to avoid stale data.
          localStorage.removeItem(getSystemPromptDraftStorageKey(taskId));
          localStorage.removeItem(getTaskPromptDraftStorageKey(taskId));

          const newTasks = tasks.filter(t => t.id !== taskId);
          onTasksChange(newTasks);
          
          // Save to localStorage
          localStorage.setItem('research_tasks', JSON.stringify(newTasks));
          console.log('💾 Task deletion saved to localStorage');
          
          if (activeTaskId === taskId) {
            if (newTasks.length > 0) {
              setActiveTaskId(newTasks[0].id);
            } else {
              setActiveTaskId('');
            }
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

  return (
    <div className="research-panel">
      <div className="panel-header">
        <h2>AI Research Panel</h2>
      </div>

      <div className="panel-content">
        <div className="panel-layout">
          {/* LEFT PANEL - Tasks List */}
          <div className="left-panel">
            <div className="config-section tasks-section">
              <h3 className="section-title">Tasks</h3>
              
              {tasks.length === 0 && (
                <div style={{ padding: '20px', textAlign: 'center', background: '#f0f0f0', borderRadius: '8px', marginBottom: '20px' }}>
                  <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>
                    📝 No tasks yet. Create your first task!
                  </p>
                </div>
              )}
              
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
          </div>
          
          {/* RIGHT PANEL - Task Configuration */}
          <div className="right-panel">
        
        {!activeTask && tasks.length === 0 && (
          <div style={{ padding: '30px', textAlign: 'center', background: '#fff3cd', borderRadius: '8px', margin: '20px 0' }}>
            <p style={{ margin: 0, color: '#856404', fontSize: '18px', fontWeight: 500 }}>
              ⚠️ Create a task above to configure settings
            </p>
          </div>
        )}

        {/* System Prompt and Task Prompt Side by Side */}
        {activeTask && (
          <div className="prompts-container">
          <div className="config-section prompt-section">
            <h3 className="section-title">System Prompt</h3>
            <div className="setting-group full-width">
              <textarea
                value={systemPromptDraft}
                onChange={(e) => {
                  // AI-SUGGESTION: Mark draft dirty + persist per-task so the draft survives refreshes.
                  const nextValue = e.target.value;
                  setSystemPromptDraft(nextValue);
                  setIsSystemPromptDirty(true);
                  if (activeTaskId) {
                    localStorage.setItem(getSystemPromptDraftStorageKey(activeTaskId), nextValue);
                  }
                }}
                className="setting-textarea"
                rows={6}
                placeholder="Enter the system prompt that defines the AI's behavior..."
              />
            </div>
            <button
              type="button"
              className="btn-update-prompt"
              onClick={handleUpdateSystemPrompt}
            >
              💾 Update System Prompt
            </button>
          </div>

          <div className="config-section prompt-section">
            <h3 className="section-title">Task Prompt</h3>
            <div className="setting-group full-width">
              <textarea
                value={taskPromptDraft}
                onChange={(e) => {
                  // AI-SUGGESTION: Mark draft dirty + persist per-task so the draft survives refreshes.
                  const nextValue = e.target.value;
                  setTaskPromptDraft(nextValue);
                  setIsTaskPromptDirty(true);
                  if (activeTaskId) {
                    localStorage.setItem(getTaskPromptDraftStorageKey(activeTaskId), nextValue);
                  }
                }}
                className="setting-textarea"
                rows={6}
                placeholder="Enter the specific task prompt or instructions..."
              />
            </div>
            <button
              type="button"
              className="btn-update-prompt"
              onClick={handleUpdateTaskPrompt}
            >
              💾 Update Task Prompt
            </button>
          </div>
        </div>
        )}

        {/* Model Selection */}
        {activeTask && (
          <div className="config-section">
            <h3 className="section-title">🤖 Select AI Model</h3>
            <p className="section-description">Choose from any model supported by your LiteLLM configuration</p>
            <div className="setting-group">
              <label>AI Model</label>
              <select
                value={currentSettings.defaultModel || 'gpt-4o-2024-11-20'}
                onChange={(e) => handleSettingChange('defaultModel', e.target.value)}
                className="setting-select"
              >
                <optgroup label="🤖 OpenAI Models (OSU LiteLLM)">
                  <option value="gpt-4o-2024-11-20">GPT-4o</option>
                  <option value="gpt-4o-mini-2024-07-18">GPT-4o Mini</option>
                  <option value="gpt-4.1-2025-04-14">GPT-4.1</option>
                  <option value="gpt-4.1-mini-2025-04-14">GPT-4.1 Mini</option>
                  <option value="gpt-4.1-nano-2025-04-14">GPT-4.1 Nano</option>
                </optgroup>
                <optgroup label="🧠 Anthropic Models (Claude)">
                  <option value="claude-3-5-sonnet-20240620">Claude 3.5 Sonnet</option>
                  <option value="claude-3-5-haiku-20241022">Claude 3.5 Haiku</option>
                  <option value="claude-sonnet-4-20250514">Claude 4 Sonnet</option>
                  <option value="claude-opus-4-20250514">Claude 4 Opus</option>
                  <option value="claude-opus-4-1-20250805">Claude 4.1 Opus</option>
                  <option value="claude-sonnet-4-5-20250929">Claude 4.5 Sonnet</option>
                </optgroup>
                <optgroup label="🌟 Google Models (Gemini)">
                  <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
                  <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                  <option value="gemini-3-pro-preview">Gemini 3 Pro (Preview)</option>
                </optgroup>
                <optgroup label="🦙 Meta Models (Llama)">
                  <option value="llama3-3-70b-instruct">Llama 3.3 70B Instruct</option>
                </optgroup>
                <optgroup label="📦 Other Models">
                  <option value="mistral-7b-instruct">Mistral 7B Instruct</option>
                  <option value="nova-pro-v1">Nova Pro</option>
                  <option value="nova-lite-v1">Nova Lite</option>
                  <option value="nova-micro-v1">Nova Micro</option>
                  <option value="deepseek-r1-v1:0">DeepSeek R1</option>
                </optgroup>
              </select>
              <small className="form-hint">
                💡 Tip: Configure API keys above for the models you want to use. 
                LiteLLM will automatically route requests to the correct provider.
              </small>
            </div>
            <button
              type="button"
              className="btn-update-prompt"
              onClick={handleUpdate}
            >
              💾 Update Model
            </button>
          </div>
        )}
            
            {!activeTask && tasks.length === 0 && (
              <div className="no-task-message">
                <p>👈 Create a task to get started</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResearchPanel;
