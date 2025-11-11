import { useState, useEffect, useCallback } from 'react'
import { Routes, Route, NavLink, useNavigate, Navigate } from 'react-router-dom'
import ChatBox from './components/ChatBox'
import ResearchPanel from './components/ResearchPanel'
import ConversationHistory from './components/ConversationHistory'
import LoginPage from './components/LoginPage'
import { authService, healthAPI } from './services/api'
import './App.css'

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

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

interface AIModel {
  name: string;
  greeting: string;
  personality: string;
  icon: string;
}

interface Conversation {
  id: string;
  title: string;
  aiModel: AIModel;
  messages: Message[];
  createdAt: Date;
  lastMessageAt: Date;
}

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    // Check if user is logged in from localStorage and has valid token
    return localStorage.getItem('researchLoggedIn') === 'true' && authService.isAuthenticated();
  });
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking');

  const modelNames: string[] = ['Task 1', 'Task 2', 'Task 3', 'Task 4'];

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

  const getInitialSettings = (): Record<string, AISettings> => {
    const savedSettings = localStorage.getItem('aiSettingsByModel');
    if (savedSettings) {
      try {
        return JSON.parse(savedSettings);
      } catch (error) {
        console.error('Error parsing saved settings:', error);
      }
    }
    return {
      'Task 1': { ...defaultSettings, personality: 'analytical', taskPrompt: '' },
      'Task 2': { ...defaultSettings, personality: 'creative', taskPrompt: '' },
      'Task 3': { ...defaultSettings, personality: 'expert', taskPrompt: '' },
      'Task 4': { ...defaultSettings, personality: 'friendly', taskPrompt: '' }
    };
  };

  const [aiSettingsByModel, setAiSettingsByModel] = useState<Record<string, AISettings>>(getInitialSettings);

  const handleSettingsChangeForModel = (model: string, newSettings: AISettings) => {
    setAiSettingsByModel(prev => {
      const updated = { ...prev, [model]: newSettings };
      // Save to localStorage
      localStorage.setItem('aiSettingsByModel', JSON.stringify(updated));
      return updated;
    });
  };

  // Check backend health on mount
  useEffect(() => {
    const checkBackend = async () => {
      const isOnline = await healthAPI.check();
      setBackendStatus(isOnline ? 'online' : 'offline');
    };
    checkBackend();
  }, []);

  // Load conversations from localStorage on mount
  useEffect(() => {
    const savedConversations = localStorage.getItem('conversations');
    if (savedConversations) {
      try {
        const parsed = JSON.parse(savedConversations);
        // Convert date strings back to Date objects
        const conversationsWithDates = parsed.map((conv: any) => ({
          ...conv,
          createdAt: new Date(conv.createdAt),
          lastMessageAt: new Date(conv.lastMessageAt),
          messages: conv.messages.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }))
        }));
        setConversations(conversationsWithDates);
      } catch (error) {
        console.error('Error parsing saved conversations:', error);
      }
    }
  }, []);

  const handleSaveConversation = useCallback((conversation: Conversation) => {
    setConversations(prev => {
      const existingIndex = prev.findIndex(conv => conv.id === conversation.id);
      let updated;
      if (existingIndex >= 0) {
        updated = [...prev];
        updated[existingIndex] = conversation;
      } else {
        updated = [...prev, conversation];
      }
      // Save to localStorage
      localStorage.setItem('conversations', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const navigate = useNavigate();

  const handleLoadConversation = (conversation: Conversation) => {
    navigate('/');
    // TODO: Implement conversation loading logic
  };

  const handleDeleteConversation = (conversationId: string) => {
    setConversations(prev => {
      const updated = prev.filter(conv => conv.id !== conversationId);
      // Save to localStorage
      localStorage.setItem('conversations', JSON.stringify(updated));
      return updated;
    });
  };

  const handleLogin = (researchKey: string) => {
    setIsLoggedIn(true);
    localStorage.setItem('researchLoggedIn', 'true');
    localStorage.setItem('researchKey', researchKey);
    navigate('/research');
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    localStorage.removeItem('researchLoggedIn');
    localStorage.removeItem('researchKey');
    authService.clearToken(); // Clear JWT token
    navigate('/');
  };

  const handleBackToHome = () => {
    navigate('/');
  };

  // Protected route component
  const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    if (!isLoggedIn) {
      return <Navigate to="/login" replace />;
    }
    return <>{children}</>;
  };

  return (
    <div className="app">
      <div className="simple-nav">
        <NavLink 
          to="/"
          className={({ isActive }) => `nav-btn ${isActive ? 'active' : ''}`}
        >
          Chat
        </NavLink>
        {isLoggedIn ? (
          <>
            <NavLink 
              to="/research"
              className={({ isActive }) => `nav-btn ${isActive ? 'active' : ''}`}
            >
              Research
            </NavLink>
            <NavLink 
              to="/history"
              className={({ isActive }) => `nav-btn ${isActive ? 'active' : ''}`}
            >
              History
            </NavLink>
            <button 
              onClick={handleLogout}
              className="nav-btn logout-btn"
            >
              Logout
            </button>
          </>
        ) : (
          <NavLink 
            to="/login"
            className={({ isActive }) => `nav-btn ${isActive ? 'active' : ''}`}
          >
            Research Login
          </NavLink>
        )}
        <div className="backend-status" title={`Backend: ${backendStatus}`}>
          <span className={`status-dot ${backendStatus}`}></span>
          <span className="status-text">{backendStatus === 'online' ? 'Backend Online' : backendStatus === 'offline' ? 'Backend Offline' : 'Checking...'}</span>
        </div>
      </div>
      
      <div className="main-content">
        <Routes>
          <Route 
            path="/" 
            element={
              <div className="chat-section">
                <ChatBox 
                  aiSettingsByModel={aiSettingsByModel}
                  onSaveConversation={handleSaveConversation}
                />
              </div>
            } 
          />
          <Route 
            path="/login" 
            element={
              <LoginPage 
                onLogin={handleLogin}
                onBackToHome={handleBackToHome}
              />
            } 
          />
          <Route 
            path="/research" 
            element={
              <ProtectedRoute>
                <div className="research-section">
                  <ResearchPanel 
                    settingsByModel={aiSettingsByModel}
                    onModelSettingsChange={handleSettingsChangeForModel}
                    modelNames={modelNames}
                  />
                </div>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/history" 
            element={
              <ProtectedRoute>
                <div className="history-section">
                  <ConversationHistory
                    conversations={conversations}
                    onLoadConversation={handleLoadConversation}
                    onDeleteConversation={handleDeleteConversation}
                  />
                </div>
              </ProtectedRoute>
            } 
          />
        </Routes>
      </div>
    </div>
  )
}

export default App
