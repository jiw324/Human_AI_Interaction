import React, { useState, useRef, useEffect } from 'react';
import './ChatBox.css';

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

  const simulateAIResponse = async (userMessage: string): Promise<string> => {
    // Simulate AI thinking time based on response speed setting
    const baseDelay = 1000;
    const speedMultiplier = 1 / currentSettings.responseSpeed;
    const delay = baseDelay * speedMultiplier + Math.random() * 1000;
    await new Promise(resolve => setTimeout(resolve, delay));
    
    // Generate responses based on selected model's personality
    const personalityResponses = {
      analytical: [
        "Let me analyze this systematically for you.",
        "I'll break this down into logical components.",
        "Based on the data and reasoning, here's my analysis.",
        "Let me examine this from multiple analytical perspectives.",
        "From an analytical standpoint, I can provide the following insights."
      ],
      creative: [
        "What an imaginative question! Let me explore this creatively.",
        "I love thinking outside the box! Here's a creative perspective.",
        "This sparks my creativity! Let me share some innovative ideas.",
        "How fascinating! Let me approach this from a creative angle.",
        "I'm excited to brainstorm some creative solutions with you!"
      ],
      expert: [
        "As an expert in this field, I can provide authoritative guidance.",
        "Based on my extensive knowledge, here's what you should know.",
        "I have deep expertise in this area. Let me share my insights.",
        "From my professional experience, I recommend the following.",
        "My expertise tells me that the best approach would be..."
      ],
      friendly: [
        "That's a great question! I'd love to help you with that.",
        "I'm excited to chat about this topic with you!",
        "This is really interesting! Let me share my thoughts.",
        "I'm here to help and I'm happy to discuss this with you!",
        "What a wonderful question! Let me help you explore this."
      ]
    };

    const baseResponses = personalityResponses[selectedModel.personality as keyof typeof personalityResponses] || personalityResponses.friendly;
    let response = baseResponses[Math.floor(Math.random() * baseResponses.length)];
    
    // Adjust verbosity based on settings
    if (currentSettings.verbosity > 0.7) {
      response += " I'll provide you with detailed information and examples to help you understand this better.";
    } else if (currentSettings.verbosity < 0.3) {
      response = response.split('.')[0] + ".";
    }
    
    // Add creativity-based variations
    if (currentSettings.creativity > 0.8) {
      response += " Let me also suggest some creative approaches you might not have considered.";
    }
    
    // In a real app, you would process the userMessage and aiSettings here
    console.log('User message:', userMessage);
    console.log('Selected AI Model:', selectedModel.name);
    console.log('Current Settings:', currentSettings);
    
    return response;
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
      const aiResponse = await simulateAIResponse(userMessage.text);
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: aiResponse,
        sender: 'ai',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, aiMessage]);
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

  const handleNewChat = () => {
    // Clear current chat from localStorage
    localStorage.removeItem('currentChat');
    // Reload the page to start fresh
    window.location.reload();
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
        <button 
          onClick={handleNewChat}
          className="new-chat-btn"
          title="Start a new chat"
        >
          + New Chat
        </button>
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
