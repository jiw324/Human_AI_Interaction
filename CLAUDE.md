# CLAUDE.md — Human_AI_Interaction Project

This file gives Claude instant context about the codebase so it can assist without re-exploring from scratch.

---

## Project Overview

A full-stack research platform for human-AI interaction studies. Researchers configure AI tasks and interact with multiple AI models through a chat interface. Built with TypeScript throughout.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Vite 7, React Router 7 |
| Backend | Node.js, Express 4, TypeScript 5 |
| Database | MySQL 8+ |
| AI Integration | LiteLLM proxy (routes to OpenAI, Anthropic, Mistral, Google, Llama, etc.) |
| Auth | JWT (jsonwebtoken), bcryptjs |
| Security | Helmet, CORS, parameterized SQL queries |

---

## Project Structure

```
Human_AI_Interaction/
├── CLAUDE.md                        ← this file
├── README.md
├── .gitignore
├── .github/workflows/
│   └── build-frontend.yml           (CI/CD)
├── backend/
│   ├── src/
│   │   ├── server.ts                (Express setup, middleware, route mounting)
│   │   ├── config/
│   │   │   └── database.ts          (MySQL pool; helpers: query, queryOne, transaction)
│   │   ├── controllers/             (Request handlers)
│   │   │   ├── auth.controller.ts
│   │   │   ├── chat.controller.ts
│   │   │   ├── conversation.controller.ts
│   │   │   ├── litellm.controller.ts
│   │   │   ├── settings.controller.ts
│   │   │   └── task.controller.ts
│   │   ├── middleware/
│   │   │   ├── auth.middleware.ts   (JWT verification)
│   │   │   └── error.middleware.ts  (Global error handler; uses AppError class)
│   │   ├── routes/                  (Route definitions, one file per domain)
│   │   ├── services/
│   │   │   ├── config.service.ts    (System config from DB)
│   │   │   └── litellm.service.ts   (LiteLLM API client)
│   │   └── types/                   (Shared TypeScript interfaces)
│   ├── database/
│   │   ├── schema.sql               (Full DB schema — run this to initialize)
│   │   ├── README.md
│   │   └── QUICK_START.md
│   ├── .env                         (NOT committed; see env vars below)
│   ├── package.json
│   └── tsconfig.json
└── frontend/
    ├── src/
    │   ├── App.tsx                  (Root: routing, auth state, tasks/conversations state)
    │   ├── main.tsx                 (Entry point)
    │   ├── components/
    │   │   ├── ChatBox.tsx          (Main chat UI: task selection, message history)
    │   │   ├── ResearchPanel.tsx    (Task editor + system settings; login-protected)
    │   │   ├── ConversationHistory.tsx (Browse/search/delete past conversations)
    │   │   └── LoginPage.tsx        (Research panel auth)
    │   ├── services/
    │   │   ├── api.ts               (Central API client; manages authToken via authService)
    │   │   └── litellm.service.ts   (LiteLLM API client for frontend)
    │   ├── hooks/
    │   │   └── useBackendHealth.ts  (Debounced 60s health check)
    │   └── utils/
    │       └── deviceId.ts          (Device fingerprint: localStorage → IndexedDB → hash)
    ├── vite.config.ts               (Dev server port: 3000)
    ├── package.json
    └── tsconfig.json
```

---

## How to Run

### Prerequisites
- Node.js v16+ (v20 recommended)
- MySQL 8.0+

### First-time setup
```bash
# 1. Install dependencies
cd backend && npm install
cd ../frontend && npm install

# 2. Initialize database
mysql -u root -p < backend/database/schema.sql

# 3. Configure backend env (create backend/.env)
# See "Environment Variables" section below
```

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

---

## Environment Variables

### `backend/.env`
```
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
```
VITE_API_URL=http://localhost:5000/api
VITE_BASE=/
```

---

## API Routes

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
```

---

## Database Schema (MySQL)

**Tables:**
- `users` — accounts; `research_key` is the login credential
- `tasks` — AI task configs (personality, prompts, settings)
- `ai_models` — model catalog (16 pre-loaded entries)
- `system_config` — key-value store for system settings

**Views:** `view_user_tasks`, `view_user_activity`

**Stored Procedures:** `sp_get_user_tasks`, `sp_get_models_by_provider`, `sp_get_user_config`

All tables use UUID primary keys (string type) and `created_at`/`updated_at` timestamps.

---

## Key Patterns & Conventions

### Backend
- **MVC**: controllers → services → database helpers (`query`, `queryOne`, `transaction`)
- **Error handling**: throw `AppError` for operational errors; caught by `error.middleware.ts`
- **Auth**: JWT Bearer token verified by `auth.middleware.ts`; applied per-route
- **Logging**: emoji-prefixed `console.log` (✅ success, ❌ error, 📡 network, etc.)
- **SQL**: always parameterized — never interpolate user input into queries

### Frontend
- **State**: React hooks only (`useState`, `useEffect`, `useRef`, `useCallback`); no external state lib
- **API calls**: always go through `api.ts` (`authService`) which injects JWT automatically
- **CSS**: each component has its own `.css` file (e.g., `ChatBox.css`)
- **Local storage keys**: `research_tasks`, `authToken`, `device_unique_id`
- **Device fingerprint**: generated once, stored in localStorage/IndexedDB

### Naming
- Files/components: PascalCase (`ResearchPanel.tsx`)
- Variables/functions: camelCase
- Database columns: snake_case
- Controllers export plain async functions (not classes)

---

## Default Dev Credentials

| Credential | Value |
|-----------|-------|
| Research Key | `research-key-123` |
| Admin Email | `admin@example.com` |
| Admin Password | `admin123` |
| Default DB | `human_ai_interaction` |

> **Do not use these in production.**

---

## CI/CD

- `.github/workflows/build-frontend.yml` — builds the frontend on push
- Frontend can be deployed to a subdirectory; configure `VITE_BASE` and `.htaccess` for SPA routing

---

## Potential Gotchas

1. **LiteLLM must be running** separately as a proxy before AI chat works
2. **CORS**: `ALLOWED_ORIGINS` in backend `.env` must include the frontend URL
3. **MySQL charset**: schema uses `utf8mb4` — ensure MySQL server supports it
4. **Frontend API URL**: defaults to `http://localhost:5000/api`; override with `VITE_API_URL` for other environments
5. **JWT secret**: must match between server restarts; store securely
