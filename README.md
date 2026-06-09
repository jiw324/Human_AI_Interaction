# Human-AI Interaction Platform

A full-stack research platform for human-AI interaction studies. Researchers configure AI "tasks" (personas with custom prompts and model settings), participants chat with the assigned AI through a web interface, and researchers can browse, search, and export the resulting conversations. An admin dashboard provides oversight across all researchers and conversations.

## 📋 Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Running the Application](#running-the-application)
- [Configuration](#configuration)
- [API Routes](#api-routes)
- [Troubleshooting](#troubleshooting)

## ✨ Features

### Participant Chat
- Each study link (`/study/:userId`) randomly assigns the participant one of the researcher's configured tasks/personas
- Real-time chat backed by an LLM via the LiteLLM proxy (OpenAI, Anthropic, Mistral, Google, Llama, etc.)
- Conversation persisted to localStorage and synced to the backend (debounced) so it appears in the researcher's history
- Anonymous participants are tracked via a device fingerprint (no login required)

### Research Panel (login-protected)
- Create, edit, and delete tasks — each task has its own system prompt, task/greeting prompt, default model, and chatbot name
- System configuration view for LiteLLM endpoint, API keys, and default model
- Draft-based editing so in-progress edits don't get clobbered by background refreshes

### Conversation History
- Browse, search, and filter past conversations
- Drill into a full message thread
- Export single conversations, selected conversations, or everything to CSV

### Admin Dashboard (separate admin login)
- View and manage researcher accounts
- Browse conversations and messages across all researchers

### Security
- JWT-based authentication, with separate token/role paths for researchers (`research_key`) and admins (`ADMIN_KEY`)
- Helmet, CORS allow-listing, parameterized SQL queries (no string-interpolated SQL)
- Backend connectivity health monitoring (debounced polling, resets on user activity)

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Vite 7, React Router 7 |
| Backend | Node.js, Express 4, TypeScript 5 |
| Database | MySQL 8+ |
| AI Integration | LiteLLM proxy |
| Auth | JWT (jsonwebtoken), bcryptjs |
| Security | Helmet, CORS, parameterized SQL queries |

## 📁 Project Structure

```
Human_AI_Interaction/
├── backend/
│   ├── src/
│   │   ├── server.ts            # Express setup, middleware, route mounting
│   │   ├── config/database.ts   # MySQL pool + query/queryOne/transaction helpers
│   │   ├── controllers/         # Request handlers (auth, chat, conversation, task, settings, litellm, admin)
│   │   ├── middleware/          # JWT auth (authenticate/requireAdmin) + global error handler
│   │   ├── routes/              # One route file per domain, mounted under /api
│   │   ├── services/            # config.service.ts (system_config table), litellm.service.ts (LLM client)
│   │   └── types/               # Shared TypeScript interfaces
│   ├── database/schema.sql      # Full DB schema — run this to initialize MySQL
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── App.tsx              # Routing, auth state, tasks/conversations state
│   │   ├── main.tsx             # Entry point (HashRouter + StrictMode)
│   │   ├── components/
│   │   │   ├── ChatBox.tsx              # Participant chat UI
│   │   │   ├── ResearchPanel.tsx        # Task editor + system settings
│   │   │   ├── ConversationHistory.tsx  # Browse/search/export conversations
│   │   │   ├── LoginPage.tsx / AdminLoginPage.tsx
│   │   │   ├── HomePage.tsx
│   │   │   └── AdminDashboard.tsx
│   │   ├── services/api.ts      # Central API client (injects JWT automatically)
│   │   ├── hooks/useBackendHealth.ts
│   │   └── utils/deviceId.ts    # Device fingerprinting for anonymous participants
│   └── package.json
│
├── CLAUDE.md             # Detailed architecture/deployment notes (for AI assistants & contributors)
└── README.md             # This file
```

## 🔧 Prerequisites

- **Node.js** v16+ (v20 recommended)
- **MySQL** 8.0+
- A running **LiteLLM** proxy instance (required for AI chat to work)

## 📦 Installation

```bash
# 1. Install dependencies
cd backend && npm install
cd ../frontend && npm install

# 2. Initialize the database
mysql -u root -p < backend/database/schema.sql
```

## 🚀 Running the Application

### Development

```bash
# Terminal 1 — backend (http://localhost:5000)
cd backend && npm run dev

# Terminal 2 — frontend (http://localhost:3000)
cd frontend && npm run dev
```

### Production Build

```bash
cd backend && npm run build && npm start
cd frontend && npm run build
```

## ⚙️ Configuration

### `backend/.env`

```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=human_ai_interaction
DB_USER=root
DB_PASSWORD=your_password
JWT_SECRET=your-secret-key
PORT=5000
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:3000
```

### `frontend/.env` (optional)

```env
VITE_API_URL=http://localhost:5000/api
VITE_BASE=/
```

> `ALLOWED_ORIGINS` must include the frontend's URL or CORS will block requests. `VITE_API_URL` defaults to `http://localhost:5000/api` if not set.

### Default Dev Credentials

| Credential | Value |
|-----------|-------|
| Research Key | `research-key-123` |
| Admin Email | `admin@example.com` |
| Admin Password | `admin123` |

> **Do not use these in production.**

## 📚 API Routes

```
GET    /api/health
POST   /api/auth/login              (research key → JWT)
GET    /api/auth/verify

POST   /api/chat/message
POST   /api/chat/stream

GET    /api/conversations
POST   /api/conversations
DELETE /api/conversations/:id

GET    /api/tasks
POST   /api/tasks
PUT    /api/tasks/:id
DELETE /api/tasks/:id

GET    /api/settings
POST   /api/settings

GET    /api/litellm/models
POST   /api/litellm/config
POST   /api/litellm/test-connection

# Admin (separate ADMIN_KEY-based auth)
/api/admin/*
```

For full architectural details, database schema notes, and the production deployment snapshot, see [CLAUDE.md](./CLAUDE.md).

## 🐛 Troubleshooting

**Backend not starting:**
- Check port 5000 is free and `backend/.env` exists with valid DB credentials
- Run `mysql -u root -p < backend/database/schema.sql` if the database hasn't been initialized
- Verify MySQL is running and supports `utf8mb4`

**AI chat not responding:**
- Confirm a LiteLLM proxy is running and reachable, and that its URL/keys are set in System Configuration (or `LITELLM_API_BASE` / `LITELLM_API_KEY` in production)

**CORS errors in the browser:**
- Make sure `ALLOWED_ORIGINS` in `backend/.env` includes the exact frontend origin (including port)

**Authentication issues:**
- `JWT_SECRET` must stay the same across server restarts, or existing tokens become invalid
- Clear `authToken` from browser localStorage and log in again

## 📝 License

[Your License Here]
