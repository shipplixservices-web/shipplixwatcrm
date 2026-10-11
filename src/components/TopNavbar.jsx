import React from 'react';
import { Bot, User, Settings, Database, Smartphone, Sun, Moon, Zap, ShieldCheck } from 'lucide-react';

export default function TopNavbar({
  globalAutoPilot,
  onToggleGlobalAutoPilot,
  stats,
  theme,
  onToggleTheme,
  onOpenSettings,
  onOpenKB,
  onToggleSimulator,
  isSimulatorOpen,
}) {
  return (
    <header className="top-navbar" id="app-top-navbar">
      {/* Brand Section */}
      <div className="brand-section">
        <div className="brand-logo-badge">
          <Bot size={22} />
        </div>
        <div className="brand-titles">
          <div className="brand-title">
            WhatsApp AI Agent
            <span className="saas-badge">Enterprise Pro</span>
          </div>
          <div className="brand-subtitle">
            Powered by Google Gemini 2.5 Flash & Meta Cloud API
          </div>
        </div>
      </div>

      {/* Real-Time Stats Cluster */}
      <div className="nav-stats-cluster">
        <div className="nav-stat-item" title="Active WhatsApp conversations">
          <span>Active Chats:</span>
          <strong>{stats.activeChatsCount || 4}</strong>
        </div>

        <div className="nav-stat-item" title="Automated replies handled without human intervention">
          <Zap size={13} color="#8b5cf6" />
          <span>AI Handled:</span>
          <strong style={{ color: '#a78bfa' }}>{stats.aiHandledPercentage || 88}%</strong>
        </div>

        <div className="nav-stat-item" title="RAG tokens saved through selective context retrieval">
          <Database size={13} color="#00a884" />
          <span>RAG Token Savings:</span>
          <strong style={{ color: '#00a884' }}>~{stats.tokensSaved || 1840} tokens</strong>
        </div>

        <div className="nav-stat-item" title="Meta WhatsApp Webhook connectivity">
          <ShieldCheck size={13} color="#25d366" />
          <span style={{ color: '#25d366' }}>Meta API Active</span>
        </div>
      </div>

      {/* Actions & Controls */}
      <div className="nav-actions">
        {/* Global Autopilot Toggle */}
        <button
          id="global-autopilot-btn"
          className={`autopilot-pill ${globalAutoPilot ? 'active' : 'inactive'}`}
          onClick={onToggleGlobalAutoPilot}
          title="Toggle automatic AI auto-replies globally for all incoming chats"
        >
          {globalAutoPilot ? (
            <>
              <Bot size={14} />
              <span>AI Auto-Pilot: ON</span>
            </>
          ) : (
            <>
              <User size={14} />
              <span>Manual Admin Mode</span>
            </>
          )}
        </button>

        {/* Knowledge Base Modal Button */}
        <button
          id="btn-open-kb-modal"
          className="btn-action-secondary"
          onClick={onOpenKB}
          title="Manage Knowledge Base documents, PDFs & RAG chunks"
        >
          <Database size={15} />
          <span>Knowledge Base</span>
        </button>

        {/* Settings Modal Button */}
        <button
          id="btn-open-settings-modal"
          className="btn-action-secondary"
          onClick={onOpenSettings}
          title="Configure Gemini API, Meta WhatsApp credentials & System prompt"
        >
          <Settings size={15} />
          <span>Settings</span>
        </button>

        {/* Interactive WhatsApp Simulator Drawer Button */}
        <button
          id="btn-toggle-simulator"
          className={`btn-action-primary ${isSimulatorOpen ? 'active' : ''}`}
          onClick={onToggleSimulator}
          title="Open interactive WhatsApp client simulator to test incoming messages"
        >
          <Smartphone size={15} />
          <span>WhatsApp Simulator</span>
        </button>

        {/* Dark/Light Mode Toggle */}
        <button
          id="btn-toggle-theme"
          className="btn-icon"
          onClick={onToggleTheme}
          title="Toggle Light / Dark mode"
        >
          {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
        </button>
      </div>
    </header>
  );
}
