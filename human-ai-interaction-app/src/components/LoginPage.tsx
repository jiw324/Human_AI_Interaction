import React, { useState } from 'react';
import './LoginPage.css';

interface LoginPageProps {
  onLogin: (researchKey: string) => void;
  onBackToHome: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin, onBackToHome }) => {
  const [researchKey, setResearchKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Simulate authentication delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Simple validation - in a real app, this would check against a server
    if (researchKey === 'admin123' || researchKey === 'research2024') {
      onLogin(researchKey);
    } else {
      setError('Invalid research key. Please try again.');
    }
    
    setIsLoading(false);
  };

  return (
    <div className="login-page">
      <div className="login-content">
        <div className="login-card">
          <h1 className="login-title">Research Panel Login</h1>
          <p className="login-subtitle">Enter your research key to access the admin panel.</p>

          <form onSubmit={handleSubmit} className="login-form">
            <div className="input-group">
              <label className="input-label">Research Key *</label>
              <input
                type="password"
                value={researchKey}
                onChange={(e) => setResearchKey(e.target.value)}
                placeholder="Enter your research key"
                className="research-key-input"
                required
                autoComplete="off"
              />
            </div>

            {error && (
              <div className="error-message">
                {error}
              </div>
            )}

            <button 
              type="submit" 
              className={`login-button ${isLoading ? 'loading' : ''}`}
              disabled={isLoading || !researchKey.trim()}
            >
              {isLoading ? 'Authenticating...' : 'Login to Research Panel'}
            </button>
          </form>

          <div className="help-section">
            <p className="help-question">Don't have a research key?</p>
            <p className="help-text">Contact the research administrator to obtain access credentials.</p>
          </div>

          <button className="back-link" onClick={onBackToHome}>
            ← Back to Chat
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
