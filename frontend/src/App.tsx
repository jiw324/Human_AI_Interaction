import { useState, useEffect, useCallback } from 'react'
import { Routes, Route, NavLink, useNavigate, Navigate } from 'react-router-dom'
import ChatBox from './components/ChatBox'
import ResearchPanel from './components/ResearchPanel'
import ConversationHistory from './components/ConversationHistory'
import LoginPage from './components/LoginPage'
import { authService, tasksAPI, conversationsAPI, type Task, type Conversation, type Message } from './services/api'
import { getDeviceId } from './utils/deviceId'
import { useBackendHealth } from './hooks/useBackendHealth'
import './App.css'

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    // Check if user is logged in from localStorage and has valid token
    return localStorage.getItem('researchLoggedIn') === 'true' && authService.isAuthenticated();
  });
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tasksLoading, setTasksLoading] = useState<boolean>(true);
  
  // AI-SUGGESTION: Backend health check is debounced:
  // runs on mount, then 60s after the user's last interaction.
  const healthStatus = useBackendHealth();
  const backendStatus = healthStatus.isOnline ? 'online' : 'offline';

  // Load tasks from localStorage first, then sync with backend
  useEffect(() => {
    const loadTasks = async () => {
      if (backendStatus === 'online') {
        console.log('📡 Loading tasks (no login required)...');
        setTasksLoading(true);
        
        // Try to load from localStorage first for instant UI
        const cachedTasks = localStorage.getItem('research_tasks');
        if (cachedTasks) {
          try {
            const parsed = JSON.parse(cachedTasks);
            console.log('💾 Loaded tasks from localStorage:', parsed);
            setTasks(parsed);
          } catch (error) {
            console.error('Error parsing cached tasks:', error);
          }
        }
        
        // Then fetch from backend and update
        const fetchedTasks = await tasksAPI.getAll();
        console.log('📦 Tasks received from backend:', fetchedTasks);
        setTasks(fetchedTasks);
        
        // Save to localStorage
        localStorage.setItem('research_tasks', JSON.stringify(fetchedTasks));
        console.log('💾 Tasks saved to localStorage');
        
        setTasksLoading(false);
        console.log('✨ Tasks state updated in App');
      } else {
        console.log('⏸️ Backend offline, not loading tasks');
      }
    };
    loadTasks();
  }, [backendStatus]);

  // Save tasks to localStorage whenever they change
  useEffect(() => {
    if (tasks.length > 0) {
      localStorage.setItem('research_tasks', JSON.stringify(tasks));
      console.log('💾 Tasks saved to localStorage (auto-sync)');
    }
  }, [tasks]);

  // Load conversations from localStorage on mount
  useEffect(() => {
    const savedConversations = localStorage.getItem('conversations');
    if (savedConversations) {
      try {
        const parsed = JSON.parse(savedConversations);
        // Convert date strings back to Date objects and sort messages
        const conversationsWithDates = parsed.map((conv: any) => {
          const messages = conv.messages.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }));
          
          // Sort messages by timestamp (oldest first)
          const sortedMessages = messages.sort((a: Message, b: Message) => 
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          );
          
          return {
            ...conv,
            createdAt: new Date(conv.createdAt),
            lastMessageAt: new Date(conv.lastMessageAt),
            messages: sortedMessages
          };
        });
        setConversations(conversationsWithDates);
      } catch (error) {
        console.error('Error parsing saved conversations:', error);
      }
    }
  }, []);

  const handleSaveConversation = useCallback(async (conversation: Conversation) => {
    // Only update state if conversation actually changed
    setConversations(prev => {
      const existingIndex = prev.findIndex(conv => conv.id === conversation.id);
      
      // Check if conversation actually changed to prevent unnecessary re-renders
      if (existingIndex >= 0) {
        const existing = prev[existingIndex];
        // Compare message counts and last message timestamp
        if (existing.messages.length === conversation.messages.length &&
            existing.lastMessageAt.getTime() === conversation.lastMessageAt.getTime()) {
          return prev; // No change, return same reference
        }
        
        const updated = [...prev];
        updated[existingIndex] = conversation;
        localStorage.setItem('conversations', JSON.stringify(updated));
        return updated;
      } else {
        const updated = [...prev, conversation];
        localStorage.setItem('conversations', JSON.stringify(updated));
        return updated;
      }
    });

    // Save to backend database
    // In production, use a static admin user ID; in development, use per-device ID.
    try {
      const userId = import.meta.env.PROD ? 'admin-001' : await getDeviceId();
      await conversationsAPI.save(userId, conversation);
      // Removed console.log to reduce spam
    } catch (error) {
      console.error('❌ Error saving conversation to backend:', error);
    }
  }, []);

  const navigate = useNavigate();

  const handleDeleteConversation = async (conversationId: string) => {
    try {
      // Determine userId based on login status
      const isLoggedIn = authService.isAuthenticated();
      const userId = isLoggedIn ? 'admin-001' : await getDeviceId();
      
      // Delete from database
      console.log('🗑️ Deleting conversation:', conversationId);
      const success = await conversationsAPI.delete(userId, conversationId);
      
      if (success) {
        console.log('✅ Conversation deleted from database');
        // Remove from frontend state
        setConversations(prev => {
          const updated = prev.filter(conv => conv.id !== conversationId);
          // Save to localStorage
          localStorage.setItem('conversations', JSON.stringify(updated));
          return updated;
        });
      } else {
        console.error('❌ Failed to delete conversation from database');
      }
    } catch (error) {
      console.error('❌ Error deleting conversation:', error);
    }
  };

  const handleConversationsLoaded = useCallback((loadedConversations: Conversation[]) => {
    console.log(`🔄 [App.tsx] handleConversationsLoaded called with ${loadedConversations.length} conversations`);
    console.log(`📋 [App.tsx] Conversation IDs:`, loadedConversations.map(c => c.id));

    setConversations(prev => {
      // Preserve existing createdAt from current state so History time matches ChatBox,
      // even if backend/database timezones differ.
      const existingById = new Map(prev.map(conv => [conv.id, conv]));

      const merged = loadedConversations.map(conv => {
        const existing = existingById.get(conv.id);
        if (existing) {
          return {
            ...conv,
            createdAt: existing.createdAt, // keep original creation time from client
          };
        }
        return conv;
      });

      // Also save to localStorage
      localStorage.setItem('conversations', JSON.stringify(merged));
      console.log(`✅ State updated with ${merged.length} conversations`);
      return merged;
    });
  }, []);

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
            style={{ display: 'none' }}
          >
            Research Login
          </NavLink>
        )}
        <div 
          className="backend-status" 
          title={`Backend: ${backendStatus}${healthStatus.lastChecked ? `\nLast checked: ${healthStatus.lastChecked.toLocaleTimeString()}` : ''}`}
        >
          <span className={`status-dot ${backendStatus}`}></span>
          <span className="status-text">
            {backendStatus === 'online' ? 'Backend Online' : 'Backend Offline'}
          </span>
        </div>
      </div>
      
      <div className="main-content">
        <Routes>
          <Route 
            path="/" 
            element={
              <div className="chat-section">
                {tasksLoading ? (
                  <div style={{ padding: '40px', textAlign: 'center' }}>
                    <p>Loading tasks...</p>
                  </div>
                ) : (
                  <ChatBox 
                    tasks={tasks}
                    onSaveConversation={handleSaveConversation}
                  />
                )}
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
              !isLoggedIn ? <Navigate to="/login" replace /> : (
                <div className="research-section">
                  <ResearchPanel
                    tasks={tasks}
                    onTasksChange={setTasks}
                  />
                </div>
              )
            }
          />
          <Route
            path="/history"
            element={
              !isLoggedIn ? <Navigate to="/login" replace /> : (
                <div className="history-section">
                  <ConversationHistory
                    conversations={conversations}
                    onDeleteConversation={handleDeleteConversation}
                    onConversationsLoaded={handleConversationsLoaded}
                  />
                </div>
              )
            }
          />
        </Routes>
      </div>
    </div>
  )
}

export default App
