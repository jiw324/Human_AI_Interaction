import React, { useState, useRef } from 'react';
import { type Conversation, conversationsAPI, authService } from '../services/api';
import { getDeviceId } from '../utils/deviceId';
import './ConversationHistory.css';

interface ConversationHistoryProps {
  conversations: Conversation[];
  onDeleteConversation: (conversationId: string) => void;
  onConversationsLoaded: (conversations: Conversation[]) => void;
}

const ConversationHistory: React.FC<ConversationHistoryProps> = ({
  conversations,
  onDeleteConversation,
  onConversationsLoaded
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const isLoadingRef = useRef(false); // Track if currently loading
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [, setIsLoadingMessages] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  // NO auto-load - only manual reload to prevent infinite loops

  const loadFromDatabase = async () => {
    if (isLoadingRef.current) {
      console.log('⏸️ Already loading, skipping...');
      return;
    }
    
    isLoadingRef.current = true;
    setIsLoading(true);
    
    try {
      // If logged in as admin, fetch ALL conversations
      // Otherwise, fetch only device-specific conversations
      const userId = authService.getUserId() ?? await getDeviceId();
      
      console.log('📡 Loading conversations from database for:', userId);
      const dbConversations = await conversationsAPI.getAll(userId);
      
      console.log('📦 [Frontend] Received from API:', dbConversations);
      console.log(`📊 [Frontend] Count: ${dbConversations?.length || 0}`);
      
      if (dbConversations && dbConversations.length > 0) {
        console.log(`✅ Loaded ${dbConversations.length} conversations from database`);
        console.log(`📋 [Frontend] Conversation IDs:`, dbConversations.map((c: any) => c.id));
        console.log(`📋 [Frontend] Conversation Titles:`, dbConversations.map((c: any) => c.title));
        onConversationsLoaded(dbConversations);
      } else {
        console.log('ℹ️ No conversations found in database');
        onConversationsLoaded([]); // Set empty array
      }
    } catch (error) {
      console.error('❌ Error loading conversations from database:', error);
      onConversationsLoaded([]); // Set empty array on error
    } finally {
      setIsLoading(false);
      isLoadingRef.current = false;
    }
  };

  const handleReloadFromDB = async () => {
    if (!isLoadingRef.current) {
      await loadFromDatabase();
    }
  };

  const handleConversationClick = async (conversation: Conversation) => {
    // If conversation only has 1 message (preview), fetch full conversation
    if (conversation.messages.length <= 1) {
      setIsLoadingMessages(true);
      try {
        const userId = authService.getUserId() ?? await getDeviceId();
        const fullConversation = await conversationsAPI.getOne(userId, conversation.id);
        
        if (fullConversation) {
          setSelectedConversation(fullConversation);
        } else {
          setSelectedConversation(conversation);
        }
      } catch (error) {
        console.error('❌ Error loading full conversation:', error);
        setSelectedConversation(conversation);
      } finally {
        setIsLoadingMessages(false);
      }
    } else {
      setSelectedConversation(conversation);
    }
  };

  // Helper: convert conversations (with messages) to CSV text
  const conversationsToCsv = (convs: Conversation[]): string => {
    const header = [
      'conversation_id',
      'title',
      'model_name',
      'model_personality',
      'sender',
      'timestamp',
      'text'
    ];

    const rows: string[] = [];
    const escape = (value: unknown) => JSON.stringify(value ?? '');

    rows.push(header.map(escape).join(','));

    convs.forEach(conv => {
      const modelName = conv.aiModel?.name || '';
      const modelPersonality = conv.aiModel?.personality || '';

      conv.messages.forEach(msg => {
        // Normalise text for CSV: strip leading whitespace/newlines (especially
        // for AI messages that often start with '\n\n') and collapse internal
        // newlines to single spaces so they don't break the CSV layout.
        let text = msg.text ?? '';
        text = text.replace(/^\s+/, '').replace(/\s*\n+\s*/g, ' ');

        rows.push([
          conv.id,
          conv.title,
          modelName,
          modelPersonality,
          msg.sender,
          (msg.timestamp instanceof Date ? msg.timestamp : new Date(msg.timestamp)).toISOString(),
          text
        ].map(escape).join(','));
      });
    });

    return rows.join('\r\n');
  };

  const exportConversation = async (conversation: Conversation) => {
    try {
      // Fetch full conversation with all messages from database
      const userId = authService.getUserId() ?? await getDeviceId();
      const fullConversation = await conversationsAPI.getOne(userId, conversation.id);
      
      if (!fullConversation) {
        console.error('❌ Failed to fetch full conversation for export');
        return;
      }

      const csv = conversationsToCsv([fullConversation]);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `conversation_${conversation.id}_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      console.log('✅ Conversation exported:', conversation.title);
    } catch (error) {
      console.error('❌ Error exporting conversation:', error);
    }
  };

  const exportAllConversations = async (conversationsToExport: Conversation[]) => {
    try {
      // Fetch all filtered conversations with full messages from database
      const userId = authService.getUserId() ?? await getDeviceId();
      const fullConversations = await Promise.all(
        conversationsToExport.map(conv => conversationsAPI.getOne(userId, conv.id))
      );
      
      // Filter out any null results
      const validConversations = fullConversations.filter(c => c !== null);

      if (validConversations.length === 0) {
        console.error('❌ No conversations to export');
        return;
      }

      const csv = conversationsToCsv(validConversations as Conversation[]);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `all_conversations_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      console.log(`✅ Exported ${validConversations.length} conversations`);
    } catch (error) {
      console.error('❌ Error exporting conversations:', error);
    }
  };

  const toggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    if (isSelectionMode) {
      // Clear selections when exiting selection mode
      setSelectedIds(new Set());
    }
  };

  const toggleConversationSelection = (convId: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(convId)) {
      newSelected.delete(convId);
    } else {
      newSelected.add(convId);
    }
    setSelectedIds(newSelected);
  };

  const selectAll = () => {
    const allIds = new Set(filteredConversations.map(c => c.id));
    setSelectedIds(allIds);
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  const exportSelected = async () => {
    if (selectedIds.size === 0) {
      return;
    }

    try {
      const userId = authService.getUserId() ?? await getDeviceId();
      
      // Get selected conversations
      const selectedConvs = conversations.filter(c => selectedIds.has(c.id));
      
      // Fetch full conversations with all messages
      const fullConversations = await Promise.all(
        selectedConvs.map(conv => conversationsAPI.getOne(userId, conv.id))
      );
      
      // Filter out any null results
      const validConversations = fullConversations.filter(c => c !== null);

      if (validConversations.length === 0) {
        console.error('❌ No valid conversations to export');
        return;
      }

      const csv = conversationsToCsv(validConversations as Conversation[]);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `selected_conversations_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      console.log(`✅ Exported ${validConversations.length} selected conversations`);
      
      // Exit selection mode after export
      setIsSelectionMode(false);
      setSelectedIds(new Set());
    } catch (error) {
      console.error('❌ Error exporting selected conversations:', error);
    }
  };

  const filteredConversations = conversations.filter(conv => {
    const search = searchTerm.toLowerCase();
    
    // Search in title, task name, personality
    const matchesBasic = 
      conv.title.toLowerCase().includes(search) ||
      conv.aiModel.name.toLowerCase().includes(search) ||
      (conv.aiModel.personality || '').toLowerCase().includes(search);
    
    // Search in conversation ID
    const matchesConvId = conv.id.toLowerCase().includes(search);
    
    // Search in message content
    const matchesMessages = conv.messages.some(msg => 
      msg.text.toLowerCase().includes(search)
    );
    
    return matchesBasic || matchesConvId || matchesMessages;
  });

  // Debug: Log what's being displayed
  console.log(`🖥️ [ConversationHistory] Displaying ${conversations.length} total conversations`);
  console.log(`🔍 [ConversationHistory] After filter: ${filteredConversations.length} conversations`);

  const formatDate = (date: Date) => {
    // Match ChatBox time format: HH:MM (local time)
    return date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="conversation-history">
      <div className="history-header">
        <h2>Conversation History</h2>
        <div className="header-actions">
          {!isSelectionMode ? (
            <>
              <button
                onClick={toggleSelectionMode}
                disabled={conversations.length === 0}
                className="select-mode-btn"
                title="Select multiple conversations"
              >
                ☑️ Select
              </button>
              <button
                onClick={handleReloadFromDB}
                disabled={isLoading}
                className="reload-btn"
                title="Reload from database"
              >
                {isLoading ? '⏳' : '🔄'} Reload
              </button>
              <button
                onClick={() => exportAllConversations(filteredConversations)}
                disabled={filteredConversations.length === 0}
                className="export-all-btn"
                title={searchTerm ? `Export ${filteredConversations.length} filtered conversations` : "Export all conversations"}
              >
                📥 Export All {searchTerm && `(${filteredConversations.length})`}
              </button>
            </>
          ) : (
            <>
              <span className="selection-count">{selectedIds.size} selected</span>
              <button
                onClick={selectAll}
                className="select-all-btn"
                title="Select all"
              >
                Select All
              </button>
              <button
                onClick={deselectAll}
                className="deselect-all-btn"
                title="Deselect all"
              >
                Clear
              </button>
              <button
                onClick={exportSelected}
                disabled={selectedIds.size === 0}
                className="export-selected-btn"
                title="Export selected conversations"
              >
                📥 Export ({selectedIds.size})
              </button>
              <button
                onClick={toggleSelectionMode}
                className="cancel-select-btn"
                title="Cancel selection"
              >
                ✕ Cancel
              </button>
            </>
          )}
        </div>
      </div>
      <div className="search-container">
        <input
          type="text"
          placeholder="Search by title, task, message content, or conversation ID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
      </div>

      <div className="conversations-list">
        {isLoading ? (
          <div className="empty-state">
            <div className="empty-icon">⏳</div>
            <h3>Loading conversations...</h3>
            <p>Fetching your conversation history from database</p>
          </div>
        ) : conversations.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🔄</div>
            <h3>Click "Reload" to load conversations</h3>
            <p>Your conversations are stored in the database. Click the Reload button above to fetch them.</p>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🔍</div>
            <h3>No matching conversations</h3>
            <p>Try adjusting your search term</p>
          </div>
        ) : (
          filteredConversations
            .sort((a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime())
            .map((conversation) => (
              <div 
                key={conversation.id} 
                className={`conversation-row ${isSelectionMode ? 'selection-mode' : ''} ${selectedIds.has(conversation.id) ? 'selected' : ''}`}
                onClick={() => isSelectionMode ? toggleConversationSelection(conversation.id) : handleConversationClick(conversation)}
              >
                {isSelectionMode && (
                  <input
                    type="checkbox"
                    className="conversation-checkbox"
                    checked={selectedIds.has(conversation.id)}
                    onChange={() => toggleConversationSelection(conversation.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                )}
                <span className="model-icon">{conversation.aiModel.icon}</span>
                <div className="conversation-info">
                  <span className="conversation-title">{conversation.title}</span>
                  <span className="conversation-task">{conversation.aiModel.name}</span>
                </div>
                <div className="conversation-stats">
                  <span className="message-count">
                    {conversation.messageCount ?? conversation.messages.length} msgs
                  </span>
                  <span className="last-activity" title={`Created: ${conversation.createdAt.toISOString()}\nLast: ${conversation.lastMessageAt.toISOString()}`}>
                    {formatDate(conversation.createdAt)}
                  </span>
                </div>
                {!isSelectionMode && (
                  <div className="conversation-actions" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => exportConversation(conversation)}
                      className="export-btn"
                      title="Export conversation"
                    >
                      💾
                    </button>
                    <button
                      onClick={() => onDeleteConversation(conversation.id)}
                      className="delete-btn"
                      title="Delete conversation"
                    >
                      🗑️
                    </button>
                  </div>
                )}
              </div>
            ))
        )}
      </div>

      {/* Modal for displaying conversation messages */}
      {selectedConversation && (
        <div className="modal-overlay" onClick={() => setSelectedConversation(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
                <div className="modal-title-section">
                <span className="modal-icon">{selectedConversation.aiModel.icon}</span>
                <div>
                  <h3>{selectedConversation.title}</h3>
                  <p className="modal-subtitle">
                    {selectedConversation.aiModel.name}
                  </p>
                </div>
              </div>
              <div className="modal-actions">
                <button 
                  className="modal-export-btn" 
                  onClick={() => exportConversation(selectedConversation)}
                  title="Export conversation"
                >
                  💾 Export
                </button>
                <button 
                  className="modal-close" 
                  onClick={() => setSelectedConversation(null)}
                  title="Close"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="modal-messages">
              {selectedConversation.messages.length === 0 ? (
                <div className="no-messages">No messages in this conversation</div>
              ) : (
                selectedConversation.messages.map((message, index) => (
                  <div 
                    key={message.id || index} 
                    className={`modal-message ${message.sender}`}
                  >
                    <div className="message-sender">
                      {message.sender === 'user' ? '👤 You' : '🤖 AI'}
                    </div>
                    <div className="message-text">{message.text}</div>
                    <div className="message-time">
                      {message.timestamp.toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConversationHistory;
