# Human-AI Interaction Platform

A full-stack web application for human-AI interaction research, featuring multi-model chat capabilities, conversation history, and comprehensive research configuration tools.

## 📋 Table of Contents

- [Features](#features)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Running the Application](#running-the-application)
- [Configuration](#configuration)
- [Documentation](#documentation)

## ✨ Features

### Chat Interface
- Multi-AI model support (GPT-4, Claude, Llama, Mistral, etc.)
- Real-time chat with customizable AI personalities
- Model switching during conversations
- Message history and persistence

### Research Panel
- **Task Configuration**: Create and manage multiple research tasks with individual AI settings
- **System Configuration**: Configure LLM endpoints, API keys, and model settings
- Task-specific prompts and parameters
- Add/delete tasks dynamically
- Per-task AI personality and behavior customization

### Conversation Management
- Browse conversation history
- Search and filter conversations
- Load previous conversations
- Delete conversations

### Security
- JWT-based authentication
- Protected research routes
- Secure API key storage
- Backend health monitoring

## 📁 Project Structure

```
Human_AI_Interaction/
├── backend/              # Node.js + Express + TypeScript backend
│   ├── src/
│   │   ├── controllers/  # API route controllers
│   │   ├── middleware/   # Auth and error handling
│   │   ├── routes/       # API route definitions
│   │   └── types/        # TypeScript type definitions
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/             # React + TypeScript + Vite frontend
│   ├── src/
│   │   ├── components/   # React components
│   │   │   ├── ChatBox.tsx
│   │   │   ├── ResearchPanel.tsx
│   │   │   ├── ConversationHistory.tsx
│   │   │   └── LoginPage.tsx
│   │   ├── services/     # API service layer
│   │   ├── App.tsx       # Main app component
│   │   └── main.tsx      # Entry point
│   ├── package.json
│   └── vite.config.ts
│
├── .gitignore
├── INTEGRATION_GUIDE.md  # Detailed integration documentation
└── README.md             # This file
```

## 🔧 Prerequisites

- **Node.js** (v16 or higher)
- **npm** or **yarn**
- Modern web browser (Chrome, Firefox, Edge, Safari)

## 📦 Installation

### 1. Clone the repository

```bash
git clone <repository-url>
cd Human_AI_Interaction
```

### 2. Install backend dependencies

```bash
cd backend
npm install
```

### 3. Install frontend dependencies

```bash
cd ../frontend
npm install
```

## 🚀 Running the Application

### Development Mode

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```
The backend will start on `http://localhost:5000`

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```
The frontend will start on `http://localhost:5173`

### Production Build

**Backend:**
```bash
cd backend
npm run build
npm start
```

**Frontend:**
```bash
cd frontend
npm run build
npm run preview
```

## ⚙️ Configuration

### Environment Variables

Create `.env` files in both backend and frontend directories:

**Backend `.env`:**
```env
PORT=5000
JWT_SECRET=your-secret-key
NODE_ENV=development
```

**Frontend `.env`:**
```env
VITE_API_URL=http://localhost:5000
```

### Research Panel Configuration

1. Log in to the research panel
2. Navigate to the **Research** tab
3. Switch to **System Configuration** view
4. Configure:
   - Llama.LM settings (Base URL, API Key)
   - OpenAI API Key
   - Anthropic API Key
   - Default model selection

### Task Configuration

1. In the **Task Configuration** view:
   - Add new tasks with the "+ Add Task" button
   - Configure individual AI settings per task
   - Set system and task prompts
   - Adjust AI parameters (temperature, max tokens, etc.)

## 📚 Documentation

For detailed integration and development information, see:
- [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md) - Complete integration guide

### Key Components

- **ChatBox**: Main chat interface with model selection
- **ResearchPanel**: Dual-view panel for task and system configuration
- **ConversationHistory**: Browse and manage past conversations
- **LoginPage**: Authentication for research features

## 🛠️ Development

### Code Structure

- **Frontend**: React functional components with TypeScript
- **Backend**: Express.js with TypeScript, JWT authentication
- **Styling**: Modern CSS with responsive design
- **State Management**: React hooks (useState, useEffect, useRef)

### API Endpoints

- `POST /api/auth/login` - User authentication
- `GET /api/chat` - Chat endpoint
- `GET /api/conversations` - Fetch conversations
- `POST /api/settings` - Save settings

### Building for Production

```bash
# Build backend
cd backend
npm run build

# Build frontend
cd frontend
npm run build
```

## 🔒 Security Notes

- API keys are stored in browser localStorage
- JWT tokens expire after configured duration
- Protected routes require authentication
- Backend validates all requests

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## 📝 License

[Your License Here]

## 🐛 Troubleshooting

**Backend not starting:**
- Check if port 5000 is available
- Verify Node.js version (v16+)
- Run `npm install` in backend directory

**Frontend build errors:**
- Clear node_modules: `rm -rf node_modules && npm install`
- Check for TypeScript errors
- Verify all dependencies are installed

**Authentication issues:**
- Check JWT_SECRET is set in backend .env
- Clear browser localStorage
- Verify backend is running

## 📧 Support

For issues and questions, please open an issue in the repository.

