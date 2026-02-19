import { useState, useEffect, useCallback } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import {
  adminAPI,
  adminAuthService,
  type AdminUser,
  type AdminConversation,
  type AdminMessage
} from '../services/api';
import './AdminPanel.css';

// ── Delete confirmation modal ─────────────────────────────────────────────

function ConfirmModal({
  username,
  onConfirm,
  onCancel
}: {
  username: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="admin-modal-overlay">
      <div className="admin-modal">
        <h3>Remove Researcher</h3>
        <p>
          Are you sure you want to permanently delete <strong>{username}</strong>?
          This will also delete all their tasks and conversations.
        </p>
        <div className="admin-modal-actions">
          <button className="admin-modal-cancel" onClick={onCancel}>Cancel</button>
          <button className="admin-modal-confirm" onClick={onConfirm}>Delete</button>
        </div>
      </div>
    </div>
  );
}

// ── Create researcher form ────────────────────────────────────────────────

function CreateResearcherForm({ onCreated }: { onCreated: (user: AdminUser) => void }) {
  const [visible, setVisible] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [researchKey, setResearchKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await adminAPI.createUser(username, email, researchKey);
    setLoading(false);
    if (result.success && result.data) {
      onCreated(result.data as AdminUser);
      setUsername('');
      setEmail('');
      setResearchKey('');
      setVisible(false);
    } else {
      setError(result.message || 'Failed to create researcher');
    }
  };

  return (
    <>
      <button className="admin-create-toggle-btn" onClick={() => setVisible(v => !v)}>
        {visible ? 'Cancel' : '+ New Researcher'}
      </button>
      {visible && (
        <form className="admin-create-form" onSubmit={handleSubmit}>
          <div className="admin-create-field">
            <label>Username *</label>
            <input
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="e.g. dr_smith"
              required
            />
          </div>
          <div className="admin-create-field">
            <label>Email *</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="researcher@uni.edu"
              required
            />
          </div>
          <div className="admin-create-field">
            <label>Research Key *</label>
            <input
              value={researchKey}
              onChange={e => setResearchKey(e.target.value)}
              placeholder="unique-key-123"
              required
            />
          </div>
          {error && <p className="admin-create-error">{error}</p>}
          <button
            type="submit"
            className="admin-create-submit-btn"
            disabled={loading || !username || !email || !researchKey}
          >
            {loading ? 'Creating…' : 'Create'}
          </button>
        </form>
      )}
    </>
  );
}

// ── Researchers tab ───────────────────────────────────────────────────────

function ResearchersTab({
  users,
  onUsersChange
}: {
  users: AdminUser[];
  onUsersChange: (users: AdminUser[]) => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState<AdminUser | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState('');

  const handleDelete = async (user: AdminUser) => {
    setActionError('');
    const result = await adminAPI.deleteUser(user.id);
    if (result.success) {
      onUsersChange(users.filter(u => u.id !== user.id));
    } else {
      setActionError(result.message || 'Failed to delete researcher');
    }
    setConfirmDelete(null);
  };

  const handleToggle = async (user: AdminUser) => {
    setActionError('');
    setTogglingId(user.id);
    const result = await adminAPI.toggleUserStatus(user.id, !user.isActive);
    if (result.success) {
      onUsersChange(users.map(u => u.id === user.id ? { ...u, isActive: !u.isActive } : u));
    } else {
      setActionError(result.message || 'Failed to update status');
    }
    setTogglingId(null);
  };

  return (
    <div className="admin-tab-content">
      {actionError && <p className="admin-create-error" style={{ marginBottom: 8 }}>{actionError}</p>}
      <div className="admin-create-bar">
        <p className="admin-count" style={{ margin: 0 }}>
          {users.length} researcher{users.length !== 1 ? 's' : ''}
        </p>
        <CreateResearcherForm
          onCreated={user => onUsersChange([...users, user])}
        />
      </div>

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
              <th>Status</th>
              <th>Created</th>
              <th>Actions</th>
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
                <td className="admin-cell-date">{new Date(u.createdAt).toLocaleString()}</td>
                <td>
                  <div className="admin-cell-actions">
                    <button
                      className={`admin-action-btn ${u.isActive ? 'admin-btn-toggle-active' : 'admin-btn-toggle-inactive'}`}
                      onClick={() => handleToggle(u)}
                      disabled={togglingId === u.id}
                    >
                      {u.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      className="admin-action-btn admin-btn-danger"
                      onClick={() => setConfirmDelete(u)}
                    >
                      Remove
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {confirmDelete && (
        <ConfirmModal
          username={confirmDelete.username}
          onConfirm={() => handleDelete(confirmDelete)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}

// ── Conversations tab (unchanged from original AdminPanel) ────────────────

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

function ConversationsTab({ conversations }: { conversations: AdminConversation[] }) {
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
    (c.username || '').toLowerCase().includes(search.toLowerCase())
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

// ── Root dashboard component ──────────────────────────────────────────────

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<'researchers' | 'conversations'>('researchers');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [conversations, setConversations] = useState<AdminConversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');

  // Hooks must all be declared before any conditional returns
  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    const [u, c] = await Promise.all([
      adminAPI.getUsers(),
      adminAPI.getConversations()
    ]);
    if (u.length === 0) {
      // May indicate auth failure or server issue — show a hint
      setLoadError('No researchers loaded. If this is unexpected, try logging out and back in.');
    }
    setUsers(u);
    setConversations(c);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Guard: redirect to /admin login if not authenticated
  if (!adminAuthService.isAuthenticated()) {
    return <Navigate to="/admin" replace />;
  }

  const handleLogout = () => {
    adminAuthService.clearToken();
    navigate('/admin', { replace: true });
  };

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <h1 className="admin-title">Admin Dashboard</h1>
        <div className="admin-header-right">
          <button className="admin-refresh-btn" onClick={loadData} disabled={loading}>
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
          <button className="admin-logout-btn" onClick={handleLogout}>Logout</button>
        </div>
      </div>

      <div className="admin-tabs">
        <button
          className={`admin-tab-btn ${tab === 'researchers' ? 'active' : ''}`}
          onClick={() => setTab('researchers')}
        >
          Researchers
          <span className="admin-tab-count">{users.length}</span>
        </button>
        <button
          className={`admin-tab-btn ${tab === 'conversations' ? 'active' : ''}`}
          onClick={() => setTab('conversations')}
        >
          Conversations &amp; Messages
          <span className="admin-tab-count">{conversations.length}</span>
        </button>
      </div>

      {loadError && <p className="admin-create-error" style={{ margin: '8px 0' }}>{loadError}</p>}
      {loading ? (
        <div className="admin-loading">Loading data…</div>
      ) : tab === 'researchers' ? (
        <ResearchersTab users={users} onUsersChange={setUsers} />
      ) : (
        <ConversationsTab conversations={conversations} />
      )}
    </div>
  );
}
