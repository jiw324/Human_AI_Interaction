import { useState } from 'react'
import { Routes, Route, NavLink, useNavigate, Navigate } from 'react-router-dom'
import ChatBox from './components/ChatBox'
import ResearchPanel from './components/ResearchPanel'
import ConversationHistory from './components/ConversationHistory'
import LoginPage from './components/LoginPage'
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
    // Check if user is logged in from localStorage
    return localStorage.getItem('researchLoggedIn') === 'true';
  });
  const [conversations, setConversations] = useState<Conversation[]>([]);

  const modelNames: string[] = ['Task 1', 'Task 2', 'Task 3', 'Task 4'];

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

  const [aiSettingsByModel, setAiSettingsByModel] = useState<Record<string, AISettings>>({
    'Task 1': { ...defaultSettings, personality: 'analytical' },
    'Task 2': { ...defaultSettings, personality: 'creative' },
    'Task 3': { ...defaultSettings, personality: 'expert' },
    'Task 4': { ...defaultSettings, personality: 'friendly' }
  });

  const handleSettingsChangeForModel = (model: string, newSettings: AISettings) => {
    setAiSettingsByModel(prev => ({ ...prev, [model]: newSettings }));
  };

  const handleSaveConversation = (conversation: Conversation) => {
    setConversations(prev => {
      const existingIndex = prev.findIndex(conv => conv.id === conversation.id);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = conversation;
        return updated;
      } else {
        return [...prev, conversation];
      }
    });
  };

  const navigate = useNavigate();

  const handleLoadConversation = (conversation: Conversation) => {
    navigate('/');
    console.log('Loading conversation:', conversation);
  };

  const handleDeleteConversation = (conversationId: string) => {
    setConversations(prev => prev.filter(conv => conv.id !== conversationId));
  };

  const handleShowHistory = () => {
    navigate('/history');
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
                  onShowHistory={handleShowHistory}
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
