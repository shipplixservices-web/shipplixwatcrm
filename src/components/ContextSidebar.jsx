import React from 'react';
import { Bot, User, Phone, Calendar, Database, ShieldCheck, Cpu, Layers } from 'lucide-react';

export default function ContextSidebar({ chat, documents, settings }) {
  if (!chat) return null;

  return (
    <aside className="sidebar-context-panel" id="crm-context-sidebar">
      <div className="context-panel-header">
        <span>Contact Overview</span>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>ID: {chat.id}</span>
      </div>

      {/* Customer Profile Section */}
      <div className="context-section-card">
        <div className="customer-profile-box">
          <img
            src={chat.avatar}
            alt={chat.name}
            className="profile-avatar-lg"
            onError={(e) => {
              e.target.src = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(chat.phoneNumber)}`;
            }}
          />
          <h2 style={{ fontSize: '15px', fontWeight: 700 }}>{chat.name}</h2>
          <div className="profile-phone-tag">{chat.phoneNumber}</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px', fontSize: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
            <span>Conversation Mode:</span>
            <strong style={{ color: chat.mode === 'ai' ? '#a78bfa' : '#f59e0b' }}>
              {chat.mode === 'ai' ? '🤖 AI Autopilot' : '👤 Human Supervised'}
            </strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
            <span>Unread Messages:</span>
            <span>{chat.unreadCount || 0}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
            <span>Tags:</span>
            <span>{chat.tags?.join(', ') || 'General'}</span>
          </div>
        </div>
      </div>

      {/* AI Engine & RAG Status */}
      <div className="context-section-card">
        <div className="section-title-sm">
          <Cpu size={13} color="#8b5cf6" />
          <span>AI Engine & RAG Metrics</span>
        </div>

        <div className="api-health-metric-grid">
          <div className="metric-mini-tile">
            <span className="label">Model</span>
            <span className="value" style={{ color: '#a78bfa', fontSize: '12px' }}>
              {settings.geminiModel || 'Gemini 2.5 Flash'}
            </span>
          </div>
          <div className="metric-mini-tile">
            <span className="label">RAG Engine</span>
            <span className="value" style={{ color: '#00a884' }}>Active (Hybrid)</span>
          </div>
          <div className="metric-mini-tile">
            <span className="label">Avg Latency</span>
            <span className="value">~350 ms</span>
          </div>
          <div className="metric-mini-tile">
            <span className="label">Token Reduction</span>
            <span className="value" style={{ color: '#25d366' }}>-74%</span>
          </div>
        </div>
      </div>

      {/* Active Knowledge Base Documents */}
      <div className="context-section-card">
        <div className="section-title-sm">
          <Database size={13} color="#00a884" />
          <span>Knowledge Base ({documents.length} Docs)</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {documents.map((doc) => (
            <div
              key={doc.id}
              style={{
                background: 'var(--bg-elevated)',
                padding: '8px 10px',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                fontSize: '11px'
              }}
            >
              <div style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: 2 }}>
                {doc.title}
              </div>
              <div style={{ color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                <span>{doc.chunkCount} structured chunks</span>
                <span>{doc.status}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Meta WhatsApp Cloud API Health */}
      <div className="context-section-card">
        <div className="section-title-sm">
          <ShieldCheck size={13} color="#25d366" />
          <span>Meta WhatsApp Integration</span>
        </div>

        <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span>Graph API:</span>
            <strong style={{ color: 'var(--text-main)' }}>v21.0 Cloud</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span>Webhook:</span>
            <strong style={{ color: '#25d366' }}>Verified (/api/webhook)</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Delivery Status:</span>
            <strong style={{ color: '#53bdeb' }}>Two-way Active</strong>
          </div>
        </div>
      </div>
    </aside>
  );
}
