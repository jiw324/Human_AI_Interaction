import { useState } from 'react'
import ChatBox from './components/ChatBox'
import ResearchPanel from './components/ResearchPanel'
import ConversationHistory from './components/ConversationHistory'
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
  const [currentView, setCurrentView] = useState<'chat' | 'research' | 'history'>('chat');
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

  const handleLoadConversation = (conversation: Conversation) => {
    setCurrentView('chat');
    console.log('Loading conversation:', conversation);
  };

  const handleDeleteConversation = (conversationId: string) => {
    setConversations(prev => prev.filter(conv => conv.id !== conversationId));
  };

  const handleShowHistory = () => {
    setCurrentView('history');
  };

  return (
    <div className="app">
      <div className="simple-nav">
        <button 
          className={`nav-btn ${currentView === 'chat' ? 'active' : ''}`}
          onClick={() => setCurrentView('chat')}
        >
          Chat
        </button>
        <button 
          className={`nav-btn ${currentView === 'research' ? 'active' : ''}`}
          onClick={() => setCurrentView('research')}
        >
          Research
        </button>
        <button 
          className={`nav-btn ${currentView === 'history' ? 'active' : ''}`}
          onClick={() => setCurrentView('history')}
        >
          History
        </button>
      </div>
      
      <div className="main-content">
        {currentView === 'chat' ? (
          <div className="chat-section">
            <ChatBox 
              aiSettingsByModel={aiSettingsByModel}
              onSaveConversation={handleSaveConversation}
              onShowHistory={handleShowHistory}
            />
          </div>
        ) : currentView === 'research' ? (
          <div className="research-section">
            <ResearchPanel 
              settingsByModel={aiSettingsByModel}
              onModelSettingsChange={handleSettingsChangeForModel}
              modelNames={modelNames}
            />
          </div>
        ) : (
          <div className="history-section">
            <ConversationHistory
              conversations={conversations}
              onLoadConversation={handleLoadConversation}
              onDeleteConversation={handleDeleteConversation}
            />
          </div>
        )}
      </div>
    </div>
  )
}

export default App
