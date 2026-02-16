import { useState, useEffect, useCallback } from 'react';
import {
  adminAPI,
  adminAuthService,
  type AdminUser,
  type AdminConversation,
  type AdminMessage
} from '../services/api';
import './AdminPanel.css';

// ── Login screen ─────────────────────────────────────────────────────────────

function AdminLogin({ onLogin }: { onLogin: () => void }) {
  const [key, setKey] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await adminAPI.login(key);
    setLoading(false);
    if (result.success) {
      onLogin();
    } else {
      setError(result.message || 'Invalid admin key');
    }
  };

  return (
    <div className="admin-login-wrap">
      <div className="admin-login-card">
        <h2 className="admin-login-title">Admin Panel</h2>
        <form onSubmit={handleSubmit} className="admin-login-form">
          <input
            type="password"
            placeholder="Admin key"
            value={key}
            onChange={e => setKey(e.target.value)}
            className="admin-login-input"
            autoFocus
          />
          {error && <p className="admin-login-error">{error}</p>}
          <button type="submit" className="admin-login-btn" disabled={loading || !key}>
            {loading ? 'Logging in…' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Users tab ────────────────────────────────────────────────────────────────

function UsersTab({ users }: { users: AdminUser[] }) {
  return (
    <div className="admin-tab-content">
      <p className="admin-count">{users.length} user{users.length !== 1 ? 's' : ''}</p>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Username</th>
              <th>Email</th>
              <th>Research Key</th>
              <th>Tasks</th>
              <th>Conversations</th>
              <th>Messages</th>
              <th>Active</th>
              <th>Last Login</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td className="admin-cell-bold">{u.username}</td>
                <td>{u.email}</td>
                <td>
                  {u.researchKey
                    ? <span className="admin-key-badge">{u.researchKey}</span>
                    : <span className="admin-muted">—</span>}
                </td>
                <td className="admin-cell-num">{u.taskCount}</td>
                <td className="admin-cell-num">{u.conversationCount}</td>
                <td className="admin-cell-num">{u.messageCount}</td>
                <td>
                  <span className={`admin-status-dot ${u.isActive ? 'active' : 'inactive'}`} />
                </td>
                <td className="admin-cell-date">
                  {u.lastLogin ? new Date(u.lastLogin).toLocaleString() : <span className="admin-muted">never</span>}
                </td>
                <td className="admin-cell-date">{new Date(u.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Messages tab ─────────────────────────────────────────────────────────────

function ConversationRow({
  conv,
  isExpanded,
  onToggle
}: {
  conv: AdminConversation;
  isExpanded: boolean;
  onToggle: (id: string) => void;
}) {
  const [messages, setMessages] = useState<AdminMessage[]>([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);

  const handleToggle = useCallback(async () => {
    onToggle(conv.id);
    if (!isExpanded && messages.length === 0) {
      setLoadingMsgs(true);
      const msgs = await adminAPI.getMessages(conv.id);
      setMessages(msgs);
      setLoadingMsgs(false);
    }
  }, [conv.id, isExpanded, messages.length, onToggle]);

  return (
    <>
      <tr
        className={`admin-conv-row ${isExpanded ? 'expanded' : ''}`}
        onClick={handleToggle}
        title="Click to expand messages"
      >
        <td>
          <span className={`admin-expand-arrow ${isExpanded ? 'open' : ''}`}>▶</span>
        </td>
        <td className="admin-cell-bold">{conv.title}</td>
        <td>{conv.username || <span className="admin-muted">—</span>}</td>
        <td>{conv.taskName || <span className="admin-muted">—</span>}</td>
        <td>{conv.aiModelName || <span className="admin-muted">—</span>}</td>
        <td className="admin-cell-num">{conv.messageCount}</td>
        <td className="admin-cell-date">{new Date(conv.lastMessageAt).toLocaleString()}</td>
        <td className="admin-cell-date">{new Date(conv.createdAt).toLocaleString()}</td>
      </tr>
      {isExpanded && (
        <tr className="admin-messages-row">
          <td colSpan={8}>
            {loadingMsgs ? (
              <div className="admin-messages-loading">Loading messages…</div>
            ) : messages.length === 0 ? (
              <div className="admin-messages-empty">No messages</div>
            ) : (
              <div className="admin-messages-list">
                {messages.map(msg => (
                  <div key={msg.id} className={`admin-message admin-message-${msg.sender}`}>
                    <span className="admin-message-sender">{msg.sender === 'user' ? 'User' : 'AI'}</span>
                    <span className="admin-message-time">{new Date(msg.timestamp).toLocaleTimeString()}</span>
                    <p className="admin-message-text">{msg.text}</p>
                  </div>
                ))}
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

function MessagesTab({ conversations }: { conversations: AdminConversation[] }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');

  const toggle = useCallback((id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const filtered = conversations.filter(c =>
    c.title.toLowerCase().includes(search.toLowerCase()) ||
    (c.username || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.taskName || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="admin-tab-content">
      <div className="admin-messages-header">
        <p className="admin-count">{conversations.length} conversation{conversations.length !== 1 ? 's' : ''}</p>
        <input
          type="text"
          placeholder="Search by title, user, or task…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="admin-search"
        />
      </div>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th style={{ width: 32 }} />
              <th>Title</th>
              <th>User</th>
              <th>Task</th>
              <th>AI Model</th>
              <th>Messages</th>
              <th>Last Message</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(conv => (
              <ConversationRow
                key={conv.id}
                conv={conv}
                isExpanded={expanded.has(conv.id)}
                onToggle={toggle}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Root component ────────────────────────────────────────────────────────────

export default function AdminPanel() {
  const [authed, setAuthed] = useState(adminAuthService.isAuthenticated());
  const [tab, setTab] = useState<'users' | 'messages'>('users');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [conversations, setConversations] = useState<AdminConversation[]>([]);
  const [loading, setLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [u, c] = await Promise.all([
      adminAPI.getUsers(),
      adminAPI.getConversations()
    ]);
    setUsers(u);
    setConversations(c);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (authed) loadData();
  }, [authed, loadData]);

  const handleLogout = () => {
    adminAuthService.clearToken();
    setAuthed(false);
  };

  if (!authed) return <AdminLogin onLogin={() => setAuthed(true)} />;

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <h1 className="admin-title">Admin Panel</h1>
        <div className="admin-header-right">
          <button className="admin-refresh-btn" onClick={loadData} disabled={loading}>
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
          <button className="admin-logout-btn" onClick={handleLogout}>Logout</button>
        </div>
      </div>

      <div className="admin-tabs">
        <button
          className={`admin-tab-btn ${tab === 'users' ? 'active' : ''}`}
          onClick={() => setTab('users')}
        >
          Users
          <span className="admin-tab-count">{users.length}</span>
        </button>
        <button
          className={`admin-tab-btn ${tab === 'messages' ? 'active' : ''}`}
          onClick={() => setTab('messages')}
        >
          Conversations &amp; Messages
          <span className="admin-tab-count">{conversations.length}</span>
        </button>
      </div>

      {loading ? (
        <div className="admin-loading">Loading data…</div>
      ) : tab === 'users' ? (
        <UsersTab users={users} />
      ) : (
        <MessagesTab conversations={conversations} />
      )}
    </div>
  );
}
