import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, '../data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const UPLOADS_DIR = path.resolve(__dirname, '../uploads');

// Ensure data and uploads directory exist safely (handles read-only filesystems on Vercel)
try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
} catch {
  // Read-only filesystem in serverless runtime
}
try {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
} catch {
  // Read-only filesystem in serverless runtime
}

// Initial seed data for pre-populating rich conversations & knowledge base
const DEFAULT_SYSTEM_PROMPT = `You are Shipplix AI, an intelligent, empathetic, and professional customer support agent for Shipplix Logistics & E-Commerce Delivery.
Your goal is to provide accurate, concise, and helpful answers to customer inquiries.
Always prioritize information from the Knowledge Base when available.
Keep your replies short (under 3 sentences when possible), professional, warm, and WhatsApp-friendly.
If you do not have enough information to answer definitively, politely offer to connect the customer with a human specialist.`;

const INITIAL_DATA = {
  settings: {
    geminiApiKey: process.env.GEMINI_API_KEY || '',
    geminiModel: process.env.GEMINI_MODEL || 'gemini-3.5-flash',
    systemPrompt: DEFAULT_SYSTEM_PROMPT,
    defaultMode: process.env.DEFAULT_MODE || 'ai',
    globalAutoPilot: true,
    whatsappPhoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
    whatsappWabaId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '',
    whatsappAccessToken: process.env.WHATSAPP_ACCESS_TOKEN || '',
    whatsappVerifyToken: process.env.WHATSAPP_VERIFY_TOKEN || 'shipplix_agent_webhook_verify_2026',
    supabaseUrl: process.env.SUPABASE_URL || '',
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || '',
    supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    featureLimits: {
      plan: 'Pro Tier (Active)',
      maxMonthlyMessages: 10000,
      usedMessagesThisMonth: 342,
      ragTopK: 3,
      ragSimilarityThreshold: 0.3,
      autoReplyDelayMs: 800,
      multimodalVision: true,
    }
  },
  chats: [
    {
      id: 'chat_1',
      phoneNumber: '+14155552671',
      name: 'Sarah Jenkins',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
      mode: 'ai', // 'ai' or 'human'
      lastMessage: 'Great, tracking number SPX-8921 is out for delivery today. Thank you!',
      lastMessageAt: new Date(Date.now() - 5 * 60000).toISOString(),
      unreadCount: 0,
      tags: ['Order Tracking', 'VIP'],
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    },
    {
      id: 'chat_2',
      phoneNumber: '+447911123456',
      name: 'Marcus Vance',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      mode: 'human', // Currently taken over by human admin
      lastMessage: 'Can you provide the bulk shipment pricing tier for over 500 packages per week?',
      lastMessageAt: new Date(Date.now() - 18 * 60000).toISOString(),
      unreadCount: 2,
      tags: ['Commercial', 'Pricing Request'],
      createdAt: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: 'chat_3',
      phoneNumber: '+16505559821',
      name: 'Elena Rostova',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      mode: 'ai',
      lastMessage: 'Does your express shipping service include weekend delivery in Brooklyn?',
      lastMessageAt: new Date(Date.now() - 42 * 60000).toISOString(),
      unreadCount: 1,
      tags: ['Express Delivery'],
      createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    },
    {
      id: 'chat_4',
      phoneNumber: '+491512345678',
      name: 'Lukas Meyer',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
      mode: 'ai',
      lastMessage: 'Invoice #SHP-2026-09 received. Thanks for the quick confirmation!',
      lastMessageAt: new Date(Date.now() - 120 * 60000).toISOString(),
      unreadCount: 0,
      tags: ['Billing'],
      createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    }
  ],
  messages: [
    // Messages for Sarah Jenkins (chat_1)
    {
      id: 'msg_1_1',
      chatId: 'chat_1',
      from: 'customer',
      senderName: 'Sarah Jenkins',
      type: 'text',
      content: 'Hi! Could you check where my package SPX-8921 is? It was supposed to arrive yesterday.',
      timestamp: new Date(Date.now() - 8 * 60000).toISOString(),
      status: 'read'
    },
    {
      id: 'msg_1_2',
      chatId: 'chat_1',
      from: 'ai',
      senderName: 'Shipplix AI',
      type: 'text',
      content: 'Hello Sarah! According to our live dispatch records, parcel SPX-8921 is with driver Dave and scheduled for delivery today before 4:30 PM. You will receive an SMS reminder 30 minutes prior.',
      timestamp: new Date(Date.now() - 7 * 60000).toISOString(),
      status: 'read',
      ragSources: ['Shipplix Express Delivery Policy & SLA', 'Real-Time Dispatch Rules'],
      tokensUsed: 42
    },
    {
      id: 'msg_1_3',
      chatId: 'chat_1',
      from: 'customer',
      senderName: 'Sarah Jenkins',
      type: 'text',
      content: 'Great, tracking number SPX-8921 is out for delivery today. Thank you!',
      timestamp: new Date(Date.now() - 5 * 60000).toISOString(),
      status: 'read'
    },
    // Messages for Marcus Vance (chat_2)
    {
      id: 'msg_2_1',
      chatId: 'chat_2',
      from: 'customer',
      senderName: 'Marcus Vance',
      type: 'text',
      content: 'Hello, we are an e-commerce brand dispatching ~600 orders weekly from London.',
      timestamp: new Date(Date.now() - 25 * 60000).toISOString(),
      status: 'read'
    },
    {
      id: 'msg_2_2',
      chatId: 'chat_2',
      from: 'customer',
      senderName: 'Marcus Vance',
      type: 'text',
      content: 'Can you provide the bulk shipment pricing tier for over 500 packages per week?',
      timestamp: new Date(Date.now() - 18 * 60000).toISOString(),
      status: 'delivered'
    },
    // Messages for Elena Rostova (chat_3)
    {
      id: 'msg_3_1',
      chatId: 'chat_3',
      from: 'customer',
      senderName: 'Elena Rostova',
      type: 'text',
      content: 'Does your express shipping service include weekend delivery in Brooklyn?',
      timestamp: new Date(Date.now() - 42 * 60000).toISOString(),
      status: 'delivered'
    }
  ],
  documents: [
    {
      id: 'doc_1',
      title: 'Shipplix Logistics FAQ & Service Guide.pdf',
      filename: 'shipplix_faq.pdf',
      fileType: 'application/pdf',
      size: 142800,
      chunkCount: 6,
      status: 'indexed',
      uploadedAt: new Date(Date.now() - 86400000 * 7).toISOString(),
      summary: 'Comprehensive SLA, delivery cutoffs, express rates, weekend coverage, and return policy for Shipplix customers.'
    },
    {
      id: 'doc_2',
      title: 'Commercial Volume Pricing & Enterprise SLA.txt',
      filename: 'enterprise_pricing.txt',
      fileType: 'text/plain',
      size: 38200,
      chunkCount: 4,
      status: 'indexed',
      uploadedAt: new Date(Date.now() - 86400000 * 4).toISOString(),
      summary: 'Tier 1 (50-200 parcels/wk: £4.20/ea), Tier 2 (200-500 parcels/wk: £3.45/ea), Enterprise (500+ parcels/wk: £2.85/ea + dedicated courier).'
    }
  ],
  chunks: [
    {
      id: 'chunk_1_1',
      documentId: 'doc_1',
      docTitle: 'Shipplix Logistics FAQ & Service Guide.pdf',
      chunkIndex: 0,
      content: 'Shipplix Standard Delivery operates Monday through Friday between 8:00 AM and 6:00 PM. Typical transit time is 1-3 business days within metropolitan zones. Tracking updates are sent automatically via WhatsApp and SMS at each hub scan.',
      tokenEstimate: 45
    },
    {
      id: 'chunk_1_2',
      documentId: 'doc_1',
      docTitle: 'Shipplix Logistics FAQ & Service Guide.pdf',
      chunkIndex: 1,
      content: 'Weekend & Express Coverage: Saturday and Sunday deliveries are available on Shipplix Express Plus tiers across all primary boroughs in New York City (including Brooklyn, Manhattan, Queens) and Greater London. Deliveries occur from 9:00 AM to 5:00 PM with direct recipient signature or secure porch drop.',
      tokenEstimate: 54
    },
    {
      id: 'chunk_1_3',
      documentId: 'doc_1',
      docTitle: 'Shipplix Logistics FAQ & Service Guide.pdf',
      chunkIndex: 2,
      content: 'Damaged or Missing Items & Return Policy: Customers can initiate an automated return within 14 days of delivery. Photos of damage can be sent directly to this WhatsApp number for instant automated inspection and replacement dispatch within 24 hours.',
      tokenEstimate: 49
    },
    {
      id: 'chunk_2_1',
      documentId: 'doc_2',
      docTitle: 'Commercial Volume Pricing & Enterprise SLA.txt',
      chunkIndex: 0,
      content: 'Commercial E-Commerce Volume Tiers: For businesses shipping over 500 parcels weekly, Enterprise Tier applies at £2.85 (or $3.60 USD) per standard domestic parcel under 2kg. Includes free daily scheduled warehouse pickups, direct API integration, and guaranteed next-day delivery.',
      tokenEstimate: 51
    },
    {
      id: 'chunk_2_2',
      documentId: 'doc_2',
      docTitle: 'Commercial Volume Pricing & Enterprise SLA.txt',
      chunkIndex: 1,
      content: 'Enterprise Account Manager: For companies sending more than 500 parcels per week, a dedicated Logistics Success Manager is assigned. Invoicing terms are NET-30 with weekly consolidated billing.',
      tokenEstimate: 38
    }
  ],
  webhookLogs: [
    {
      id: 'log_1',
      timestamp: new Date(Date.now() - 5 * 60000).toISOString(),
      direction: 'inbound',
      event: 'messages',
      sender: '+14155552671',
      type: 'text',
      details: 'Customer message received. AI Mode active -> Auto-replied via Gemini 2.5 Flash with RAG.'
    },
    {
      id: 'log_2',
      timestamp: new Date(Date.now() - 18 * 60000).toISOString(),
      direction: 'inbound',
      event: 'messages',
      sender: '+447911123456',
      type: 'text',
      details: 'Customer message received. Chat is in HUMAN mode -> Queued for manual agent response.'
    }
  ]
};

// Internal DB class
class Database {
  constructor() {
    this.data = this.load();
  }

  load() {
    try {
      const tmpFile = '/tmp/db.json';
      if (fs.existsSync(tmpFile)) {
        const raw = fs.readFileSync(tmpFile, 'utf-8');
        return JSON.parse(raw);
      }
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (err) {
      console.warn('Error reading db.json, falling back to memory state:', err.message);
    }
    return INITIAL_DATA;
  }

  save(data = this.data) {
    this.data = data;
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch {
      // In serverless / read-only environment like Vercel, try /tmp
      try {
        const tmpFile = '/tmp/db.json';
        fs.writeFileSync(tmpFile, JSON.stringify(this.data, null, 2), 'utf-8');
      } catch {
        // Fallback to in-memory state
      }
    }
  }

  // Settings: merge runtime process.env with stored settings
  getSettings() {
    const s = this.data.settings || {};
    return {
      ...s,
      geminiApiKey: process.env.GEMINI_API_KEY || s.geminiApiKey || '',
      geminiModel: process.env.GEMINI_MODEL || s.geminiModel || 'gemini-3.5-flash',
      whatsappPhoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || s.whatsappPhoneNumberId || '',
      whatsappWabaId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || s.whatsappWabaId || '',
      whatsappAccessToken: process.env.WHATSAPP_ACCESS_TOKEN || s.whatsappAccessToken || '',
      whatsappVerifyToken: process.env.WHATSAPP_VERIFY_TOKEN || s.whatsappVerifyToken || 'shipplix_agent_webhook_verify_2026',
      metaAppSecret: process.env.META_APP_SECRET || s.metaAppSecret || '',
      supabaseUrl: process.env.SUPABASE_URL || s.supabaseUrl || '',
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY || s.supabaseAnonKey || '',
      supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || s.supabaseServiceKey || ''
    };
  }

  updateSettings(partial) {
    this.data.settings = { ...this.data.settings, ...partial };
    this.save();
    return this.data.settings;
  }

  // Chats
  getChats() {
    return [...this.data.chats].sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt));
  }

  getChat(id) {
    return this.data.chats.find(c => c.id === id || c.phoneNumber === id);
  }

  findOrCreateChat(phoneNumber, name = 'WhatsApp User') {
    let chat = this.data.chats.find(c => c.phoneNumber === phoneNumber);
    if (!chat) {
      return this.createContact({ phoneNumber, name });
    }
    return chat;
  }

  createContact({ phoneNumber, name, mode = 'ai', tags = ['New Contact'] }) {
    const settings = this.getSettings();
    const defaultMode = settings.defaultMode || 'ai';
    const newChat = {
      id: 'chat_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      phoneNumber,
      name: name || phoneNumber,
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(phoneNumber)}`,
      mode: mode || defaultMode,
      lastMessage: '',
      lastMessageAt: new Date().toISOString(),
      unreadCount: 0,
      tags: Array.isArray(tags) && tags.length > 0 ? tags : ['New Contact'],
      createdAt: new Date().toISOString()
    };
    this.data.chats.unshift(newChat);
    this.save();

    // Sync to Supabase if connected
    try {
      const supabase = this.getSupabaseClient();
      if (supabase) {
        supabase.from('whatsapp_chats').insert([{
          id: newChat.id,
          phone_number: newChat.phoneNumber,
          name: newChat.name,
          avatar: newChat.avatar,
          mode: newChat.mode,
          last_message: newChat.lastMessage,
          unread_count: 0,
          tags: newChat.tags,
          created_at: newChat.createdAt
        }]).then(({ error }) => {
          if (error) console.warn('Supabase chat sync notice:', error.message);
        }).catch(e => console.warn('Supabase chat sync error:', e.message));
      }
    } catch (e) {
      console.warn('Supabase chat sync init error:', e.message);
    }

    return newChat;
  }

  updateChatMode(chatId, mode) {
    const chat = this.data.chats.find(c => c.id === chatId || c.phoneNumber === chatId);
    if (chat) {
      chat.mode = mode;
      this.save();
    }
    return chat;
  }

  // Messages
  getMessages(chatId) {
    return this.data.messages.filter(m => m.chatId === chatId).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  }

  addMessage(msg) {
    const newMsg = {
      id: msg.id || 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      timestamp: msg.timestamp || new Date().toISOString(),
      status: msg.status || 'sent',
      ...msg
    };
    this.data.messages.push(newMsg);

    // Update parent chat snippet
    const chat = this.data.chats.find(c => c.id === msg.chatId);
    if (chat) {
      chat.lastMessage = msg.type === 'text' ? msg.content : `[${msg.type.toUpperCase()}] ${msg.content || ''}`;
      chat.lastMessageAt = newMsg.timestamp;
      if (msg.from === 'customer') {
        chat.unreadCount = (chat.unreadCount || 0) + 1;
      }
    }

    this.save();
    return newMsg;
  }

  markChatAsRead(chatId) {
    const chat = this.data.chats.find(c => c.id === chatId);
    if (chat) {
      chat.unreadCount = 0;
      this.data.messages
        .filter(m => m.chatId === chatId && m.from === 'customer')
        .forEach(m => { m.status = 'read'; });
      this.save();
    }
    return chat;
  }

  // Documents & Chunks
  getDocuments() {
    return this.data.documents || [];
  }

  addDocument(doc, chunks = []) {
    this.data.documents.unshift(doc);
    if (chunks.length > 0) {
      this.data.chunks.push(...chunks);
    }
    this.save();
    return doc;
  }

  deleteDocument(docId) {
    this.data.documents = this.data.documents.filter(d => d.id !== docId);
    this.data.chunks = this.data.chunks.filter(c => c.documentId !== docId);
    this.save();
    return { success: true };
  }

  getChunks(docId = null) {
    if (docId) {
      return this.data.chunks.filter(c => c.documentId === docId);
    }
    return this.data.chunks || [];
  }

  // Webhook Logs
  addWebhookLog(log) {
    const item = {
      id: 'log_' + Date.now(),
      timestamp: new Date().toISOString(),
      ...log
    };
    this.data.webhookLogs.unshift(item);
    if (this.data.webhookLogs.length > 100) {
      this.data.webhookLogs.pop();
    }
    this.save();
    return item;
  }

  getWebhookLogs() {
    return this.data.webhookLogs || [];
  }

  // Supabase Client helper
  getSupabaseClient() {
    const settings = this.getSettings();
    const { supabaseUrl, supabaseAnonKey, supabaseServiceKey } = settings;
    const key = supabaseServiceKey || supabaseAnonKey;
    if (supabaseUrl && key) {
      try {
        return createClient(supabaseUrl, key);
      } catch (e) {
        console.error('Failed to initialize Supabase client:', e.message);
      }
    }
    return null;
  }
}

export const db = new Database();
