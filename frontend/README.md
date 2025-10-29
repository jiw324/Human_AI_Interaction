# Human-AI Interaction Platform

A modern, interactive web application for chatting with multiple AI personalities and managing research configurations. Built with React, TypeScript, and Vite.

## ✨ Features

### 💬 AI Chat Interface
- **Multiple AI Personalities**: Chat with 4 different AI models, each with unique personalities:
  - Task 1: Analytical AI
  - Task 2: Creative AI
  - Task 3: Expert AI
  - Task 4: Friendly AI
- **Persistent Chat History**: Your conversations are automatically saved and restored when you return
- **Real-time Messaging**: Interactive chat interface with typing indicators
- **New Chat Function**: Start fresh conversations at any time with the "+ New Chat" button

### 🔬 Research Panel (Protected)
- **Task Management**: Switch between 4 different research tasks
- **Configurable Settings** for each task:
  - System Prompts: Define AI behavior and context
  - Task Prompts: Set specific task instructions
  - AI Model Configuration: Fine-tune parameters including:
    - Personality types
    - Response speed
    - Creativity level
    - Helpfulness
    - Verbosity
    - Temperature
    - Max tokens
- **Update & Reset**: Modify settings anytime with instant feedback
- **Persistent Configuration**: All settings are saved to localStorage

### 📜 Conversation History (Protected)
- View all past conversations
- Load previous chats
- Delete unwanted conversations
- Organized by date and AI model

### 🔐 Authentication
- Research Login system with password protection
- Conditional navigation based on login status
- Protected routes for Research and History sections
- Secure logout functionality

## 🚀 Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd Human_AI_Interaction/human-ai-interaction-app
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to:
```
http://localhost:5173
```

### Build for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## 🗂️ Project Structure

```
human-ai-interaction-app/
├── src/
│   ├── components/
│   │   ├── ChatBox.tsx          # Main chat interface
│   │   ├── ChatBox.css
│   │   ├── ResearchPanel.tsx    # Research configuration panel
│   │   ├── ResearchPanel.css
│   │   ├── LoginPage.tsx        # Authentication page
│   │   ├── LoginPage.css
│   │   ├── ConversationHistory.tsx  # Chat history viewer
│   │   └── ConversationHistory.css
│   ├── App.tsx                  # Main app component with routing
│   ├── App.css
│   ├── main.tsx                 # Application entry point
│   └── index.css
├── public/
├── package.json
└── README.md
```

## 🛠️ Tech Stack

- **Frontend Framework**: React 18
- **Language**: TypeScript
- **Build Tool**: Vite
- **Routing**: React Router DOM v6
- **Styling**: CSS3 with modern features
- **State Management**: React Hooks (useState, useEffect, useCallback)
- **Data Persistence**: Browser localStorage

## 💾 Data Storage

The application uses browser localStorage to persist:
- **Current Chat**: Ongoing conversation state (`currentChat`)
- **Conversation History**: All past conversations (`conversations`)
- **AI Settings**: Configuration for all 4 tasks (`aiSettingsByModel`)
- **Login State**: Authentication status (`researchLoggedIn`, `researchKey`)

## 🎨 Key Features Detail

### Chat Persistence
- Conversations are automatically saved after each message
- When you return to the app, your last conversation loads automatically
- Messages include timestamps and sender identification

### Research Configuration
- Each of the 4 tasks maintains independent settings
- Settings are editable at all times without toggle switches
- "Update" button provides feedback when settings are saved
- "Reset" button restores default values for the active task

### Protected Routes
- `/` - Public chat interface
- `/login` - Research login page
- `/research` - Protected research panel (requires login)
- `/history` - Protected conversation history (requires login)

### Navigation
- Dynamic navigation bar based on authentication state
- "Research Login" shown when logged out
- "Research", "History", and "Logout" shown when logged in
- "Chat" always visible

## 🔒 Authentication

The research login uses a simple key-based authentication system. In the current implementation, any research key will grant access. For production use, implement proper backend authentication.

## 🎯 Future Enhancements

Potential improvements for the platform:
- [ ] Backend API integration for real AI responses
- [ ] User account system with secure authentication
- [ ] Export/Import conversation history
- [ ] Search functionality in conversation history
- [ ] Dark mode support
- [ ] Mobile-responsive design improvements
- [ ] Multi-language support
- [ ] File upload capabilities
- [ ] Voice input/output
- [ ] Analytics dashboard

## 📝 Development Notes

### ESLint Configuration

For production applications, consider enabling type-aware lint rules by updating `eslint.config.js`:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      tseslint.configs.recommendedTypeChecked,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
])
```

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

## 📄 License

This project is licensed under the MIT License.

## 👤 Author

Built with ❤️ using React, TypeScript, and Vite.

---

**Note**: This is a demonstration application. AI responses are simulated. For production use, integrate with actual AI services like OpenAI, Anthropic, or similar providers.
