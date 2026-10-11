import express from 'express';
import { db } from '../db.js';
import { generateGeminiResponse } from '../gemini.js';
import { broadcastEvent } from '../events.js';

const router = express.Router();

/**
 * POST /api/simulator/send
 * Simulate an incoming customer WhatsApp message
 */
router.post('/send', async (req, res) => {
  const {
    phoneNumber = '+14155552671',
    customerName = 'Sarah Jenkins',
    text = 'Hello, what are your delivery hours?',
    type = 'text', // 'text', 'image', 'document'
    mediaUrl = null,
    mediaName = null,
    mediaBase64 = null,
    mediaMimeType = null
  } = req.body;

  try {
    // 1. Find or create the chat
    const chat = db.findOrCreateChat(phoneNumber, customerName);

    // 2. Save incoming customer message
    const incomingMsg = db.addMessage({
      chatId: chat.id,
      from: 'customer',
      senderName: customerName,
      type,
      content: text,
      mediaUrl,
      mediaName,
      status: 'read'
    });

    db.addWebhookLog({
      direction: 'inbound',
      event: 'simulated_incoming_message',
      sender: phoneNumber,
      type,
      details: `[Simulated] "${text}" from ${customerName}`
    });

    broadcastEvent('new_message', incomingMsg);
    broadcastEvent('chat_updated', db.getChat(chat.id));

    // 3. Check chat mode
    const settings = db.getSettings();
    const isAiMode = chat.mode === 'ai' && settings.globalAutoPilot !== false;

    let aiMsg = null;
    let aiResponse = null;

    if (isAiMode) {
      // Simulate brief network / typing delay for realism
      const delay = Math.min(settings.featureLimits?.autoReplyDelayMs || 500, 1500);
      await new Promise(r => setTimeout(r, delay));

      // Call Gemini 2.5 Flash with RAG
      aiResponse = await generateGeminiResponse({
        chatId: chat.id,
        customerMessage: text,
        mediaBase64,
        mediaMimeType,
        mediaType: type,
        mediaName
      });

      aiMsg = db.addMessage({
        chatId: chat.id,
        from: 'ai',
        senderName: 'Shipplix AI',
        type: 'text',
        content: aiResponse.text,
        status: 'delivered',
        ragSources: aiResponse.ragSources || [],
        tokensSaved: aiResponse.tokensSaved || 0,
        modelUsed: aiResponse.modelUsed
      });

      db.addWebhookLog({
        direction: 'outbound',
        event: 'simulated_ai_response',
        sender: 'Shipplix AI Agent',
        recipient: phoneNumber,
        type: 'text',
        details: `[Auto-replied] "${aiResponse.text.slice(0, 80)}..." (Model: ${aiResponse.modelUsed})`
      });

      broadcastEvent('new_message', aiMsg);
      broadcastEvent('chat_updated', db.getChat(chat.id));
    }

    res.json({
      success: true,
      chat: db.getChat(chat.id),
      incomingMessage: incomingMsg,
      aiMessage: aiMsg,
      isAiMode,
      aiResponse
    });
  } catch (err) {
    console.error('Simulator error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/simulator/logs
 * Retrieve recent webhook and dispatch event logs
 */
router.get('/logs', (req, res) => {
  const logs = db.getWebhookLogs();
  res.json({ success: true, logs });
});

/**
 * POST /api/simulator/logs/clear
 * Clear event logs
 */
router.post('/logs/clear', (req, res) => {
  db.data.webhookLogs = [];
  db.save();
  res.json({ success: true });
});

export default router;
