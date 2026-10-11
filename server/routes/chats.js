import express from 'express';
import { db } from '../db.js';
import { sendMetaWhatsAppMessage } from '../whatsapp.js';
import { generateGeminiResponse } from '../gemini.js';
import { broadcastEvent } from '../events.js';

const router = express.Router();

/**
 * GET /api/chats
 * List all active WhatsApp conversations
 */
router.get('/', (req, res) => {
  const chats = db.getChats();
  res.json({ success: true, chats });
});

/**
 * POST /api/chats
 * Create and add a new WhatsApp contact
 */
router.post('/', async (req, res) => {
  const { phoneNumber, name, mode = 'ai', tags = ['New Contact'], initialMessage = '' } = req.body;

  if (!phoneNumber || !phoneNumber.trim()) {
    return res.status(400).json({ success: false, error: 'Phone number is required' });
  }

  // Format phone number (ensure standard E.164 + prefix)
  let cleanNumber = phoneNumber.trim().replace(/[^\d+]/g, '');
  if (!cleanNumber.startsWith('+')) {
    cleanNumber = '+' + cleanNumber;
  }

  if (cleanNumber.length < 8) {
    return res.status(400).json({ success: false, error: 'Please enter a valid phone number with country code (e.g. +14155552671)' });
  }

  // Check if contact already exists
  const existingChat = db.getChats().find(c => c.phoneNumber === cleanNumber);
  if (existingChat) {
    return res.status(409).json({
      success: false,
      error: `Contact with phone number ${cleanNumber} already exists.`,
      chat: existingChat
    });
  }

  // Process tags
  const parsedTags = Array.isArray(tags)
    ? tags
    : typeof tags === 'string'
      ? tags.split(',').map(t => t.trim()).filter(Boolean)
      : ['New Contact'];

  // Create contact in database
  const chat = db.createContact({
    phoneNumber: cleanNumber,
    name: name?.trim() || cleanNumber,
    mode: mode === 'human' ? 'human' : 'ai',
    tags: parsedTags.length > 0 ? parsedTags : ['New Contact']
  });

  // Optional: dispatch initial outbound WhatsApp message
  let initialMsgRecord = null;
  if (initialMessage && initialMessage.trim()) {
    const sendResult = await sendMetaWhatsAppMessage({
      to: cleanNumber,
      type: 'text',
      text: initialMessage.trim()
    });

    initialMsgRecord = db.addMessage({
      chatId: chat.id,
      from: 'agent',
      senderName: 'Support Agent (Admin)',
      type: 'text',
      content: initialMessage.trim(),
      metaMessageId: sendResult.messageId,
      status: sendResult.success ? 'delivered' : 'sent'
    });
  }

  broadcastEvent('chat_updated', chat);
  if (initialMsgRecord) {
    broadcastEvent('new_message', initialMsgRecord);
  }

  res.status(201).json({
    success: true,
    chat: db.getChat(chat.id),
    initialMessage: initialMsgRecord
  });
});

/**
 * GET /api/chats/:id
 * Retrieve chat details and all messages
 */
router.get('/:id', (req, res) => {
  const { id } = req.params;
  const chat = db.getChat(id);
  if (!chat) {
    return res.status(404).json({ success: false, error: 'Chat not found' });
  }
  const messages = db.getMessages(chat.id);
  res.json({ success: true, chat, messages });
});

/**
 * POST /api/chats/:id/messages
 * Send a manual message from Human Admin panel
 */
router.post('/:id/messages', async (req, res) => {
  const { id } = req.params;
  const { content, type = 'text', mediaUrl, mediaName } = req.body;

  const chat = db.getChat(id);
  if (!chat) {
    return res.status(404).json({ success: false, error: 'Chat not found' });
  }

  if (!content && !mediaUrl) {
    return res.status(400).json({ success: false, error: 'Message content is required' });
  }

  // Dispatch via official Meta WhatsApp Cloud API
  const sendResult = await sendMetaWhatsAppMessage({
    to: chat.phoneNumber,
    type,
    text: content,
    mediaUrl,
    mediaName
  });

  // Save admin message to DB
  const savedMsg = db.addMessage({
    chatId: chat.id,
    from: 'agent',
    senderName: 'Support Agent (Admin)',
    type,
    content,
    mediaUrl,
    mediaName,
    metaMessageId: sendResult.messageId,
    status: sendResult.success ? 'delivered' : 'failed'
  });

  // Mark incoming messages as read
  db.markChatAsRead(chat.id);

  broadcastEvent('new_message', savedMsg);
  broadcastEvent('chat_updated', db.getChat(chat.id));

  res.json({ success: true, message: savedMsg, sendResult });
});

/**
 * PATCH /api/chats/:id/mode
 * Switch chat mode between 'ai' and 'human'
 */
router.patch('/:id/mode', (req, res) => {
  const { id } = req.params;
  const { mode } = req.body;

  if (mode !== 'ai' && mode !== 'human') {
    return res.status(400).json({ success: false, error: 'Mode must be "ai" or "human"' });
  }

  const updatedChat = db.updateChatMode(id, mode);
  if (!updatedChat) {
    return res.status(404).json({ success: false, error: 'Chat not found' });
  }

  broadcastEvent('chat_mode_changed', { chatId: updatedChat.id, mode });
  broadcastEvent('chat_updated', updatedChat);

  res.json({ success: true, chat: updatedChat });
});

/**
 * POST /api/chats/:id/suggest-reply
 * AI Copilot: Generate an AI reply with RAG for human agent to review/edit
 */
router.post('/:id/suggest-reply', async (req, res) => {
  const { id } = req.params;
  const chat = db.getChat(id);
  if (!chat) {
    return res.status(404).json({ success: false, error: 'Chat not found' });
  }

  const messages = db.getMessages(chat.id);
  const lastCustomerMsg = [...messages].reverse().find(m => m.from === 'customer');

  const aiSuggestion = await generateGeminiResponse({
    chatId: chat.id,
    customerMessage: lastCustomerMsg?.content || 'Hello, how can you help me today?'
  });

  res.json({
    success: true,
    suggestion: aiSuggestion.text,
    ragSources: aiSuggestion.ragSources,
    modelUsed: aiSuggestion.modelUsed
  });
});

/**
 * POST /api/chats/:id/read
 * Mark chat messages as read
 */
router.post('/:id/read', (req, res) => {
  const { id } = req.params;
  const chat = db.markChatAsRead(id);
  if (chat) {
    broadcastEvent('chat_updated', chat);
    return res.json({ success: true, chat });
  }
  res.status(404).json({ success: false, error: 'Chat not found' });
});

/**
 * DELETE /api/chats/:id
 * Delete a conversation
 */
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const chat = db.getChat(id);
  if (!chat) return res.status(404).json({ success: false, error: 'Not found' });

  db.data.chats = db.data.chats.filter(c => c.id !== chat.id);
  db.data.messages = db.data.messages.filter(m => m.chatId !== chat.id);
  db.save();

  broadcastEvent('chat_deleted', { chatId: chat.id });
  res.json({ success: true });
});

export default router;
