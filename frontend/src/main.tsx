import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'

// Use HashRouter so routes work correctly under /static on the server
// without needing special rewrite rules. The server only sees /static,
// while the client handles paths like #/login, #/research, etc.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
)
