import React, { useState, useEffect, useRef } from 'react';
import {
  Bot,
  User,
  Send,
  Sparkles,
  Paperclip,
  Image as ImageIcon,
  FileText,
  CheckCheck,
  Check,
  Database,
  ExternalLink,
  ShieldAlert,
  AlertCircle,
  Download,
  UserPlus
} from 'lucide-react';

export default function ChatViewport({
  chat,
  messages,
  onSendMessage,
  onToggleChatMode,
  onSuggestReply,
  aiSuggestion,
  isLoadingSuggestion,
  isSending,
  onOpenAddContact,
  onQuickSimulateNewChat
}) {
  const [inputText, setInputText] = useState('');
  const [attachmentType, setAttachmentType] = useState('none'); // 'none' | 'image' | 'document'
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle send message
  const handleSend = (e) => {
    e?.preventDefault();
    if (!inputText.trim() && attachmentType === 'none') return;

    let mediaUrl = null;
    let mediaName = null;
    let type = 'text';

    if (attachmentType === 'image') {
      type = 'image';
      mediaUrl = 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=600';
      mediaName = 'package_inspection.jpg';
    } else if (attachmentType === 'document') {
      type = 'document';
      mediaUrl = '/uploads/sample_shipping_label.pdf';
      mediaName = 'Shipplix_Customs_Declaration.pdf';
    }

    onSendMessage({
      content: inputText.trim(),
      type,
      mediaUrl,
      mediaName
    });

    setInputText('');
    setAttachmentType('none');
  };

  const handleUseSuggestion = (suggestionText) => {
    setInputText(suggestionText);
  };

  const formatMessageTime = (isoString) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  if (!chat) {
    return (
      <main className="main-chat-viewport" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', maxWidth: 420, padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border-color)' }}>
            <Bot size={32} style={{ color: 'var(--wa-primary)' }} />
          </div>
          <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-main)' }}>No conversation selected</h3>
          <p style={{ fontSize: '13px', lineHeight: 1.5 }}>
            Choose an existing customer from the left sidebar, add a new WhatsApp contact, or simulate an inbound customer message.
          </p>
          <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
            <button
              id="empty-state-add-contact-btn"
              className="btn-action-primary"
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px' }}
              onClick={onOpenAddContact}
            >
              <UserPlus size={15} />
              <span>Add New Contact</span>
            </button>
            <button
              id="empty-state-simulate-btn"
              className="btn-action-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px' }}
              onClick={onQuickSimulateNewChat}
            >
              <Sparkles size={15} color="#a78bfa" />
              <span>Simulate Chat</span>
            </button>
          </div>
        </div>
      </main>
    );
  }

  const isAiMode = chat.mode === 'ai';

  return (
    <main className="main-chat-viewport" id="active-chat-viewport">
      <div className="chat-wallpaper-overlay" />

      {/* Header */}
      <header className="active-chat-header" id="chat-header">
        <div className="active-contact-info">
          <img
            src={chat.avatar}
            alt={chat.name}
            className="header-avatar"
            onError={(e) => {
              e.target.src = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(chat.phoneNumber)}`;
            }}
          />
          <div className="header-meta">
            <h2>
              {chat.name}
              {chat.tags && chat.tags.map((tag, i) => (
                <span key={i} style={{ fontSize: '10px', background: 'var(--bg-elevated)', padding: '2px 6px', borderRadius: '4px', fontWeight: 500, color: 'var(--text-muted)' }}>
                  {tag}
                </span>
              ))}
            </h2>
            <span>{chat.phoneNumber} • {isAiMode ? '🤖 AI Auto-Pilot Handling' : '👤 Human Agent Override'}</span>
          </div>
        </div>

        {/* Mode Toggle Switch per chat */}
        <div className="chat-header-actions">
          <div className="mode-toggle-switch" title="Toggle between Human Agent and AI Auto-Pilot for this conversation">
            <button
              id={`toggle-chat-ai-${chat.id}`}
              className={`mode-toggle-btn ${isAiMode ? 'active ai' : ''}`}
              onClick={() => onToggleChatMode(chat.id, 'ai')}
            >
              <Bot size={13} />
              <span>AI Mode</span>
            </button>
            <button
              id={`toggle-chat-human-${chat.id}`}
              className={`mode-toggle-btn ${!isAiMode ? 'active human' : ''}`}
              onClick={() => onToggleChatMode(chat.id, 'human')}
            >
              <User size={13} />
              <span>Human Mode</span>
            </button>
          </div>
        </div>
      </header>

      {/* Messages Canvas */}
      <div className="messages-flow-area" id="messages-container">
        {(() => {
          // Deduplicate messages by id to prevent duplicate React keys
          const seen = new Set();
          const uniqueMessages = [];
          for (const msg of messages) {
            const key = msg.id || `${msg.timestamp}_${msg.content}`;
            if (!seen.has(key)) {
              seen.add(key);
              uniqueMessages.push(msg);
            }
          }

          return uniqueMessages.map((msg, index) => {
            const isCustomer = msg.from === 'customer';
            const isAi = msg.from === 'ai';
            const isAgent = msg.from === 'agent';
            const isFailed = msg.status === 'failed';

            return (
              <div
                key={msg.id ? `msg_${msg.id}` : `msg_idx_${index}`}
                className={`msg-bubble-row ${isCustomer ? 'from-customer' : isAi ? 'from-ai' : 'from-agent'}`}
              >
                <div className="msg-bubble-card">
                  {/* Author tag */}
                  {!isCustomer && (
                    <div className={`msg-author-header ${isAi ? 'ai' : 'agent'}`}>
                      {isAi ? <Bot size={12} /> : <User size={12} />}
                      <span>{isAi ? 'Shipplix AI Assistant' : 'Human Support Agent'}</span>
                    </div>
                  )}

                  {/* Image Attachment */}
                  {msg.type === 'image' && msg.mediaUrl && (
                    <div>
                      <img
                        src={msg.mediaUrl}
                        alt={msg.mediaName || 'WhatsApp attachment'}
                        className="msg-media-image"
                        onClick={() => window.open(msg.mediaUrl, '_blank')}
                      />
                    </div>
                  )}

                  {/* Document Attachment */}
                  {msg.type === 'document' && (
                    <div className="msg-media-doc">
                      <FileText size={22} color="#00a884" />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {msg.mediaName || 'Document.pdf'}
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>PDF Document</div>
                      </div>
                      {msg.mediaUrl && (
                        <a href={msg.mediaUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--text-main)' }}>
                          <Download size={14} />
                        </a>
                      )}
                    </div>
                  )}

                  {/* Message Content */}
                  <div className="msg-text-content">{msg.content}</div>

                  {/* Error banner if delivery failed */}
                  {isFailed && msg.errorMessage && (
                    <div
                      style={{
                        marginTop: 4,
                        padding: '4px 8px',
                        borderRadius: '4px',
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        fontSize: '11px',
                        color: '#ef4444',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4
                      }}
                      title={msg.errorMessage}
                    >
                      <AlertCircle size={12} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {msg.errorMessage.length > 70 ? msg.errorMessage.slice(0, 70) + '...' : msg.errorMessage}
                      </span>
                    </div>
                  )}

                  {/* RAG Context Sources Tag */}
                  {isAi && msg.ragSources && msg.ragSources.length > 0 && (
                    <div className="rag-sources-pill" title="Knowledge Base chunks retrieved via RAG for this answer">
                      <Database size={11} />
                      <span>RAG: {msg.ragSources.join(', ')}</span>
                    </div>
                  )}

                  {/* Footer Timestamp & Status */}
                  <div className="msg-meta-footer">
                    <span>{formatMessageTime(msg.timestamp)}</span>
                    {!isCustomer && (
                      <span
                        className={isFailed ? 'ticks-red' : 'ticks-blue'}
                        title={isFailed ? `Failed: ${msg.errorMessage || 'Meta delivery error'}` : msg.status}
                        style={{ color: isFailed ? '#ef4444' : undefined }}
                      >
                        {isFailed ? (
                          <AlertCircle size={13} />
                        ) : msg.status === 'read' ? (
                          <CheckCheck size={14} />
                        ) : (
                          <Check size={14} />
                        )}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          });
        })()}
        <div ref={messagesEndRef} />
      </div>

      {/* AI Suggestion Bar (Copilot) */}
      {!isAiMode && (
        <div className="ai-copilot-banner">
          <div className="ai-copilot-text">
            <Sparkles size={16} color="#8b5cf6" />
            <span>
              {aiSuggestion ? (
                <>AI Suggested Reply: "<em>{aiSuggestion}</em>"</>
              ) : (
                'Human Mode Active. Jump in or ask AI Copilot to draft a response.'
              )}
            </span>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            {aiSuggestion && (
              <button
                id="btn-use-ai-suggestion"
                className="btn-action-primary"
                style={{ padding: '4px 10px', fontSize: '11px', background: 'var(--ai-purple)' }}
                onClick={() => handleUseSuggestion(aiSuggestion)}
              >
                Use Draft
              </button>
            )}
            <button
              id="btn-suggest-ai-reply"
              className="btn-action-secondary"
              style={{ padding: '4px 10px', fontSize: '11px' }}
              onClick={onSuggestReply}
              disabled={isLoadingSuggestion}
            >
              {isLoadingSuggestion ? 'Retrieving RAG...' : 'Suggest Reply'}
            </button>
          </div>
        </div>
      )}

      {/* Input Composer */}
      <footer className="chat-input-bar-wrapper">
        {isAiMode && (
          <div className="ai-mode-active-hint">
            <span>🤖 AI Mode Active — Incoming WhatsApp messages will receive automated replies via Gemini 2.5 Flash.</span>
            <button
              style={{ background: 'transparent', border: 'none', color: '#f59e0b', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
              onClick={() => onToggleChatMode(chat.id, 'human')}
            >
              Take Over as Human
            </button>
          </div>
        )}

        {attachmentType !== 'none' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--bg-elevated)', padding: '6px 12px', borderRadius: '6px', fontSize: '12px' }}>
            <span>Attached sample: <strong>{attachmentType === 'image' ? 'Package Photo (Image)' : 'Customs Declaration (PDF)'}</strong></span>
            <button
              style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', marginLeft: 'auto' }}
              onClick={() => setAttachmentType('none')}
            >
              ✕ Remove
            </button>
          </div>
        )}

        <form onSubmit={handleSend} className="input-controls-row">
          {/* Sample Attachment Selector */}
          <button
            type="button"
            className="btn-icon"
            title="Attach sample image"
            onClick={() => setAttachmentType(prev => prev === 'image' ? 'none' : 'image')}
          >
            <ImageIcon size={16} color={attachmentType === 'image' ? '#00a884' : undefined} />
          </button>

          <button
            type="button"
            className="btn-icon"
            title="Attach sample document PDF"
            onClick={() => setAttachmentType(prev => prev === 'document' ? 'none' : 'document')}
          >
            <Paperclip size={16} color={attachmentType === 'document' ? '#00a884' : undefined} />
          </button>

          {/* Text Input */}
          <input
            id="message-text-input"
            type="text"
            className="message-composer-input"
            placeholder={isAiMode ? "Type to reply manually or test override..." : "Type your message to customer..."}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
          />

          {/* Send Button */}
          <button
            id="btn-send-message"
            type="submit"
            className="btn-action-primary"
            style={{ width: '42px', height: '42px', padding: 0, justifyContent: 'center' }}
            disabled={isSending}
          >
            <Send size={16} />
          </button>
        </form>
      </footer>
    </main>
  );
}
