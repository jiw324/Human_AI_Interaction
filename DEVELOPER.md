# Developer Guide — Human-AI Interaction Platform

This document is written for the next developer picking up this project. It explains how the system works end-to-end, where to find things, known issues, and how to extend the platform.

---

## Table of Contents

1. [How the System Works](#1-how-the-system-works)
2. [Key Concepts](#2-key-concepts)
3. [Data Flow Diagrams](#3-data-flow-diagrams)
4. [Project Map](#4-project-map)
5. [Setting Up From Scratch](#5-setting-up-from-scratch)
6. [Known Bugs & Technical Debt](#6-known-bugs--technical-debt)
7. [How to Add Common Things](#7-how-to-add-common-things)
8. [Next Feature Ideas & How to Build Them](#8-next-feature-ideas--how-to-build-them)

---

## 1. How the System Works

The platform has two types of users:

**Researchers** create study configurations called "tasks." Each task defines:
- A **system prompt** — instructions sent to the AI (invisible to participants)
- A **task prompt** — shown as the opening greeting in the chat
- A **model** — which LLM the AI uses (via LiteLLM)
- A **chatbot name** — what the participant sees as the AI's display name

**Participants** visit a study URL like `https://<host>/#/study/<researcherUserId>`. The app randomly selects one of that researcher's tasks and assigns it for the session. No login is required — participants are tracked by a device fingerprint. Their conversation is saved to the backend under the researcher's user ID so it shows up in the researcher's history.

An **Admin** can log into the admin dashboard to manage researcher accounts and browse all conversations.

### Request lifecycle for a participant chat message

```
Participant types → ChatBox.tsx
  → chatAPI.sendMessage() in api.ts
    → POST /api/chat/message (backend)
      → generateAIResponse() in chat.controller.ts
        → liteLLMService.sendChatCompletion() in litellm.service.ts
          → POST https://<litellm-host>/v1/chat/completions
        ← AI text response
      ← { success: true, response: { id, text, sender, timestamp } }
    ← Message object saved to state + localStorage
  ← Debounced sync to POST /api/conversations/:userId (1s delay)
```

---

## 2. Key Concepts

### Tasks vs Conversations

| Concept | Owned by | Lives in | Purpose |
|---------|----------|----------|---------|
| Task | Researcher | `tasks` DB table | Defines an AI persona for a study condition |
| Conversation | Participant (stored under researcher) | `conversations` + `messages` DB tables | A single chat session |

### Two auth systems

The platform has two completely separate authentication paths:

| Auth type | Credential | Issued by | Stored in | Duration |
|-----------|-----------|-----------|----------|---------|
| Researcher | `research_key` in `users` table | `POST /api/auth/login` | `localStorage` (`authToken`) | 24h JWT |
| Admin | `ADMIN_KEY` env/configs table | `POST /api/admin/login` | `sessionStorage` (`adminToken`) | 8h JWT |

Admin JWTs carry `role: 'admin'` in the payload; researcher JWTs carry `id`, `username`, `email`. The `requireAdmin` middleware checks the role claim; `authenticate` checks that any valid JWT is present.

### Settings vs Tasks

There are two places "settings" appear and they are different things:

- **Task settings** (`tasks` DB table) — per-task AI config (systemPrompt, taskPrompt, model, chatbotName). This is the main config researchers use.
- **Per-user per-model settings** (`settings.controller.ts`) — an old, in-memory override layer that is currently not wired to any UI. Likely unused. See [Known Bugs](#6-known-bugs--technical-debt).

### LiteLLM

All AI calls go through a LiteLLM proxy. LiteLLM exposes an OpenAI-compatible API (`/v1/chat/completions`) and routes to whichever underlying model the task specifies. You don't call OpenAI/Anthropic directly — LiteLLM handles that. The backend's `litellm.service.ts` is the only place that talks to it.

### Device fingerprinting

Participants don't log in. `utils/deviceId.ts` generates a hash from browser/device characteristics (canvas fingerprint, screen size, timezone, user-agent, WebGL renderer). This ID is stored in localStorage and IndexedDB as a fallback. It's used as the participant's identity for conversation tracking. It's not perfect (resets if both stores are cleared, varies across browsers on the same device) — this is an acknowledged limitation.

---

## 3. Data Flow Diagrams

### Participant visits a study URL

```
URL: /#/study/:userId
  → StudyChatPage in App.tsx
    → tasksAPI.getByUserId(userId) → GET /api/tasks/by-user/:userId (no auth)
      → task.controller.getTasksByUserId
        → SELECT tasks WHERE user_id = ? AND user is_active = TRUE
    → Random task assigned for session
    → ChatBox rendered with that task's settings
```

### Researcher logs in and sees their tasks

```
URL: /#/research
  → LoginPage → authAPI.login(researchKey) → POST /api/auth/login
    → auth.controller.login → SELECT users WHERE research_key = ?
    → returns JWT with { id, username, email }
  → JWT stored in localStorage
  → Redirected to /#/research/:userId
  → ResearchPanelPage → tasksAPI.getAll() → GET /api/tasks (JWT required)
    → task.controller.getAllTasks → SELECT tasks WHERE user_id = ?
  → ResearchPanel renders task editor
```

### Conversation is saved

```
ChatBox messages change →
  useEffect (debounced 1s) →
    onSaveConversation(conversation) →  [prop from StudyChatPage]
      conversationsAPI.save(userId, conversation) →
        POST /api/conversations/:userId (NO auth — intentional, participants have no JWT)
          → conversation.controller.saveConversation
            → SELECT conversations WHERE id = ?
            → if exists: UPDATE title + last_message_at
            → if new: INSERT conversation row
            → REPLACE INTO messages for each message (idempotent)
```

---

## 4. Project Map

### Backend files worth knowing

| File | What it does |
|------|-------------|
| `server.ts` | Express setup, all route mounts, CORS config |
| `config/database.ts` | MySQL pool + `query`/`queryOne`/`transaction` helpers |
| `middleware/auth.middleware.ts` | `authenticate` and `requireAdmin` JWT guards |
| `middleware/error.middleware.ts` | `AppError` class + global error handler |
| `controllers/task.controller.ts` | CRUD for tasks; also public `getResearchGroups` / `getTasksByUserId` |
| `controllers/conversation.controller.ts` | Save/load/delete conversations; EST datetime normalization |
| `controllers/chat.controller.ts` | Builds LiteLLM message list, calls AI, returns response |
| `controllers/auth.controller.ts` | Researcher login → JWT |
| `controllers/admin.controller.ts` | Admin login + cross-researcher data views |
| `controllers/settings.controller.ts` | In-memory per-model settings (currently unconnected to UI) |
| `services/litellm.service.ts` | All LiteLLM API calls (model list, chat completions) |
| `services/config.service.ts` | Read/write `configs` key-value table (LiteLLM URL, ADMIN_KEY, etc.) |
| `database/schema.sql` | Full schema — run this to initialize a fresh database |

### Frontend files worth knowing

| File | What it does |
|------|-------------|
| `App.tsx` | Root component: routing, auth state, tasks/conversations state |
| `main.tsx` | Entry point: mounts App inside HashRouter + StrictMode |
| `components/ChatBox.tsx` | Participant chat UI (random task assignment, localStorage, backend sync) |
| `components/ResearchPanel.tsx` | Task CRUD editor + system config (LiteLLM endpoint/keys) |
| `components/ConversationHistory.tsx` | Browse, filter, drill-into, and export conversations |
| `components/AdminDashboard.tsx` | Admin view of researchers and all conversations |
| `components/HomePage.tsx` | Public landing page listing research groups |
| `services/api.ts` | All API calls, auth token management, types |
| `hooks/useBackendHealth.ts` | Debounced health polling, exposes `{ isOnline, lastChecked, error }` |
| `utils/deviceId.ts` | Device fingerprint generation and 3-tier storage |

### Routing overview (HashRouter)

```
/                       → HomePage (public)
/study/:userId          → ChatBox for that researcher's study (public)
/research               → LoginPage
/research/:userId       → ResearchPanel (JWT required, must match your own userId)
/history/:userId        → ConversationHistory (JWT required)
/admin                  → AdminLoginPage
/admin/:adminId         → AdminDashboard (admin JWT required)
```

---

## 5. Setting Up From Scratch

```bash
# 1. Clone and install
cd backend && npm install
cd ../frontend && npm install

# 2. Create backend/.env  (copy this and fill in values)
cat > backend/.env << 'EOF'
DB_HOST=localhost
DB_PORT=3306
DB_NAME=human_ai_interaction
DB_USER=root
DB_PASSWORD=your_password
JWT_SECRET=generate-a-long-random-string-here
PORT=5000
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:3000
LITELLM_API_BASE=https://your-litellm-host
LITELLM_API_KEY=your-litellm-key
ADMIN_KEY=choose-a-strong-admin-key
EOF

# 3. Initialize the database
mysql -u root -p < backend/database/schema.sql
# Note: schema.sql inserts ADMIN_KEY='admin123' into configs.
# If you set ADMIN_KEY in .env, that takes priority over the DB value.
# If you forget to set it, the default 'admin123' is used — change it.

# 4. Create a researcher account (via admin dashboard or direct SQL)
#    The schema inserts one default user: research_key = 'research-key-123'
#    Use the admin dashboard to create real accounts.

# 5. Run development servers
cd backend && npm run dev   # http://localhost:5000
cd frontend && npm run dev  # http://localhost:3000
```

### Creating a researcher account

Option A — via the admin dashboard:
1. Visit `http://localhost:3000/#/admin`
2. Log in with your `ADMIN_KEY`
3. Use the "Researchers" tab → "Add Researcher"

Option B — direct SQL:
```sql
INSERT INTO users (username, email, research_key) 
VALUES ('your-name', 'your@email.com', 'your-secret-key');
```

### Giving participants a study link

After a researcher is set up and has created at least one task, their study link is:
```
https://<host>/#/study/<researcher-user-uuid>
```
The researcher's UUID is shown in the URL bar when they log into the research panel.

---

## 6. Known Bugs & Technical Debt

### Bug 1 — `onKeyPress` is removed in React 19 (medium priority)

**File:** [frontend/src/components/ChatBox.tsx](frontend/src/components/ChatBox.tsx)

`<input onKeyPress={handleKeyPress}>` uses a React event that was deprecated in React 17 and removed from the TypeScript types in React 19. The Enter-to-send handler may work in some browsers (the DOM keypress event still fires) but it is unreliable and will eventually break.

**Fix:** Change `onKeyPress` to `onKeyDown`.

```tsx
// Change this:
<input onKeyPress={handleKeyPress} ... />

// To this:
<input onKeyDown={handleKeyPress} ... />
```

The `handleKeyPress` function itself needs no changes — it already checks `e.key === 'Enter'`.

---

### Bug 2 — Dead catch branch in JWT middleware (low priority)

**File:** [backend/src/middleware/auth.middleware.ts](backend/src/middleware/auth.middleware.ts)

`TokenExpiredError` extends `JsonWebTokenError`. In both `authenticate` and `requireAdmin`, the error handling checks `instanceof jwt.JsonWebTokenError` first, which also matches expired tokens. The `else if (error instanceof jwt.TokenExpiredError)` branch is never reached — expired tokens get the message "Invalid token" instead of "Token expired". Both return 401 so the functional impact is just a misleading error message.

**Fix:** Swap the order.

```typescript
// In both authenticate and requireAdmin catch blocks, change:
if (error instanceof jwt.JsonWebTokenError) {
  next(new AppError('Invalid token', 401));
} else if (error instanceof jwt.TokenExpiredError) {   // dead code
  next(new AppError('Token expired', 401));
}

// To:
if (error instanceof jwt.TokenExpiredError) {    // check subclass first
  next(new AppError('Token expired', 401));
} else if (error instanceof jwt.JsonWebTokenError) {
  next(new AppError('Invalid token', 401));
}
```

---

### Bug 3 — N+1 database queries in `getConversations` (medium priority)

**File:** [backend/src/controllers/conversation.controller.ts:37-76](backend/src/controllers/conversation.controller.ts)

For each conversation in a researcher's history, the code runs two additional queries: one for message count and one for the last message preview. For N conversations that's 2N+1 queries. `Promise.all` parallelizes them but they still hit the DB individually.

**Fix:** Replace with a single query using `LEFT JOIN` and `GROUP BY`:

```sql
SELECT 
  c.*,
  COUNT(m.id) AS message_count,
  (SELECT text FROM messages 
   WHERE conversation_id = c.id 
   ORDER BY timestamp DESC LIMIT 1) AS last_message_text,
  (SELECT sender FROM messages 
   WHERE conversation_id = c.id 
   ORDER BY timestamp DESC LIMIT 1) AS last_message_sender,
  (SELECT timestamp FROM messages 
   WHERE conversation_id = c.id 
   ORDER BY timestamp DESC LIMIT 1) AS last_message_timestamp
FROM conversations c
LEFT JOIN messages m ON m.conversation_id = c.id
WHERE c.user_id = ?
GROUP BY c.id
ORDER BY c.last_message_at DESC
```

---

### Technical Debt 1 — In-memory settings store

**File:** [backend/src/controllers/settings.controller.ts](backend/src/controllers/settings.controller.ts)

The `settingsStore` Map stores per-user per-model settings in server memory. Settings are lost on restart. This code appears to be an earlier experiment — no frontend component currently calls `settingsAPI`. Either remove it or migrate to the `configs` table.

---

### Technical Debt 2 — `api.ts` dev default port vs documentation

**File:** [frontend/src/services/api.ts:18](frontend/src/services/api.ts)

The dev fallback is `http://localhost:3001/api`, and `server.ts` also falls back to port 3001 if `PORT` is not set. These agree with each other. However, `CLAUDE.md` and the `README` say port 5000, which is the value set in `.env`. A developer who skips creating `.env` will have backend on 3001 and frontend pointing to 3001 — it works, but the port 5000 in all the docs will confuse them.

---

### Technical Debt 3 — Default admin key in schema

**File:** [backend/database/schema.sql:111](backend/database/schema.sql)

`schema.sql` inserts `ADMIN_KEY = 'admin123'` into the `configs` table. Any deployment that doesn't set `ADMIN_KEY` in `.env` uses this default. Always set `ADMIN_KEY` in `.env`.

---

### Technical Debt 4 — Unused `ai_models` table

`database/schema.sql` creates and seeds an `ai_models` table with 16 model entries, but no code reads from it. Available models are fetched directly from the LiteLLM proxy at runtime. This table is dead weight.

---

### Technical Debt 5 — Unused `frontend/src/services/litellm.service.ts`

Verified by grep: nothing imports this file. It duplicates the auth-aware fetch wrapper from `api.ts`. Safe to delete.

---

## 7. How to Add Common Things

### Add a new API endpoint

1. Add the controller function in `backend/src/controllers/<domain>.controller.ts`
2. Add the route in `backend/src/routes/<domain>.routes.ts`
3. Add the fetch call in `frontend/src/services/api.ts` in the matching domain object
4. The route is already mounted in `server.ts` — no changes needed there unless you're creating a completely new domain

Example — adding a "duplicate task" endpoint:

```typescript
// backend/src/controllers/task.controller.ts
export const duplicateTask = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const userId = (req as any).user.id;
  const existing = await db.queryOne('SELECT * FROM tasks WHERE id = ? AND user_id = ?', [id, userId]);
  if (!existing) { res.status(404).json({ success: false, message: 'Task not found' }); return; }
  const newId = uuidv4();
  await db.query(
    'INSERT INTO tasks (id, user_id, name, system_prompt, task_prompt, default_model, chatbot_name) VALUES (?,?,?,?,?,?,?)',
    [newId, userId, `${existing.name} (copy)`, existing.system_prompt, existing.task_prompt, existing.default_model, existing.chatbot_name]
  );
  const created = await db.queryOne('SELECT * FROM tasks WHERE id = ?', [newId]);
  res.status(201).json({ success: true, data: transformTaskFromDB(created) });
};
```

```typescript
// backend/src/routes/task.routes.ts — add:
router.post('/:id/duplicate', authenticate, duplicateTask);
```

```typescript
// frontend/src/services/api.ts — add to tasksAPI:
duplicate: async (id: string): Promise<Task | null> => {
  try {
    const response = await fetchAPI(`/tasks/${id}/duplicate`, { method: 'POST' });
    const data = await response.json();
    return data.success ? data.data : null;
  } catch { return null; }
}
```

### Add a new field to tasks

1. Add the column to `database/schema.sql` (and run `ALTER TABLE tasks ADD COLUMN ...` on existing DBs)
2. Add it to `transformTaskFromDB` in `task.controller.ts`
3. Add it to the INSERT in `createTask` and the UPDATE check in `updateTask`
4. Add it to the `AISettings` interface in `backend/src/types/index.ts`
5. Add it to the `AISettings` interface in `frontend/src/services/api.ts`
6. Add the input field to `ResearchPanel.tsx`

### Add a new AI model provider

No code change needed. Add the model to LiteLLM's config on the proxy side. The frontend fetches available models live from `GET /api/litellm/models`, which calls the LiteLLM proxy's `/v1/models`. As long as LiteLLM knows about the model, it appears automatically.

If you want it pre-seeded in the `ai_models` table (mostly unused), add a row to the `INSERT INTO ai_models` block in `schema.sql`.

### Add a new page/route

1. Create `frontend/src/components/MyPage.tsx` and `MyPage.css`
2. Import it in `App.tsx`
3. Add a `<Route path="/my-path" element={<MyPage />} />` inside `<Routes>`
4. Add a `<NavLink to="/my-path">` to the nav bar in App.tsx if researchers should see it

---

## 8. Next Feature Ideas & How to Build Them

### Feature: Participant consent form before chat

**Use case:** IRB requirements may require informed consent before participants chat.

**How to build:**
1. Add a `consent_accepted_at` column to a new `participant_sessions` table (or just check localStorage).
2. Create `ConsentPage.tsx` that renders the consent text and an "I agree" button.
3. In `StudyChatPage` in `App.tsx`, load a flag from localStorage (`consent_${userId}`). If missing, render `<ConsentPage>` instead of `<ChatBox>`. On agreement, set the flag and show the chat.
4. No backend changes needed unless you want to persist consent timestamps in the DB.

---

### Feature: Demographic survey before/after chat

**Use case:** Collect age, gender, familiarity with AI, etc. for analysis.

**How to build:**
1. Add a `survey_responses` table:
   ```sql
   CREATE TABLE survey_responses (
     id VARCHAR(36) PRIMARY KEY,
     conversation_id VARCHAR(36),
     device_id VARCHAR(255),
     responses JSON NOT NULL,
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE SET NULL
   );
   ```
2. Add `POST /api/survey` route (no auth, like conversation save) that inserts a row.
3. Create `SurveyForm.tsx` with your questions. Show it before the chat loads in `StudyChatPage`, or after the participant sends their first message.
4. Add `surveyAPI.submit(conversationId, deviceId, responses)` to `api.ts`.

---

### Feature: Migrate settings from in-memory to database

**Use case:** Settings survive server restarts; work across multiple server instances.

**How to build:**
1. Use the existing `configs` table, or add a dedicated `user_settings` table.
2. In `settings.controller.ts`, replace `settingsStore.get(userId)` with a `db.queryOne` call, and `settingsStore.set` with an `INSERT ... ON DUPLICATE KEY UPDATE`.
3. No frontend changes needed since the API shape stays the same.

Alternatively, since no UI currently uses `settingsAPI`, just delete `settings.controller.ts` and `settings.routes.ts` and remove the route mount in `server.ts`.

---

### Feature: Multiple study conditions (controlled random assignment)

**Use case:** Ensure equal distribution of participants across tasks, not purely random.

**How to build:**
1. Add a `participant_assignments` table:
   ```sql
   CREATE TABLE participant_assignments (
     device_id VARCHAR(255) NOT NULL,
     researcher_id VARCHAR(50) NOT NULL,
     task_id VARCHAR(36) NOT NULL,
     assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     PRIMARY KEY (device_id, researcher_id),
     FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
   );
   ```
2. Add `GET /api/study/:userId/assignment?deviceId=...` — looks up or creates an assignment. On first visit, choose the task with the fewest assignments (balanced random) and persist it.
3. In `StudyChatPage`, call this endpoint instead of doing client-side `Math.random()`.
4. Currently `ChatBox.tsx` picks randomly on first visit using `Math.floor(Math.random() * tasks.length)`. This means participants who clear localStorage get re-randomized. The server-side approach fixes this.

---

### Feature: Real LiteLLM streaming (word-by-word from the model)

**Use case:** Faster perceived response time; more natural-feeling AI replies.

**Currently:** `streamMessage` in `chat.controller.ts` fetches the complete AI response first, then fakes word-by-word delivery with a 50ms delay.

**How to build real streaming:**
1. In `litellm.service.ts`, add a streaming call:
   ```typescript
   const response = await fetch(`${baseUrl}/v1/chat/completions`, {
     method: 'POST',
     headers: { ... },
     body: JSON.stringify({ ...payload, stream: true })
   });
   // response.body is a ReadableStream of SSE chunks
   ```
2. In `streamMessage` controller, pipe `response.body` directly to `res` instead of buffering the full response. Parse each SSE `data:` chunk from LiteLLM and re-emit it.
3. On the frontend, update `ChatBox.tsx` to call `/api/chat/stream` and handle SSE chunks using `EventSource` or `fetch` with `ReadableStream`.

---

### Feature: Export to formats beyond CSV

**Use case:** Researchers want JSON exports for programmatic analysis, or XLSX for spreadsheets.

**How to build:**
1. JSON export: already trivial — `JSON.stringify(conversations, null, 2)`. Add a "Download JSON" button alongside the existing CSV button in `ConversationHistory.tsx`.
2. XLSX: install `xlsx` (SheetJS) in the frontend (`npm install xlsx`), then:
   ```typescript
   import * as XLSX from 'xlsx';
   const ws = XLSX.utils.json_to_sheet(rows);
   const wb = XLSX.utils.book_new();
   XLSX.utils.book_append_sheet(wb, ws, 'Conversations');
   XLSX.writeFile(wb, 'conversations.xlsx');
   ```

---

### Feature: Rate limiting on the chat endpoint

**Use case:** Prevent participants from flooding the LiteLLM proxy with requests.

**How to build:**
1. Install `express-rate-limit`:
   ```bash
   cd backend && npm install express-rate-limit
   ```
2. In `server.ts` or `chat.routes.ts`:
   ```typescript
   import rateLimit from 'express-rate-limit';
   const chatLimiter = rateLimit({
     windowMs: 60 * 1000,  // 1 minute
     max: 20,              // 20 messages per minute per IP
     message: { success: false, message: 'Too many messages — slow down.' }
   });
   router.post('/message', chatLimiter, sendMessage);
   ```

---

### Feature: Automated tests

**Use case:** Catch regressions before deploying, especially after schema or controller changes.

**Recommended stack:** `vitest` for both frontend and backend (same API as Jest, faster).

**Backend:**
```bash
cd backend && npm install -D vitest supertest @types/supertest
```
Test conversation save/load:
```typescript
// backend/src/__tests__/conversation.test.ts
import request from 'supertest';
import app from '../server';

test('saves and retrieves a conversation', async () => {
  const conv = { id: 'test-id', messages: [...], ... };
  await request(app).post('/api/conversations/test-user').send(conv).expect(200);
  const res = await request(app).get('/api/conversations/test-user/test-id')
    .set('Authorization', `Bearer ${testToken}`).expect(200);
  expect(res.body.conversation.id).toBe('test-id');
});
```

**Frontend:**
```bash
cd frontend && npm install -D vitest @testing-library/react @testing-library/user-event jsdom
```
Test ChatBox Enter-key send:
```typescript
// frontend/src/__tests__/ChatBox.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
test('sends message on Enter key', async () => {
  render(<ChatBox tasks={[mockTask]} onSaveConversation={vi.fn()} studyId="s1" />);
  const input = screen.getByPlaceholderText('Type your message here...');
  await userEvent.type(input, 'hello{Enter}');
  expect(screen.getByText('hello')).toBeInTheDocument();
});
```

---

## Quick Reference

### Environment variables (backend)

| Variable | Required | Default | Notes |
|----------|----------|---------|-------|
| `PORT` | No | 3001 | Set to 5000 in dev by convention |
| `DB_HOST` | Yes | — | MySQL host |
| `DB_PORT` | No | 3306 | |
| `DB_NAME` | Yes | — | `human_ai_interaction` |
| `DB_USER` | Yes | — | |
| `DB_PASSWORD` | Yes | — | |
| `JWT_SECRET` | Yes | `'fallback-secret-key'` | Use a long random string |
| `NODE_ENV` | No | `'development'` | `'production'` disables localhost CORS bypass |
| `ALLOWED_ORIGINS` | Yes (prod) | `localhost:3000,5173` | Comma-separated |
| `LITELLM_API_BASE` | Yes | From DB `configs` | LiteLLM proxy URL |
| `LITELLM_API_KEY` | No | From DB `configs` | |
| `ADMIN_KEY` | Yes | From DB `configs` (`'admin123'`) | Change before deploying |

### localStorage keys (frontend)

| Key | Value |
|-----|-------|
| `authToken` | Researcher JWT |
| `researchLoggedIn` | `'true'` when logged in |
| `research_tasks_<userId>` | Cached task array (JSON) |
| `conversations_<userId>` | Cached conversations (JSON) |
| `currentChat_<studyId>` | Participant's in-progress conversation (JSON) |
| `device_unique_id` | Device fingerprint hash |

### sessionStorage keys (frontend)

| Key | Value |
|-----|-------|
| `adminToken` | Admin JWT (cleared on tab close) |
