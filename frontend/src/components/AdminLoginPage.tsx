/**
 * Admin login screen — separate credential path from researcher accounts
 * (an `ADMIN_KEY` rather than a per-user research key). On success it
 * stores the admin JWT via `adminAuthService` and routes to
 * /admin/:adminId (AdminDashboard).
 */
import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { adminAPI, adminAuthService } from '../services/api';
import './AdminPanel.css';

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const [key, setKey] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Already logged in → go straight to dashboard (declarative redirect, no navigate() during render)
  if (adminAuthService.isAuthenticated()) {
    return <Navigate to={`/admin/${adminAuthService.getAdminId()}`} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await adminAPI.login(key);
    setLoading(false);
    if (result.success) {
      navigate(`/admin/${adminAuthService.getAdminId()}`, { replace: true });
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
