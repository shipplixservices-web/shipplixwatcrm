import React, { useState } from 'react';
import { Search, Bot, User, PlusCircle, CheckCheck } from 'lucide-react';

export default function ChatSidebar({
  chats,
  selectedChatId,
  onSelectChat,
  onQuickSimulateNewChat
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'ai' | 'human' | 'unread'

  const filteredChats = chats.filter(chat => {
    // Filter by search query
    const matchQuery =
      chat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      chat.phoneNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (chat.lastMessage && chat.lastMessage.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchQuery) return false;

    // Filter by tab
    if (activeFilter === 'ai') return chat.mode === 'ai';
    if (activeFilter === 'human') return chat.mode === 'human';
    if (activeFilter === 'unread') return (chat.unreadCount || 0) > 0;
    return true;
  });

  const formatTime = (isoString) => {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <aside className="sidebar-chat-list" id="crm-chat-sidebar">
      {/* Header with Search and Filters */}
      <div className="sidebar-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h1 style={{ fontSize: '15px', fontWeight: 700 }}>WhatsApp Messages</h1>
          <button
            id="btn-simulate-new-chat"
            className="btn-icon"
            style={{ width: '28px', height: '28px' }}
            title="Simulate a new incoming WhatsApp customer"
            onClick={onQuickSimulateNewChat}
          >
            <PlusCircle size={15} />
          </button>
        </div>

        {/* Search Bar */}
        <div className="search-input-box">
          <Search size={15} />
          <input
            id="chat-search-input"
            type="text"
            placeholder="Search contacts, numbers or messages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Filter Pills */}
        <div className="filter-pills-row">
          <button
            id="filter-all-btn"
            className={`filter-pill ${activeFilter === 'all' ? 'active' : ''}`}
            onClick={() => setActiveFilter('all')}
          >
            All ({chats.length})
          </button>
          <button
            id="filter-ai-btn"
            className={`filter-pill ${activeFilter === 'ai' ? 'active' : ''}`}
            onClick={() => setActiveFilter('ai')}
          >
            🤖 AI Mode ({chats.filter(c => c.mode === 'ai').length})
          </button>
          <button
            id="filter-human-btn"
            className={`filter-pill ${activeFilter === 'human' ? 'active' : ''}`}
            onClick={() => setActiveFilter('human')}
          >
            👤 Human ({chats.filter(c => c.mode === 'human').length})
          </button>
          <button
            id="filter-unread-btn"
            className={`filter-pill ${activeFilter === 'unread' ? 'active' : ''}`}
            onClick={() => setActiveFilter('unread')}
          >
            Unread ({chats.filter(c => (c.unreadCount || 0) > 0).length})
          </button>
        </div>
      </div>

      {/* Scrollable Conversation List */}
      <div className="chats-scrollable-container" id="chats-list-container">
        {filteredChats.length === 0 ? (
          <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
            No conversations match your filter.
          </div>
        ) : (
          filteredChats.map((chat) => {
            const isSelected = chat.id === selectedChatId;
            return (
              <div
                key={chat.id}
                id={`chat-item-${chat.id}`}
                className={`chat-card-item ${isSelected ? 'selected' : ''}`}
                onClick={() => onSelectChat(chat.id)}
              >
                {/* Contact Avatar with Mode Indicator */}
                <div className="chat-avatar-wrapper">
                  <img
                    src={chat.avatar}
                    alt={chat.name}
                    className="chat-avatar-img"
                    onError={(e) => {
                      e.target.src = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(chat.phoneNumber)}`;
                    }}
                  />
                  <div className={`mode-badge-indicator ${chat.mode}`}>
                    {chat.mode === 'ai' ? <Bot size={10} /> : <User size={10} />}
                  </div>
                </div>

                {/* Chat Details */}
                <div className="chat-details-col">
                  <div className="chat-title-row">
                    <span className="chat-contact-name">{chat.name}</span>
                    <span className="chat-timestamp">{formatTime(chat.lastMessageAt)}</span>
                  </div>

                  <div className="chat-snippet-row">
                    <span className="chat-last-snippet">
                      {chat.lastMessage || 'No messages yet'}
                    </span>

                    {chat.unreadCount > 0 && (
                      <span className="chat-unread-badge">
                        {chat.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
