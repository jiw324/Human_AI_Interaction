import React, { useState, useRef, useEffect } from 'react';
import './ChatBox.css';
import { chatAPI, conversationsAPI, type Message, type Conversation, type AIModel } from '../services/api';
import { getDeviceId } from '../utils/deviceId';

interface AISettings {
  personality: string;
  responseSpeed: number;
  creativity: number;
  helpfulness: number;
  verbosity: number;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
  taskPrompt: string;
}

interface Task {
  id: string;
  name: string;
  settings: AISettings;
}

interface ChatBoxProps {
  tasks: Task[];
  onSaveConversation: (conversation: Conversation) => void;
}

const ChatBox: React.FC<ChatBoxProps> = ({ tasks, onSaveConversation }) => {
  // Check if no tasks are available
  if (tasks.length === 0) {
    return (
      <div className="chat-container">
        <div className="chat-messages" style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          height: '100%',
          padding: '40px'
        }}>
          <div style={{ 
            textAlign: 'center',
            maxWidth: '400px',
            background: '#fff3cd',
            padding: '30px',
            borderRadius: '12px',
            border: '2px solid #ffc107'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '20px' }}>⚠️</div>
            <h2 style={{ margin: '0 0 15px 0', color: '#856404', fontSize: '24px' }}>No Tasks Found</h2>
            <p style={{ margin: '0 0 20px 0', color: '#856404', fontSize: '16px', lineHeight: '1.5' }}>
              Please create a task in the Research Panel to start chatting.
            </p>
            <a 
              href="/research" 
              style={{ 
                display: 'inline-block',
                padding: '12px 24px',
                background: '#ffc107',
                color: '#000',
                textDecoration: 'none',
                borderRadius: '6px',
                fontWeight: '600',
                transition: 'background 0.3s'
              }}
              onMouseOver={(e) => e.currentTarget.style.background = '#ffb300'}
              onMouseOut={(e) => e.currentTarget.style.background = '#ffc107'}
            >
              Go to Research Panel
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Convert tasks to AI models format
  const aiModels = tasks.map((task, index) => ({
    name: task.name,
    greeting: task.settings.taskPrompt || `Hello! You are chatting with ${task.name}. How can I help you today?`,
    personality: task.settings.personality,
    icon: ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'][index] || '💬'
  }));

  // Load or initialize conversation from localStorage
  const [selectedModel] = useState(() => {
    const savedChat = localStorage.getItem('currentChat');
    if (savedChat) {
      try {
        const parsed = JSON.parse(savedChat);
        return parsed.aiModel;
      } catch (error) {
        console.error('Error parsing saved chat:', error);
      }
    }
    // Randomly select a task for first-time users
    if (tasks.length > 0) {
      const randomIndex = Math.floor(Math.random() * tasks.length);
      const randomTask = tasks[randomIndex];
      const icons = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
      
      console.log(`🎲 First visit - randomly selected task: ${randomTask.name} (${randomIndex + 1}/${tasks.length})`);
      
      return {
        name: randomTask.name,
        greeting: randomTask.settings.taskPrompt || `Hello! You are chatting with ${randomTask.name}. How can I help you today?`,
        personality: randomTask.settings.personality,
        icon: icons[randomIndex] || '💬'
      };
    }
    // Fallback if no tasks (should not reach here due to early return)
    return {
      name: 'No Tasks',
      greeting: '',
      personality: 'friendly',
      icon: '⚠️'
    };
  });

  const [conversationId] = useState(() => {
    const savedChat = localStorage.getItem('currentChat');
    if (savedChat) {
      try {
        const parsed = JSON.parse(savedChat);
        return parsed.id;
      } catch (error) {
        console.error('Error parsing saved chat:', error);
      }
    }
    return Date.now().toString();
  });

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: selectedModel.greeting,
      sender: 'ai' as const,
      timestamp: new Date()
    }
  ]);
  
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);

  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Get settings for the selected model
  const currentTask = tasks.find(t => t.name === selectedModel.name);
  const currentSettings = currentTask?.settings || tasks[0]?.settings || {
    personality: 'friendly',
    responseSpeed: 1.0,
    creativity: 0.7,
    helpfulness: 0.9,
    verbosity: 0.6,
    temperature: 0.7,
    maxTokens: 1000,
    systemPrompt: 'You are a helpful AI assistant.',
    taskPrompt: ''
  };

  // Load messages from backend or localStorage on mount
  useEffect(() => {
    const loadMessages = async () => {
      console.log('📡 Loading conversation on open...');
      
      try {
        // First, try loading from backend (use unique device ID based on fingerprint)
        const userId = await getDeviceId(); // Unique per device/browser - consistent across sessions
        console.log('🔍 Attempting to fetch conversations from backend for device:', userId);
        
        const conversations = await conversationsAPI.getAll(userId);
        
        if (conversations && conversations.length > 0) {
          // Load the most recent conversation
          const latestConversation = conversations[0];
          console.log('✅ Loaded latest conversation from backend:', latestConversation.title);
          console.log(`   - Messages: ${latestConversation.messages.length}`);
          console.log(`   - Last updated: ${latestConversation.lastMessageAt}`);
          
          setMessages(latestConversation.messages);
          setIsLoadingMessages(false);
          return;
        } else {
          console.log('ℹ️ No conversations in backend, checking localStorage...');
        }
      } catch (error) {
        console.error('⚠️ Backend error, falling back to localStorage:', error);
      }
      
      // If backend fails or has no data, try localStorage
      const savedChat = localStorage.getItem('currentChat');
      if (savedChat) {
        try {
          const parsed = JSON.parse(savedChat);
          // Convert date strings back to Date objects
          const messagesWithDates = parsed.messages.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }));
          setMessages(messagesWithDates);
          console.log('✅ Loaded chat from localStorage');
          setIsLoadingMessages(false);
          return;
        } catch (error) {
          console.error('Error parsing saved chat:', error);
        }
      }
      
      // Final fallback: use default greeting
      console.log('ℹ️ No saved conversations, using default greeting');
      setMessages([
        {
          id: '1',
          text: selectedModel.greeting,
          sender: 'ai' as const,
          timestamp: new Date()
        }
      ]);
      setIsLoadingMessages(false);
    };
    
    loadMessages();
  }, [selectedModel.greeting]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Save current chat to localStorage whenever messages change
  useEffect(() => {
    const conversation = {
      id: conversationId,
      title: `Chat with ${selectedModel.name}`,
      aiModel: selectedModel,
      messages: messages,
      createdAt: messages[0].timestamp,
      lastMessageAt: messages[messages.length - 1].timestamp
    };
    localStorage.setItem('currentChat', JSON.stringify(conversation));
  }, [messages, conversationId, selectedModel]);

  // Save conversation to history whenever messages change
  useEffect(() => {
    if (messages.length > 1) { // Only save if there are actual messages beyond the greeting
      const conversation: Conversation = {
        id: conversationId,
        title: `Chat with ${selectedModel.name}`,
        aiModel: selectedModel,
        messages: messages,
        createdAt: new Date(messages[0].timestamp),
        lastMessageAt: new Date(messages[messages.length - 1].timestamp)
      };
      onSaveConversation(conversation);
    }
  }, [messages, conversationId, selectedModel, onSaveConversation]);

  const getAIResponse = async (userMessage: string): Promise<Message | null> => {
    // Convert AI model to backend format
    const aiModel = {
      id: selectedModel.name.toLowerCase().replace(' ', ''),
      name: selectedModel.name,
      greeting: selectedModel.greeting,
      description: selectedModel.personality
    };

    // Convert settings to backend format
    const settings = {
      personality: currentSettings.personality,
      responseSpeed: currentSettings.responseSpeed,
      creativity: currentSettings.creativity,
      helpfulness: currentSettings.helpfulness,
      verbosity: currentSettings.verbosity,
      temperature: currentSettings.temperature,
      maxTokens: currentSettings.maxTokens,
      systemPrompt: currentSettings.systemPrompt,
      taskPrompt: currentSettings.taskPrompt || ''
    };

    // Call backend API
    const result = await chatAPI.sendMessage(
      userMessage,
      conversationId,
      aiModel,
      settings
    );

    if (result.success && result.response) {
      return result.response;
    } else {
      console.error('Failed to get AI response:', result.error);
      return null;
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText.trim(),
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsTyping(true);

    try {
      const aiMessage = await getAIResponse(userMessage.text);
      
      if (aiMessage) {
        setMessages(prev => [...prev, aiMessage]);
      } else {
        // Fallback error message
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: 'Sorry, I could not connect to the AI service. Please make sure the backend is running on port 3001.',
          sender: 'ai',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error('Error getting AI response:', error);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="chat-container">
      <div className="chat-header">
        <div className="ai-avatar">
          <div className="avatar-icon">{selectedModel.icon}</div>
        </div>
        <div className="chat-title">
          <h3>{selectedModel.name}</h3>
          <span className="status">Online • {selectedModel.personality}</span>
        </div>
      </div>
      
      
      <div className="chat-messages">
        {isLoadingMessages ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#999' }}>
            <p>Loading conversation...</p>
          </div>
        ) : (
          <>
        {messages.map((message) => (
          <div key={message.id} className={`message ${message.sender}`}>
            <div className="message-content">
              <div className="message-text">{message.text}</div>
              <div className="message-time">
                {message.timestamp.toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </div>
            </div>
          </div>
        ))}
        
        {isTyping && (
          <div className="message ai">
            <div className="message-content">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
          </>
        )}
      </div>
      
      <div className="chat-input">
        <div className="input-container">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message here..."
            className="message-input"
          />
          <button 
            onClick={handleSendMessage}
            disabled={!inputText.trim() || isTyping}
            className="send-button"
            title="Send message"
          >
            ➤
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatBox;
