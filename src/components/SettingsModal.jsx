import React, { useState } from 'react';
import {
  Settings,
  Cpu,
  Share2,
  Database,
  Sliders,
  CheckCircle,
  AlertCircle,
  Copy,
  Eye,
  EyeOff,
  ExternalLink,
  X
} from 'lucide-react';

export default function SettingsModal({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
}) {
  const [activeTab, setActiveTab] = useState('ai'); // 'ai' | 'whatsapp' | 'supabase' | 'saas'
  const [formData, setFormData] = useState({ ...settings });
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [showWaToken, setShowWaToken] = useState(false);
  const [showSupabaseKey, setShowSupabaseKey] = useState(false);

  // Live test statuses
  const [geminiTestStatus, setGeminiTestStatus] = useState(null);
  const [isTestingGemini, setIsTestingGemini] = useState(false);

  const [waTestStatus, setWaTestStatus] = useState(null);
  const [isTestingWa, setIsTestingWa] = useState(false);

  const [supabaseTestStatus, setSupabaseTestStatus] = useState(null);
  const [isTestingSupabase, setIsTestingSupabase] = useState(false);

  const [copiedField, setCopiedField] = useState(null);

  if (!isOpen) return null;

  const handleCopy = (text, fieldName) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Test Gemini
  const handleTestGemini = async () => {
    setIsTestingGemini(true);
    setGeminiTestStatus(null);
    try {
      const res = await fetch('/api/settings/test-gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: formData.geminiApiKey,
          model: formData.geminiModel,
        }),
      });
      const data = await res.json();
      setGeminiTestStatus(data);
    } catch (e) {
      setGeminiTestStatus({ success: false, error: e.message });
    } finally {
      setIsTestingGemini(false);
    }
  };

  // Test Meta WhatsApp API
  const handleTestWhatsApp = async () => {
    setIsTestingWa(true);
    setWaTestStatus(null);
    try {
      const res = await fetch('/api/settings/test-whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumberId: formData.whatsappPhoneNumberId,
          accessToken: formData.whatsappAccessToken,
        }),
      });
      const data = await res.json();
      setWaTestStatus(data);
    } catch (e) {
      setWaTestStatus({ success: false, error: e.message });
    } finally {
      setIsTestingWa(false);
    }
  };

  // Test Supabase
  const handleTestSupabase = async () => {
    setIsTestingSupabase(true);
    setSupabaseTestStatus(null);
    try {
      const res = await fetch('/api/settings/test-supabase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: formData.supabaseUrl,
          key: formData.supabaseServiceKey || formData.supabaseAnonKey,
        }),
      });
      const data = await res.json();
      setSupabaseTestStatus(data);
    } catch (e) {
      setSupabaseTestStatus({ success: false, error: e.message });
    } finally {
      setIsTestingSupabase(false);
    }
  };

  // Copy Supabase SQL
  const handleCopySupabaseSQL = async () => {
    try {
      const res = await fetch('/api/settings/supabase-sql');
      const sql = await res.text();
      handleCopy(sql, 'supabase-sql');
    } catch (e) {
      console.error(e);
    }
  };

  const handleSave = () => {
    onSaveSettings(formData);
    onClose();
  };

  const currentOrigin = window.location.origin;
  const webhookUrl = `${currentOrigin}/api/webhook`;

  return (
    <div className="modal-backdrop-scrim" onClick={onClose}>
      <div className="modal-dialog-container" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <header className="modal-dialog-header">
          <div className="modal-dialog-title">
            <Settings size={20} color="#00a884" />
            <span>Settings & Integration Controls</span>
          </div>
          <button className="btn-icon" onClick={onClose}>
            <X size={16} />
          </button>
        </header>

        {/* Tab navigation */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', padding: '0 24px', background: 'var(--bg-elevated)', gap: 8 }}>
          <button
            id="tab-settings-ai"
            className={`filter-pill ${activeTab === 'ai' ? 'active' : ''}`}
            style={{ borderRadius: '6px 6px 0 0', borderBottom: 'none', padding: '10px 16px' }}
            onClick={() => setActiveTab('ai')}
          >
            <Cpu size={14} style={{ marginRight: 6 }} />
            AI & Gemini 2.5 Flash
          </button>
          <button
            id="tab-settings-whatsapp"
            className={`filter-pill ${activeTab === 'whatsapp' ? 'active' : ''}`}
            style={{ borderRadius: '6px 6px 0 0', borderBottom: 'none', padding: '10px 16px' }}
            onClick={() => setActiveTab('whatsapp')}
          >
            <Share2 size={14} style={{ marginRight: 6 }} />
            Meta WhatsApp API
          </button>
          <button
            id="tab-settings-supabase"
            className={`filter-pill ${activeTab === 'supabase' ? 'active' : ''}`}
            style={{ borderRadius: '6px 6px 0 0', borderBottom: 'none', padding: '10px 16px' }}
            onClick={() => setActiveTab('supabase')}
          >
            <Database size={14} style={{ marginRight: 6 }} />
            Supabase Database
          </button>
          <button
            id="tab-settings-saas"
            className={`filter-pill ${activeTab === 'saas' ? 'active' : ''}`}
            style={{ borderRadius: '6px 6px 0 0', borderBottom: 'none', padding: '10px 16px' }}
            onClick={() => setActiveTab('saas')}
          >
            <Sliders size={14} style={{ marginRight: 6 }} />
            SaaS Plan & Defaults
          </button>
        </div>

        {/* Body */}
        <div className="modal-dialog-body">
          {/* TAB 1: AI & Gemini */}
          {activeTab === 'ai' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {/* System Prompt */}
              <div className="form-field-group">
                <label className="form-label">
                  <span>System Prompt (Global Instructions)</span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Defines tone, brand personality & constraints</span>
                </label>
                <textarea
                  id="settings-system-prompt"
                  className="form-textarea"
                  rows={5}
                  value={formData.systemPrompt || ''}
                  onChange={(e) => setFormData({ ...formData, systemPrompt: e.target.value })}
                  placeholder="You are Shipplix AI, an intelligent customer support agent..."
                />
              </div>

              {/* Gemini Model */}
              <div className="form-field-group">
                <label className="form-label">
                  <span>Gemini Model</span>
                </label>
                <select
                  id="settings-gemini-model"
                  className="form-input-text"
                  value={formData.geminiModel || 'gemini-2.5-flash'}
                  onChange={(e) => setFormData({ ...formData, geminiModel: e.target.value })}
                >
                  <option value="gemini-2.5-flash">Google Gemini 2.5 Flash (Recommended - Fastest & Smartest)</option>
                  <option value="gemini-1.5-flash">Google Gemini 1.5 Flash (High Context)</option>
                  <option value="gemini-2.0-flash">Google Gemini 2.0 Flash (Experimental)</option>
                </select>
              </div>

              {/* Gemini API Key */}
              <div className="form-field-group">
                <label className="form-label">
                  <span>Google Gemini API Key</span>
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noreferrer"
                    style={{ fontSize: '11px', color: '#00a884', display: 'flex', alignItems: 'center', gap: 4 }}
                  >
                    Get Free Gemini Key <ExternalLink size={11} />
                  </a>
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    id="settings-gemini-key"
                    type={showGeminiKey ? 'text' : 'password'}
                    className="form-input-text"
                    style={{ flex: 1 }}
                    placeholder="AIzaSy..."
                    value={formData.geminiApiKey || ''}
                    onChange={(e) => setFormData({ ...formData, geminiApiKey: e.target.value })}
                  />
                  <button
                    type="button"
                    className="btn-icon"
                    onClick={() => setShowGeminiKey(!showGeminiKey)}
                  >
                    {showGeminiKey ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                  <button
                    id="btn-test-gemini-api"
                    type="button"
                    className="btn-action-secondary"
                    onClick={handleTestGemini}
                    disabled={isTestingGemini}
                  >
                    {isTestingGemini ? 'Testing...' : 'Test Gemini'}
                  </button>
                </div>
                <span className="form-help-hint">
                  Stored securely in .env / local store. If empty, the app runs in demonstration mode with live RAG.
                </span>

                {geminiTestStatus && (
                  <div
                    style={{
                      marginTop: 8,
                      padding: '10px 14px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      background: geminiTestStatus.success ? 'rgba(37, 211, 102, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                      border: `1px solid ${geminiTestStatus.success ? '#25d366' : '#ef4444'}`,
                      color: geminiTestStatus.success ? '#25d366' : '#ef4444',
                    }}
                  >
                    {geminiTestStatus.success ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
                    <span>
                      {geminiTestStatus.success
                        ? `Connected! Latency: ${geminiTestStatus.latencyMs}ms. Response: "${geminiTestStatus.reply}"`
                        : geminiTestStatus.error}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: Meta WhatsApp API */}
          {activeTab === 'whatsapp' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {/* Webhook Callback Info Box */}
              <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '14px', fontSize: '12px' }}>
                <div style={{ fontWeight: 700, color: 'var(--text-main)', marginBottom: 8 }}>
                  Meta WhatsApp Webhook Configuration Guide:
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Callback URL:</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <code style={{ background: 'var(--bg-input)', padding: '2px 8px', borderRadius: '4px', color: '#53bdeb' }}>
                        {webhookUrl}
                      </code>
                      <button
                        className="btn-icon"
                        style={{ width: '24px', height: '24px' }}
                        onClick={() => handleCopy(webhookUrl, 'webhook-url')}
                        title="Copy Webhook URL"
                      >
                        <Copy size={12} />
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Verify Token:</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <code style={{ background: 'var(--bg-input)', padding: '2px 8px', borderRadius: '4px', color: '#25d366' }}>
                        {formData.whatsappVerifyToken || 'shipplix_agent_webhook_verify_2026'}
                      </code>
                      <button
                        className="btn-icon"
                        style={{ width: '24px', height: '24px' }}
                        onClick={() => handleCopy(formData.whatsappVerifyToken, 'verify-token')}
                        title="Copy Verify Token"
                      >
                        <Copy size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Phone Number ID */}
              <div className="form-field-group">
                <label className="form-label">WhatsApp Phone Number ID</label>
                <input
                  id="settings-wa-phone-id"
                  type="text"
                  className="form-input-text"
                  placeholder="e.g. 100609346426084"
                  value={formData.whatsappPhoneNumberId || ''}
                  onChange={(e) => setFormData({ ...formData, whatsappPhoneNumberId: e.target.value })}
                />
              </div>

              {/* WABA ID */}
              <div className="form-field-group">
                <label className="form-label">WhatsApp Business Account ID (WABA ID)</label>
                <input
                  id="settings-wa-waba-id"
                  type="text"
                  className="form-input-text"
                  placeholder="e.g. 108920485918204"
                  value={formData.whatsappWabaId || ''}
                  onChange={(e) => setFormData({ ...formData, whatsappWabaId: e.target.value })}
                />
              </div>

              {/* Access Token */}
              <div className="form-field-group">
                <label className="form-label">
                  <span>Meta System User Access Token</span>
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    id="settings-wa-token"
                    type={showWaToken ? 'text' : 'password'}
                    className="form-input-text"
                    style={{ flex: 1 }}
                    placeholder="EAABwz..."
                    value={formData.whatsappAccessToken || ''}
                    onChange={(e) => setFormData({ ...formData, whatsappAccessToken: e.target.value })}
                  />
                  <button
                    type="button"
                    className="btn-icon"
                    onClick={() => setShowWaToken(!showWaToken)}
                  >
                    {showWaToken ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                  <button
                    id="btn-test-wa-api"
                    type="button"
                    className="btn-action-secondary"
                    onClick={handleTestWhatsApp}
                    disabled={isTestingWa}
                  >
                    {isTestingWa ? 'Testing...' : 'Test Meta API'}
                  </button>
                </div>

                {waTestStatus && (
                  <div
                    style={{
                      marginTop: 8,
                      padding: '10px 14px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      background: waTestStatus.success ? 'rgba(37, 211, 102, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                      border: `1px solid ${waTestStatus.success ? '#25d366' : '#ef4444'}`,
                      color: waTestStatus.success ? '#25d366' : '#ef4444',
                    }}
                  >
                    {waTestStatus.success ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
                    <span>
                      {waTestStatus.success
                        ? `Verified! Phone: ${waTestStatus.details?.displayPhoneNumber} (${waTestStatus.details?.verifiedName})`
                        : waTestStatus.error}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: Supabase Database */}
          {activeTab === 'supabase' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div>
                <h4 style={{ fontSize: '14px', fontWeight: 700, marginBottom: 4 }}>
                  Supabase PostgreSQL & Vector Database
                </h4>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Stores WhatsApp chats, messages, Knowledge Base documents, and vector embeddings.
                </p>
              </div>

              {/* Supabase URL */}
              <div className="form-field-group">
                <label className="form-label">Supabase Project URL</label>
                <input
                  id="settings-supabase-url"
                  type="text"
                  className="form-input-text"
                  placeholder="https://xyzcompany.supabase.co"
                  value={formData.supabaseUrl || ''}
                  onChange={(e) => setFormData({ ...formData, supabaseUrl: e.target.value })}
                />
              </div>

              {/* Anon or Service Key */}
              <div className="form-field-group">
                <label className="form-label">Supabase Service Role / Anon Key</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    id="settings-supabase-key"
                    type={showSupabaseKey ? 'text' : 'password'}
                    className="form-input-text"
                    style={{ flex: 1 }}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
                    value={formData.supabaseServiceKey || formData.supabaseAnonKey || ''}
                    onChange={(e) => setFormData({ ...formData, supabaseServiceKey: e.target.value })}
                  />
                  <button
                    type="button"
                    className="btn-icon"
                    onClick={() => setShowSupabaseKey(!showSupabaseKey)}
                  >
                    {showSupabaseKey ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                  <button
                    id="btn-test-supabase"
                    type="button"
                    className="btn-action-secondary"
                    onClick={handleTestSupabase}
                    disabled={isTestingSupabase}
                  >
                    {isTestingSupabase ? 'Testing...' : 'Test Connection'}
                  </button>
                </div>

                {supabaseTestStatus && (
                  <div
                    style={{
                      marginTop: 8,
                      padding: '10px 14px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      background: supabaseTestStatus.success ? 'rgba(37, 211, 102, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                      border: `1px solid ${supabaseTestStatus.success ? '#25d366' : '#ef4444'}`,
                      color: supabaseTestStatus.success ? '#25d366' : '#ef4444',
                    }}
                  >
                    {supabaseTestStatus.success ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
                    <span>{supabaseTestStatus.success ? supabaseTestStatus.message : supabaseTestStatus.error}</span>
                  </div>
                )}
              </div>

              {/* 1-Click Copy Supabase Schema */}
              <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: '13px', fontWeight: 600 }}>Supabase SQL Schema (with pgvector)</span>
                  <button
                    id="btn-copy-supabase-sql"
                    className="btn-action-secondary"
                    style={{ padding: '4px 10px', fontSize: '11px' }}
                    onClick={handleCopySupabaseSQL}
                  >
                    <Copy size={12} style={{ marginRight: 4 }} />
                    {copiedField === 'supabase-sql' ? 'Copied to Clipboard!' : 'Copy Schema SQL'}
                  </button>
                </div>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Creates <code>whatsapp_chats</code>, <code>whatsapp_messages</code>, <code>knowledge_documents</code>, and <code>knowledge_chunks</code> with <code>vector(768)</code> embeddings.
                </p>
              </div>
            </div>
          )}

          {/* TAB 4: SaaS Plan & Defaults */}
          {activeTab === 'saas' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {/* Default Mode for Incoming contacts */}
              <div className="form-field-group">
                <label className="form-label">Default Mode for New WhatsApp Contacts</label>
                <select
                  id="settings-default-mode"
                  className="form-input-text"
                  value={formData.defaultMode || 'ai'}
                  onChange={(e) => setFormData({ ...formData, defaultMode: e.target.value })}
                >
                  <option value="ai">🤖 AI Auto-Pilot Mode (Automatically respond via Gemini)</option>
                  <option value="human">👤 Human Supervised Mode (Requires agent reply)</option>
                </select>
              </div>

              {/* RAG Top-K */}
              <div className="form-field-group">
                <label className="form-label">
                  <span>RAG Context Chunks to Retrieve</span>
                  <span style={{ color: 'var(--text-muted)' }}>Top {formData.featureLimits?.ragTopK || 3} Chunks</span>
                </label>
                <input
                  type="range"
                  min="1"
                  max="6"
                  value={formData.featureLimits?.ragTopK || 3}
                  onChange={(e) => setFormData({
                    ...formData,
                    featureLimits: { ...formData.featureLimits, ragTopK: Number(e.target.value) }
                  })}
                />
              </div>

              {/* Auto Reply Delay */}
              <div className="form-field-group">
                <label className="form-label">
                  <span>Simulated Agent Typing Pacing</span>
                  <span style={{ color: 'var(--text-muted)' }}>{formData.featureLimits?.autoReplyDelayMs || 800}ms</span>
                </label>
                <input
                  type="range"
                  min="200"
                  max="2000"
                  step="100"
                  value={formData.featureLimits?.autoReplyDelayMs || 800}
                  onChange={(e) => setFormData({
                    ...formData,
                    featureLimits: { ...formData.featureLimits, autoReplyDelayMs: Number(e.target.value) }
                  })}
                />
              </div>

              {/* SaaS Plan Tier info */}
              <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: '13px', fontWeight: 700 }}>Current Subscription Tier:</span>
                  <span className="saas-badge">Enterprise Pro</span>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Message Quota: <strong>342 / 10,000 monthly messages used</strong> (3.4%)
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="modal-dialog-footer">
          <button className="btn-action-secondary" onClick={onClose}>
            Cancel
          </button>
          <button id="btn-save-settings" className="btn-action-primary" onClick={handleSave}>
            Save Changes
          </button>
        </footer>
      </div>
    </div>
  );
}
