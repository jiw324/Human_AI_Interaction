import React, { useState, useRef, useEffect } from 'react';
import './ChatBox.css';
import { chatAPI, type Message, type Conversation } from '../services/api';
import { v4 as uuidv4 } from 'uuid';

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
  defaultModel?: string;
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
      
      // Task Prompt is displayed as the initial greeting message to the user
      // System Prompt is sent to the AI backend to control HOW it responds
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

  // Conversation ID - will be set when loading existing conversation or creating new one
  const [conversationId, setConversationId] = useState<string>('');
  // Conversation creation time - set once when conversation is created, never changes
  const [conversationCreatedAt, setConversationCreatedAt] = useState<Date>(new Date());

  const [messages, setMessages] = useState<Message[]>([]);
  
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

  // Get current greeting from task prompt
  const currentGreeting = currentSettings.taskPrompt || `Hello! You are chatting with ${selectedModel.name}. How can I help you today?`;

  // Load messages from localStorage only on mount
  useEffect(() => {
    const loadMessages = async () => {
      console.log('📡 Loading conversation...');
      
      // Try loading from localStorage only
      const savedChat = localStorage.getItem('currentChat');
      if (savedChat) {
        try {
          const parsed = JSON.parse(savedChat);
          
          // Set conversation ID and creation time if they exist
          if (parsed.id) {
            setConversationId(parsed.id);
            console.log('✅ Loaded chat from localStorage');
            console.log(`   - Conversation ID: ${parsed.id}`);
            console.log(`   - Messages: ${parsed.messages.length}`);
            
            // Load the original creation time
            if (parsed.createdAt) {
              setConversationCreatedAt(new Date(parsed.createdAt));
              console.log(`   - Created at: ${new Date(parsed.createdAt).toLocaleString()}`);
            }
          }
          
          // Convert date strings back to Date objects
          const messagesWithDates = parsed.messages.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }));
          
          // Sort messages by timestamp (oldest first) to ensure correct order
          const sortedMessages = messagesWithDates.sort((a: Message, b: Message) => 
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          );
          
          setMessages(sortedMessages);
          setIsLoadingMessages(false);
          return;
        } catch (error) {
          console.error('⚠️ Error parsing saved chat:', error);
        }
      }
      
      // No localStorage data - start new conversation with TaskPrompt
      const newConversationId = uuidv4();
      const creationTime = new Date(); // Set creation time once
      
      setConversationId(newConversationId);
      setConversationCreatedAt(creationTime); // Store creation time
      console.log('🆕 Starting new conversation with ID:', newConversationId);
      console.log('🕒 Conversation created at:', creationTime.toLocaleString());
      
      // Use current task prompt as greeting
      const greeting = currentSettings.taskPrompt || `Hello! You are chatting with ${selectedModel.name}. How can I help you today?`;
      console.log('📝 Using task prompt as initial greeting:', greeting);
      
      setMessages([
        {
          id: uuidv4(),
          text: greeting,
          sender: 'ai' as const,
          timestamp: creationTime // Use the same creation time
        }
      ]);
      setIsLoadingMessages(false);
    };
    
    loadMessages();
  }, []); // Only load once on mount, not when greeting changes

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Save current chat to localStorage whenever messages change
  useEffect(() => {
    if (conversationId && messages.length > 0) {
      const conversation = {
        id: conversationId,
        title: `Chat with ${selectedModel.name}`,
        aiModel: {
          ...selectedModel,
          greeting: currentGreeting // Always save current greeting
        },
        messages: messages,
        createdAt: conversationCreatedAt, // Use fixed creation time
        lastMessageAt: messages[messages.length - 1].timestamp
      };
      localStorage.setItem('currentChat', JSON.stringify(conversation));
    }
  }, [messages, conversationId, selectedModel, currentGreeting]);

  // Save conversation to history whenever messages change (debounced)
  useEffect(() => {
    // Only save if there are actual messages beyond the greeting AND conversation ID is set
    if (messages.length > 1 && conversationId) {
      // Debounce saving to prevent excessive API calls
      const timeoutId = setTimeout(() => {
        const conversation: Conversation = {
          id: conversationId,
          title: `Chat with ${selectedModel.name}`,
          aiModel: {
            ...selectedModel,
            greeting: currentGreeting // Always save current greeting
          },
          messages: messages,
          createdAt: conversationCreatedAt, // Use fixed creation time (never changes)
          lastMessageAt: new Date(messages[messages.length - 1].timestamp) // Updates with each message
        };
        console.log(`💾 Saving conversation ${conversationId} (created: ${conversationCreatedAt.toLocaleString()}) with ${messages.length} messages`);
        onSaveConversation(conversation);
      }, 1000); // Wait 1 second after last change before saving

      // Cleanup timeout on unmount or when dependencies change
      return () => clearTimeout(timeoutId);
    }
  }, [messages, conversationId, selectedModel.name, currentGreeting]); // Removed onSaveConversation from dependencies

  const getAIResponse = async (userMessage: string): Promise<Message | null> => {
    // Convert AI model to backend format
    const aiModel = {
      id: selectedModel.name.toLowerCase().replace(' ', ''),
      name: selectedModel.name,
      greeting: currentGreeting,
      description: selectedModel.personality
    };

    // Convert settings to backend format (include LiteLLM parameters)
    const settings = {
      personality: currentSettings.personality,
      responseSpeed: currentSettings.responseSpeed,
      creativity: currentSettings.creativity,
      helpfulness: currentSettings.helpfulness,
      verbosity: currentSettings.verbosity,
      temperature: currentSettings.temperature,
      maxTokens: currentSettings.maxTokens,
      systemPrompt: currentSettings.systemPrompt,
      taskPrompt: currentSettings.taskPrompt || '',
      // LiteLLM-specific parameters
      modelId: currentTask?.settings.defaultModel || 'gpt-4o-2024-11-20',
      topP: 1.0,
      presencePenalty: 0.0,
      frequencyPenalty: 0.0,
    };

    // Call backend API with message history for context
    const result = await chatAPI.sendMessage(
      userMessage,
      conversationId,
      aiModel,
      settings,
      messages // Send full message history
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
      id: uuidv4(),
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
          id: uuidv4(),
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
            {messages.map((message) => {
              // Many models (OpenAI-style) return responses starting with '\n\n'.
              // Strip leading whitespace for AI messages so bubbles don't start
              // with extra blank lines, but keep user messages as-is.
              const displayText =
                message.sender === 'ai'
                  ? message.text.replace(/^\s+/, '')
                  : message.text;

              return (
                <div key={message.id} className={`message ${message.sender}`}>
                  <div className="message-content">
                    <div className="message-text">{displayText}</div>
                    <div className="message-time">
                      {message.timestamp.toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
        
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
