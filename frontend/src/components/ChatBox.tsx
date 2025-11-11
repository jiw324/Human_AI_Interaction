import React, { useState, useRef, useEffect } from 'react';
import './ChatBox.css';
import { chatAPI } from '../services/api';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

interface AISettings {
  personality: string;
  responseSpeed: number;
  creativity: number;
  helpfulness: number;
  verbosity: number;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
}

interface AIModel {
  name: string;
  greeting: string;
  personality: string;
  icon: string;
}

interface Conversation {
  id: string;
  title: string;
  aiModel: AIModel;
  messages: Message[];
  createdAt: Date;
  lastMessageAt: Date;
}

interface ChatBoxProps {
  aiSettingsByModel: Record<string, AISettings>;
  onSaveConversation: (conversation: Conversation) => void;
}

const ChatBox: React.FC<ChatBoxProps> = ({ aiSettingsByModel, onSaveConversation }) => {
  // Define four different AI models/personalities
  const aiModels = [
    {
      name: 'Task 1',
      greeting: 'Hello! You are chatting with Task 1 (analytical). How can I help you today?',
      personality: 'analytical',
      icon: '1️⃣'
    },
    {
      name: 'Task 2',
      greeting: 'Hi! You are chatting with Task 2 (creative). What would you like to explore?',
      personality: 'creative',
      icon: '2️⃣'
    },
    {
      name: 'Task 3',
      greeting: 'Welcome! You are chatting with Task 3 (expert). What topic should we dive into?',
      personality: 'expert',
      icon: '3️⃣'
    },
    {
      name: 'Task 4',
      greeting: 'Hey there! You are chatting with Task 4 (friendly). What\'s on your mind?',
      personality: 'friendly',
      icon: '4️⃣'
    }
  ];

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
    const randomIndex = Math.floor(Math.random() * aiModels.length);
    return aiModels[randomIndex];
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

  const [messages, setMessages] = useState<Message[]>(() => {
    const savedChat = localStorage.getItem('currentChat');
    if (savedChat) {
      try {
        const parsed = JSON.parse(savedChat);
        // Convert date strings back to Date objects
        const messagesWithDates = parsed.messages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }));
        return messagesWithDates;
      } catch (error) {
        console.error('Error parsing saved chat:', error);
      }
    }
    // Default greeting message
    return [
      {
        id: '1',
        text: selectedModel.greeting,
        sender: 'ai' as const,
        timestamp: new Date()
      }
    ];
  });

  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Get settings for the selected model
  const currentSettings = aiSettingsByModel[selectedModel.name] || aiSettingsByModel['Task 1'];

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
      responseSpeed: 'medium',
      creativity: currentSettings.creativity,
      helpfulness: currentSettings.helpfulness,
      verbosity: currentSettings.verbosity,
      temperature: currentSettings.temperature,
      maxTokens: currentSettings.maxTokens,
      systemPrompt: currentSettings.systemPrompt,
      taskPrompt: ''
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
