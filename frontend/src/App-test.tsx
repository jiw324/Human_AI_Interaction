import { useState } from 'react'
import './App.css'

function App() {
  const [currentView, setCurrentView] = useState<'chat' | 'research' | 'history'>('chat');

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
            <h1>Chat Page</h1>
            <p>This is the chat page. The ChatBox component will be loaded here.</p>
          </div>
        ) : currentView === 'research' ? (
          <div className="research-section">
            <h1>Research Page</h1>
            <p>This is the research page. The ResearchPanel component will be loaded here.</p>
          </div>
        ) : (
          <div className="history-section">
            <h1>History Page</h1>
            <p>This is the history page. The ConversationHistory component will be loaded here.</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
