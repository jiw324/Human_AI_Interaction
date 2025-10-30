# Frontend-Backend Integration Guide

## 🎯 Overview

Your Human-AI Interaction Platform now has a **complete frontend-backend integration** with the frontend running on **port 5173** and backend running on **port 3001**.

---

## 📁 Project Structure

```
Human_AI_Interaction/
├── frontend/                    # React + TypeScript + Vite (Port 5173)
│   ├── src/
│   │   ├── components/         # UI Components
│   │   │   ├── ChatBox.tsx    # ✅ Connected to backend
│   │   │   ├── LoginPage.tsx  # ✅ Connected to backend
│   │   │   ├── ResearchPanel.tsx
│   │   │   └── ConversationHistory.tsx
│   │   ├── services/
│   │   │   └── api.ts         # ✅ NEW: Backend API service
│   │   ├── App.tsx            # ✅ Updated with backend integration
│   │   └── main.tsx
│   └── package.json
│
└── backend/                     # Node.js + Express + TypeScript (Port 3001)
    ├── src/
    │   ├── controllers/        # Business logic
    │   ├── routes/             # API endpoints
    │   ├── middleware/         # Auth & error handling
    │   ├── types/              # TypeScript interfaces
    │   └── server.ts           # Main entry point
    ├── package.json
    └── .env                    # Configuration (create this!)
```

---

## 🚀 How to Run

### Step 1: Start the Backend

```bash
cd backend

# Create .env file (if not exists)
echo "PORT=3001
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:5173
JWT_SECRET=your-secret-key-change-this
JWT_EXPIRES_IN=24h
RESEARCH_KEY=admin123" > .env

# Start backend server
npm run dev
```

**Expected Output:**
```
🚀 Server running on port 3001
📝 Environment: development
🔗 API: http://localhost:3001/api
```

### Step 2: Start the Frontend

**Open a new terminal:**

```bash
cd frontend

# Start frontend server
npm run dev
```

**Expected Output:**
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
```

### Step 3: Verify Integration

1. Open browser: `http://localhost:5173`
2. Check the **Backend Status** indicator in the top-right nav bar:
   - 🟢 **Backend Online** = Connected!
   - 🔴 **Backend Offline** = Backend not running
   - 🟡 **Checking...** = Initial connection test

---

## 🔗 What's Connected

### ✅ **1. Authentication (LoginPage)**
- **Frontend**: `frontend/src/components/LoginPage.tsx`
- **Backend**: `backend/src/controllers/auth.controller.ts`
- **API Endpoint**: `POST /api/auth/login`

**How it works:**
1. User enters research key
2. Frontend calls `authAPI.login(researchKey)`
3. Backend validates key and returns JWT token
4. Token stored in localStorage (`authToken`)
5. User redirected to research panel

**Default Research Key:** `admin123`

---

### ✅ **2. AI Chat (ChatBox)**
- **Frontend**: `frontend/src/components/ChatBox.tsx`
- **Backend**: `backend/src/controllers/chat.controller.ts`
- **API Endpoint**: `POST /api/chat/message`

**How it works:**
1. User types message
2. Frontend calls `chatAPI.sendMessage()`
3. Backend generates AI response based on:
   - Selected AI personality (Task 1-4)
   - AI settings (creativity, verbosity, temperature)
   - System prompt and task prompt
4. AI response returned and displayed

**AI Personalities:**
- **Task 1**: Analytical
- **Task 2**: Creative
- **Task 3**: Expert
- **Task 4**: Friendly

---

### ✅ **3. Backend Health Check**
- **Frontend**: `frontend/src/App.tsx`
- **Backend**: `backend/src/server.ts`
- **API Endpoint**: `GET /api/health`

**Status Indicator:**
- Shows real-time backend connection status
- Auto-checks on app load
- Visual indicator with pulsing dot

---

## 📡 API Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/api/health` | Health check | ❌ |
| `POST` | `/api/auth/login` | Login with research key | ❌ |
| `GET` | `/api/auth/verify` | Verify JWT token | ✅ |
| `POST` | `/api/chat/message` | Send message to AI | ❌ |
| `POST` | `/api/chat/stream` | Stream AI response | ❌ |
| `GET` | `/api/settings/:userId` | Get AI settings | ✅ |
| `PUT` | `/api/settings/:userId/:modelName` | Update settings | ✅ |
| `DELETE` | `/api/settings/:userId/:modelName` | Reset settings | ✅ |
| `GET` | `/api/conversations/:userId` | Get all conversations | ✅ |
| `POST` | `/api/conversations/:userId` | Save conversation | ✅ |
| `DELETE` | `/api/conversations/:userId/:conversationId` | Delete conversation | ✅ |

---

## 🔐 Authentication Flow

```
1. User clicks "Research Login"
2. LoginPage → authAPI.login(key)
3. Backend validates key
4. Backend returns JWT token
5. Frontend stores token in localStorage
6. Protected routes now accessible
7. Token included in API requests (Authorization: Bearer <token>)
8. Logout clears token
```

---

## 💬 Chat Flow

```
1. User types message in ChatBox
2. Frontend calls chatAPI.sendMessage()
   - Includes: message, conversationId, aiModel, settings
3. Backend receives request
4. Backend's generateAIResponse() function:
   - Analyzes message context
   - Applies personality (analytical/creative/expert/friendly)
   - Adjusts verbosity based on settings
   - Simulates thinking delay
5. Backend returns AI response
6. Frontend displays response
7. Conversation auto-saved to localStorage
```

---

## 🛠️ API Service (`frontend/src/services/api.ts`)

### Key Functions:

```typescript
// Authentication
authAPI.login(researchKey)        // Login and get token
authAPI.verify()                  // Verify token validity
authAPI.logout()                  // Clear token

// Chat
chatAPI.sendMessage(message, conversationId, aiModel, settings)

// Settings (Future)
settingsAPI.getSettings(userId)
settingsAPI.updateSettings(userId, modelName, settings)

// Conversations (Future)
conversationsAPI.getAll(userId)
conversationsAPI.save(userId, conversation)

// Health
healthAPI.check()                 // Check if backend is online
```

---

## 🔧 Configuration

### Backend (`.env`)
```env
PORT=3001                                    # Backend port
NODE_ENV=development                         # Environment
ALLOWED_ORIGINS=http://localhost:5173        # CORS
JWT_SECRET=your-secret-key                   # JWT signing key
JWT_EXPIRES_IN=24h                           # Token expiration
RESEARCH_KEY=admin123                        # Login key
```

### Frontend
- **Backend URL**: Hardcoded to `http://localhost:3001/api` in `api.ts`
- **Can be changed** to environment variable if needed

---

## 🎨 Backend Status Indicator

The UI now shows real-time backend connection status:

- 🟢 **Green Dot + "Backend Online"** = Connected
- 🔴 **Red Dot + "Backend Offline"** = Not running
- 🟡 **Yellow Dot + "Checking..."** = Testing connection

**Location:** Top-right of navigation bar

---

## 📝 Data Flow

### Current Setup:
- **Authentication**: Backend (JWT tokens)
- **Chat Messages**: Backend API
- **Conversation History**: Frontend (localStorage) + can sync to backend
- **AI Settings**: Frontend (localStorage) + can sync to backend

### Future Enhancements:
- Move conversation storage to backend database
- Sync AI settings to backend for multi-device access
- Add user accounts instead of single research key

---

## 🧪 Testing the Integration

### Test 1: Backend Health
```bash
curl http://localhost:3001/api/health
```
**Expected:**
```json
{
  "status": "ok",
  "timestamp": "2025-10-30T...",
  "uptime": 123.45
}
```

### Test 2: Login
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"researchKey": "admin123"}'
```
**Expected:**
```json
{
  "success": true,
  "token": "eyJhbGc...",
  "message": "Login successful"
}
```

### Test 3: Chat
```bash
curl -X POST http://localhost:3001/api/chat/message \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hello!",
    "conversationId": "test-123",
    "aiModel": {
      "id": "task1",
      "name": "Task 1",
      "greeting": "Hi",
      "description": "Analytical"
    }
  }'
```

---

## 🐛 Troubleshooting

### Backend Offline in UI
1. Check backend is running: `cd backend && npm run dev`
2. Check port 3001 is not in use
3. Check `.env` file exists in backend folder
4. Check browser console for CORS errors

### Login Not Working
1. Verify backend is running
2. Check research key is `admin123`
3. Open browser DevTools → Network tab
4. Check `/api/auth/login` request status

### Chat Not Working
1. Verify backend status indicator shows "Online"
2. Check browser console for errors
3. Verify backend logs show request received
4. Test backend endpoint directly with curl

### CORS Errors
1. Check `ALLOWED_ORIGINS` in backend `.env` matches frontend URL
2. Restart backend after changing `.env`
3. Clear browser cache

---

## 🎯 Next Steps

### Immediate:
1. ✅ Backend running on port 3001
2. ✅ Frontend running on port 5173
3. ✅ Chat connected to backend
4. ✅ Login connected to backend

### Future Enhancements:
- [ ] Add database (MongoDB/PostgreSQL)
- [ ] Integrate real AI API (OpenAI/Anthropic)
- [ ] Sync conversation history to backend
- [ ] Sync AI settings to backend
- [ ] Add user accounts and profiles
- [ ] Add real-time streaming responses
- [ ] Add file upload capabilities
- [ ] Deploy to production

---

## 📚 Key Files Modified

### Frontend
- ✅ `frontend/src/services/api.ts` (NEW)
- ✅ `frontend/src/App.tsx` (Updated)
- ✅ `frontend/src/App.css` (Updated)
- ✅ `frontend/src/components/LoginPage.tsx` (Updated)
- ✅ `frontend/src/components/ChatBox.tsx` (Updated)

### Backend
- ✅ All files created from scratch

---

## 💡 Tips

1. **Always start backend first** before frontend
2. **Check backend status** indicator before testing features
3. **JWT tokens expire** after 24h (configurable in `.env`)
4. **Research key** can be changed in backend `.env`
5. **LocalStorage** still used for conversations and settings (can be migrated to backend)

---

## 📞 Support

If you encounter issues:
1. Check both terminal outputs for errors
2. Verify ports 3001 and 5173 are available
3. Clear browser cache and localStorage
4. Restart both servers

**Happy coding! 🚀**

