import { useState, useEffect, useCallback } from 'react'
import { Routes, Route, NavLink, useNavigate, Navigate, useParams } from 'react-router-dom'
import ChatBox from './components/ChatBox'
import HomePage from './components/HomePage'
import ResearchPanel from './components/ResearchPanel'
import ConversationHistory from './components/ConversationHistory'
import LoginPage from './components/LoginPage'
import AdminPanel from './components/AdminPanel'
import { authService, tasksAPI, conversationsAPI, type Task, type Conversation, type Message } from './services/api'
import { getDeviceId } from './utils/deviceId'
import { useBackendHealth } from './hooks/useBackendHealth'
import './App.css'

/**
 * Participant-facing chatbox scoped to a specific research group.
 * URL: /study/:userId  (the researcher's UUID — not their secret research key)
 */
function StudyChatPage({ onSaveConversation }: { onSaveConversation: (c: Conversation) => void }) {
  const { userId } = useParams<{ userId: string }>();
  const [studyTasks, setStudyTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    tasksAPI.getByUserId(userId).then(result => {
      if (cancelled) return;
      if (!result) {
        setNotFound(true);
      } else {
        setStudyTasks(result);
      }
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [userId]);

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading study...</div>;
  if (notFound) return <div style={{ padding: '40px', textAlign: 'center' }}>Research group not found.</div>;

  return (
    <div className="chat-section">
      <ChatBox tasks={studyTasks} onSaveConversation={onSaveConversation} />
    </div>
  );
}

/**
 * Researcher panel scoped to a specific UUID.
 * URL: /research/:userId
 * Redirects to /login if not authenticated, or to the correct UUID if it doesn't match the JWT.
 */
function ResearchPanelPage({
  tasks,
  onTasksChange,
  isLoggedIn
}: {
  tasks: Task[];
  onTasksChange: (t: Task[]) => void;
  isLoggedIn: boolean;
}) {
  const { userId } = useParams<{ userId: string }>();
  const currentUserId = authService.getUserId();

  if (!isLoggedIn) return <Navigate to="/login" replace />;
  if (userId !== currentUserId && currentUserId) {
    return <Navigate to={`/research/${currentUserId}`} replace />;
  }

  return (
    <div className="research-section">
      <ResearchPanel tasks={tasks} onTasksChange={onTasksChange} />
    </div>
  );
}

/**
 * Conversation history scoped to a specific UUID.
 * URL: /history/:userId
 */
function HistoryPage({
  conversations,
  onDeleteConversation,
  onConversationsLoaded,
  isLoggedIn
}: {
  conversations: Conversation[];
  onDeleteConversation: (id: string) => void;
  onConversationsLoaded: (c: Conversation[]) => void;
  isLoggedIn: boolean;
}) {
  const { userId } = useParams<{ userId: string }>();
  const currentUserId = authService.getUserId();

  if (!isLoggedIn) return <Navigate to="/login" replace />;
  if (userId !== currentUserId && currentUserId) {
    return <Navigate to={`/history/${currentUserId}`} replace />;
  }

  return (
    <div className="history-section">
      <ConversationHistory
        conversations={conversations}
        onDeleteConversation={onDeleteConversation}
        onConversationsLoaded={onConversationsLoaded}
      />
    </div>
  );
}

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    return localStorage.getItem('researchLoggedIn') === 'true' && authService.isAuthenticated();
  });
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);

  const healthStatus = useBackendHealth();
  const backendStatus = healthStatus.isOnline ? 'online' : 'offline';

  // Load tasks only when logged in — GET /api/tasks now requires auth
  useEffect(() => {
    const loadTasks = async () => {
      if (backendStatus === 'online' && isLoggedIn) {
        console.log('📡 Loading tasks for logged-in researcher...');

        const cachedTasks = localStorage.getItem('research_tasks');
        if (cachedTasks) {
          try {
            setTasks(JSON.parse(cachedTasks));
          } catch (_) {}
        }

        const fetchedTasks = await tasksAPI.getAll();
        setTasks(fetchedTasks);
        localStorage.setItem('research_tasks', JSON.stringify(fetchedTasks));
        console.log('✨ Tasks loaded from backend');
      }
    };
    loadTasks();
  }, [backendStatus, isLoggedIn]);

  // Save tasks to localStorage whenever they change
  useEffect(() => {
    if (tasks.length > 0) {
      localStorage.setItem('research_tasks', JSON.stringify(tasks));
    }
  }, [tasks]);

  // Load conversations from localStorage on mount
  useEffect(() => {
    const savedConversations = localStorage.getItem('conversations');
    if (savedConversations) {
      try {
        const parsed = JSON.parse(savedConversations);
        const conversationsWithDates = parsed.map((conv: any) => {
          const messages = conv.messages.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }));
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
    setConversations(prev => {
      const existingIndex = prev.findIndex(conv => conv.id === conversation.id);
      if (existingIndex >= 0) {
        const existing = prev[existingIndex];
        if (existing.messages.length === conversation.messages.length &&
            existing.lastMessageAt.getTime() === conversation.lastMessageAt.getTime()) {
          return prev;
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

    try {
      const userId = authService.getUserId() || await getDeviceId();
      await conversationsAPI.save(userId, conversation);
    } catch (error) {
      console.error('❌ Error saving conversation to backend:', error);
    }
  }, []);

  const navigate = useNavigate();

  const handleDeleteConversation = async (conversationId: string) => {
    try {
      const userId = authService.getUserId() || await getDeviceId();
      const success = await conversationsAPI.delete(userId, conversationId);
      if (success) {
        setConversations(prev => {
          const updated = prev.filter(conv => conv.id !== conversationId);
          localStorage.setItem('conversations', JSON.stringify(updated));
          return updated;
        });
      }
    } catch (error) {
      console.error('❌ Error deleting conversation:', error);
    }
  };

  const handleConversationsLoaded = useCallback((loadedConversations: Conversation[]) => {
    setConversations(prev => {
      const existingById = new Map(prev.map(conv => [conv.id, conv]));
      const merged = loadedConversations.map(conv => {
        const existing = existingById.get(conv.id);
        return existing ? { ...conv, createdAt: existing.createdAt } : conv;
      });
      localStorage.setItem('conversations', JSON.stringify(merged));
      return merged;
    });
  }, []);

  const handleLogin = (researchKey: string) => {
    setIsLoggedIn(true);
    localStorage.setItem('researchLoggedIn', 'true');
    localStorage.setItem('researchKey', researchKey);
    // JWT is now stored by authAPI.login(); getUserId() reads it
    const userId = authService.getUserId();
    navigate(userId ? `/research/${userId}` : '/login');
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setTasks([]);
    localStorage.removeItem('researchLoggedIn');
    localStorage.removeItem('researchKey');
    localStorage.removeItem('research_tasks');
    authService.clearToken();
    navigate('/');
  };

  const handleBackToHome = () => navigate('/');

  // Compute current userId for nav links
  const currentUserId = isLoggedIn ? authService.getUserId() : null;

  return (
    <div className="app">
      <div className="simple-nav">
        <NavLink
          to="/"
          className={({ isActive }) => `nav-btn ${isActive ? 'active' : ''}`}
        >
          Home
        </NavLink>
        {isLoggedIn && currentUserId ? (
          <>
            <NavLink
              to={`/research/${currentUserId}`}
              className={({ isActive }) => `nav-btn ${isActive ? 'active' : ''}`}
            >
              Research
            </NavLink>
            <NavLink
              to={`/history/${currentUserId}`}
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
        <NavLink
          to="/admin"
          className={({ isActive }) => `nav-btn ${isActive ? 'active' : ''}`}
        >
          Admin
        </NavLink>
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
          <Route path="/" element={<HomePage />} />
          <Route
            path="/study/:userId"
            element={<StudyChatPage onSaveConversation={handleSaveConversation} />}
          />
          <Route
            path="/login"
            element={<LoginPage onLogin={handleLogin} onBackToHome={handleBackToHome} />}
          />
          <Route
            path="/research/:userId"
            element={
              <ResearchPanelPage
                tasks={tasks}
                onTasksChange={setTasks}
                isLoggedIn={isLoggedIn}
              />
            }
          />
          <Route
            path="/history/:userId"
            element={
              <HistoryPage
                conversations={conversations}
                onDeleteConversation={handleDeleteConversation}
                onConversationsLoaded={handleConversationsLoaded}
                isLoggedIn={isLoggedIn}
              />
            }
          />
          <Route path="/admin" element={<AdminPanel />} />
        </Routes>
      </div>
    </div>
  )
}

export default App
