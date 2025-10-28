import React, { useState, useEffect } from 'react';
import './ConversationHistory.css';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
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

interface ConversationHistoryProps {
  conversations: Conversation[];
  onLoadConversation: (conversation: Conversation) => void;
  onDeleteConversation: (conversationId: string) => void;
}

const ConversationHistory: React.FC<ConversationHistoryProps> = ({
  conversations,
  onLoadConversation,
  onDeleteConversation
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredConversations = conversations.filter(conv =>
    conv.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.aiModel.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.aiModel.personality.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const getConversationPreview = (messages: Message[]) => {
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage) return 'No messages';
    
    const preview = lastMessage.text.length > 50 
      ? lastMessage.text.substring(0, 50) + '...'
      : lastMessage.text;
    
    return `${lastMessage.sender === 'user' ? 'You: ' : 'AI: '}${preview}`;
  };

  return (
    <div className="conversation-history">
      <div className="history-header">
        <h2>Conversation History</h2>
        <div className="search-container">
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      <div className="conversations-list">
        {filteredConversations.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">💬</div>
            <h3>No conversations yet</h3>
            <p>Start chatting to see your conversation history here!</p>
          </div>
        ) : (
          filteredConversations
            .sort((a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime())
            .map((conversation) => (
              <div key={conversation.id} className="conversation-item">
                <div className="conversation-header">
                  <div className="ai-model-info">
                    <span className="model-icon">{conversation.aiModel.icon}</span>
                    <div className="model-details">
                      <h4>{conversation.title}</h4>
                      <span className="model-name">{conversation.aiModel.name} • {conversation.aiModel.personality}</span>
                    </div>
                  </div>
                  <div className="conversation-actions">
                    <button
                      onClick={() => onLoadConversation(conversation)}
                      className="load-btn"
                      title="Load conversation"
                    >
                      📂
                    </button>
                    <button
                      onClick={() => onDeleteConversation(conversation.id)}
                      className="delete-btn"
                      title="Delete conversation"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
                
                <div className="conversation-preview">
                  <p>{getConversationPreview(conversation.messages)}</p>
                </div>
                
                <div className="conversation-meta">
                  <span className="message-count">
                    {conversation.messages.length} messages
                  </span>
                  <span className="last-activity">
                    {formatDate(conversation.lastMessageAt)}
                  </span>
                </div>
              </div>
            ))
        )}
      </div>
    </div>
  );
};

export default ConversationHistory;
