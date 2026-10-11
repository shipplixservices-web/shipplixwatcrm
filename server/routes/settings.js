import express from 'express';
import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';
import { db } from '../db.js';
import { broadcastEvent } from '../events.js';

const router = express.Router();

/**
 * Mask secret string for UI presentation
 */
function maskSecret(str) {
  if (!str || str.length < 8) return str ? '••••••••' : '';
  return str.slice(0, 4) + '••••••••' + str.slice(-4);
}

/**
 * GET /api/settings
 */
router.get('/', (req, res) => {
  const settings = db.getSettings();
  res.json({
    success: true,
    settings: {
      ...settings,
      geminiApiKeyMasked: maskSecret(settings.geminiApiKey),
      whatsappAccessTokenMasked: maskSecret(settings.whatsappAccessToken),
      supabaseAnonKeyMasked: maskSecret(settings.supabaseAnonKey),
      supabaseServiceKeyMasked: maskSecret(settings.supabaseServiceKey),
      hasGeminiKey: Boolean(settings.geminiApiKey),
      hasWhatsappKey: Boolean(settings.whatsappAccessToken && settings.whatsappPhoneNumberId),
      hasSupabaseKey: Boolean(settings.supabaseUrl && (settings.supabaseAnonKey || settings.supabaseServiceKey))
    }
  });
});

/**
 * POST /api/settings
 * Update settings
 */
router.post('/', (req, res) => {
  const updates = req.body;
  const current = db.getSettings();

  // If masked value sent back, preserve old secret
  const cleaned = { ...updates };
  if (cleaned.geminiApiKey && cleaned.geminiApiKey.includes('••••')) {
    delete cleaned.geminiApiKey;
  }
  if (cleaned.whatsappAccessToken && cleaned.whatsappAccessToken.includes('••••')) {
    delete cleaned.whatsappAccessToken;
  }
  if (cleaned.supabaseAnonKey && cleaned.supabaseAnonKey.includes('••••')) {
    delete cleaned.supabaseAnonKey;
  }
  if (cleaned.supabaseServiceKey && cleaned.supabaseServiceKey.includes('••••')) {
    delete cleaned.supabaseServiceKey;
  }

  const newSettings = db.updateSettings(cleaned);
  broadcastEvent('settings_updated', {
    defaultMode: newSettings.defaultMode,
    globalAutoPilot: newSettings.globalAutoPilot
  });

  res.json({
    success: true,
    settings: {
      ...newSettings,
      hasGeminiKey: Boolean(newSettings.geminiApiKey),
      hasWhatsappKey: Boolean(newSettings.whatsappAccessToken && newSettings.whatsappPhoneNumberId),
      hasSupabaseKey: Boolean(newSettings.supabaseUrl)
    }
  });
});

/**
 * POST /api/settings/test-gemini
 * Test Gemini API connectivity
 */
router.post('/test-gemini', async (req, res) => {
  const { apiKey, model } = req.body;
  const targetKey = apiKey || db.getSettings().geminiApiKey || process.env.GEMINI_API_KEY;
  const targetModel = model || db.getSettings().geminiModel || 'gemini-2.5-flash';

  if (!targetKey) {
    return res.status(400).json({ success: false, error: 'No Gemini API key provided' });
  }

  try {
    const ai = new GoogleGenAI({
      apiKey: targetKey.trim(),
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
    const startTime = Date.now();
    const result = await ai.models.generateContent({
      model: targetModel || 'gemini-3.8-flash',
      contents: 'Respond with "WhatsApp AI Agent Active" in exactly 4 words.'
    });
    const reply = (result.text || '').trim();
    const latency = Date.now() - startTime;

    res.json({
      success: true,
      message: 'Gemini API connection successful!',
      reply,
      model: targetModel,
      latencyMs: latency
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: `Gemini API test failed: ${err.message}`
    });
  }
});

/**
 * POST /api/settings/test-whatsapp
 * Test Meta WhatsApp Cloud API credentials
 */
router.post('/test-whatsapp', async (req, res) => {
  const { phoneNumberId, accessToken } = req.body;
  const targetPhoneId = phoneNumberId || db.getSettings().whatsappPhoneNumberId;
  const targetToken = accessToken || db.getSettings().whatsappAccessToken;

  if (!targetPhoneId || !targetToken) {
    return res.status(400).json({ success: false, error: 'Phone Number ID and Access Token are required.' });
  }

  try {
    const response = await fetch(`https://graph.facebook.com/v21.0/${targetPhoneId}?fields=verified_name,code_verification_status,display_phone_number,quality_rating`, {
      headers: { Authorization: `Bearer ${targetToken}` }
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(400).json({
        success: false,
        error: data.error?.message || 'Meta validation failed.'
      });
    }

    res.json({
      success: true,
      message: 'Meta WhatsApp Business credentials verified!',
      details: {
        verifiedName: data.verified_name || 'Configured WABA Phone',
        displayPhoneNumber: data.display_phone_number,
        qualityRating: data.quality_rating || 'GREEN'
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/settings/test-supabase
 * Test Supabase credentials
 */
router.post('/test-supabase', async (req, res) => {
  const { url, key } = req.body;
  const targetUrl = url || db.getSettings().supabaseUrl;
  const targetKey = key || db.getSettings().supabaseServiceKey || db.getSettings().supabaseAnonKey;

  if (!targetUrl || !targetKey) {
    return res.status(400).json({ success: false, error: 'Supabase URL and Key are required' });
  }

  try {
    const client = createClient(targetUrl, targetKey);
    // Simple ping check
    const { data, error } = await client.from('knowledge_documents').select('count', { count: 'exact', head: true });
    
    res.json({
      success: true,
      message: 'Supabase connection successful!',
      tablesReady: !error
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/settings/supabase-sql
 * Return PostgreSQL migration SQL for Supabase with pgvector
 */
router.get('/supabase-sql', (req, res) => {
  const sql = `-- WhatsApp AI Agent Supabase Database Schema
-- Run this in your Supabase SQL Editor:

-- 1. Enable pgvector extension (for vector RAG)
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. WhatsApp Chats Table
CREATE TABLE IF NOT EXISTS whatsapp_chats (
  id TEXT PRIMARY KEY,
  phone_number TEXT NOT NULL UNIQUE,
  name TEXT,
  avatar TEXT,
  mode TEXT DEFAULT 'ai' CHECK (mode IN ('ai', 'human')),
  last_message TEXT,
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  unread_count INT DEFAULT 0,
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. WhatsApp Messages Table
CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id TEXT PRIMARY KEY,
  chat_id TEXT REFERENCES whatsapp_chats(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('customer', 'ai', 'agent')),
  sender_name TEXT,
  message_type TEXT DEFAULT 'text',
  content TEXT,
  media_url TEXT,
  meta_message_id TEXT,
  status TEXT DEFAULT 'delivered',
  rag_sources TEXT[],
  tokens_used INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Knowledge Documents Table
CREATE TABLE IF NOT EXISTS knowledge_documents (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  file_type TEXT,
  size_bytes BIGINT,
  chunk_count INT DEFAULT 0,
  summary TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Knowledge Chunks Table (with optional vector embedding)
CREATE TABLE IF NOT EXISTS knowledge_chunks (
  id TEXT PRIMARY KEY,
  document_id TEXT REFERENCES knowledge_documents(id) ON DELETE CASCADE,
  doc_title TEXT,
  chunk_index INT,
  content TEXT NOT NULL,
  token_estimate INT,
  embedding vector(768), -- standard embedding dimension for Gemini text-embedding-004
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for speedy retrieval
CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON whatsapp_messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_chunks_document_id ON knowledge_chunks(document_id);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- Click "Run and enable RLS" when Supabase prompts you.
-- Your Node.js backend uses the SERVICE ROLE KEY which automatically
-- bypasses RLS. Browser anon clients are blocked by default.
-- ============================================================

ALTER TABLE whatsapp_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_chunks ENABLE ROW LEVEL SECURITY;

-- Service role: full unrestricted access (Node.js backend)
CREATE POLICY "service_role_all_chats"
  ON whatsapp_chats FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all_messages"
  ON whatsapp_messages FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all_documents"
  ON knowledge_documents FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all_chunks"
  ON knowledge_chunks FOR ALL TO service_role USING (true) WITH CHECK (true);
`;

  res.type('text/plain').send(sql);
});

export default router;
