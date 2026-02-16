import { useState, useEffect, useCallback } from 'react'
import { Routes, Route, NavLink, useNavigate, Navigate, useParams } from 'react-router-dom'
import ChatBox from './components/ChatBox'
import HomePage from './components/HomePage'
import ResearchPanel from './components/ResearchPanel'
import ConversationHistory from './components/ConversationHistory'
import LoginPage from './components/LoginPage'
import AdminLoginPage from './components/AdminLoginPage'
import AdminDashboard from './components/AdminDashboard'
import { authService, tasksAPI, conversationsAPI, type Task, type Conversation, type Message } from './services/api'
import { getDeviceId } from './utils/deviceId'
import { useBackendHealth } from './hooks/useBackendHealth'
import './App.css'

/**
 * Participant-facing chatbox scoped to a specific research group.
 * URL: /study/:userId  (the researcher's UUID — not their secret research key)
 * Conversations are saved to the backend under the researcher's UUID so they
 * appear in the researcher's history when they reload from the database.
 */
function StudyChatPage() {
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

  // Save conversation under the researcher's UUID so it appears in their history.
  const handleSaveConversation = useCallback(async (conversation: Conversation) => {
    if (!userId) return;
    try {
      await conversationsAPI.save(userId, conversation);
    } catch (error) {
      console.error('❌ Error saving conversation:', error);
    }
  }, [userId]);

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading study...</div>;
  if (notFound) return <div style={{ padding: '40px', textAlign: 'center' }}>Research group not found.</div>;

  return (
    <div className="chat-section">
      <ChatBox tasks={studyTasks} onSaveConversation={handleSaveConversation} studyId={userId ?? ''} />
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

  if (!isLoggedIn) return <Navigate to="/research" replace />;
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

  if (!isLoggedIn) return <Navigate to="/research" replace />;
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
        const userId = authService.getUserId();
        const cacheKey = userId ? `research_tasks_${userId}` : null;
        console.log('📡 Loading tasks for logged-in researcher...');

        if (cacheKey) {
          const cachedTasks = localStorage.getItem(cacheKey);
          if (cachedTasks) {
            try {
              setTasks(JSON.parse(cachedTasks));
            } catch (_) {}
          }
        }

        const fetchedTasks = await tasksAPI.getAll();
        setTasks(fetchedTasks);
        if (cacheKey) {
          localStorage.setItem(cacheKey, JSON.stringify(fetchedTasks));
        }
        console.log('✨ Tasks loaded from backend');
      }
    };
    loadTasks();
  }, [backendStatus, isLoggedIn]);

  // Save tasks to localStorage whenever they change
  useEffect(() => {
    const userId = authService.getUserId();
    if (tasks.length > 0 && userId) {
      localStorage.setItem(`research_tasks_${userId}`, JSON.stringify(tasks));
    }
  }, [tasks]);

  // Load conversations from localStorage on mount (researcher-scoped only)
  useEffect(() => {
    const userId = authService.getUserId();
    if (!userId) return;
    const savedConversations = localStorage.getItem(`conversations_${userId}`);
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

  const navigate = useNavigate();

  const handleDeleteConversation = async (conversationId: string) => {
    try {
      const userId = authService.getUserId() || await getDeviceId();
      const success = await conversationsAPI.delete(userId, conversationId);
      if (success) {
        const researcherId = authService.getUserId();
        setConversations(prev => {
          const updated = prev.filter(conv => conv.id !== conversationId);
          if (researcherId) {
            localStorage.setItem(`conversations_${researcherId}`, JSON.stringify(updated));
          }
          return updated;
        });
      }
    } catch (error) {
      console.error('❌ Error deleting conversation:', error);
    }
  };

  const handleConversationsLoaded = useCallback((loadedConversations: Conversation[]) => {
    const researcherId = authService.getUserId();
    setConversations(prev => {
      const existingById = new Map(prev.map(conv => [conv.id, conv]));
      const merged = loadedConversations.map(conv => {
        const existing = existingById.get(conv.id);
        return existing ? { ...conv, createdAt: existing.createdAt } : conv;
      });
      if (researcherId) {
        localStorage.setItem(`conversations_${researcherId}`, JSON.stringify(merged));
      }
      return merged;
    });
  }, []);

  const handleLogin = (_researchKey: string) => {
    setIsLoggedIn(true);
    localStorage.setItem('researchLoggedIn', 'true');
    // JWT is now stored by authAPI.login(); getUserId() reads it
    const userId = authService.getUserId();
    navigate(userId ? `/research/${userId}` : '/research');
  };

  const handleLogout = () => {
    const userId = authService.getUserId();
    setIsLoggedIn(false);
    setTasks([]);
    setConversations([]);
    localStorage.removeItem('researchLoggedIn');
    if (userId) {
      localStorage.removeItem(`research_tasks_${userId}`);
      localStorage.removeItem(`conversations_${userId}`);
    }
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
            to="/research"
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
          <Route path="/" element={<HomePage />} />
          <Route
            path="/study/:userId"
            element={<StudyChatPage />}
          />
          <Route
            path="/research"
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
          <Route path="/admin" element={<AdminLoginPage />} />
          <Route path="/admin/:adminId" element={<AdminDashboard />} />
        </Routes>
      </div>
    </div>
  )
}

export default App
