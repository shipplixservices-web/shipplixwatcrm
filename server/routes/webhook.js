import express from 'express';
import { db } from '../db.js';
import { verifyWebhookRequest, sendMetaWhatsAppMessage, fetchMetaMediaBinary } from '../whatsapp.js';
import { generateGeminiResponse } from '../gemini.js';
import { broadcastEvent } from '../events.js';

const router = express.Router();

/**
 * GET /api/webhook
 * Meta WhatsApp Cloud API verification handshake
 */
router.get('/', (req, res) => {
  const result = verifyWebhookRequest(req);
  if (result.verified) {
    return res.status(200).send(result.challenge);
  }
  return res.status(403).send('Verification failed');
});

/**
 * POST /api/webhook
 * Incoming messages and status events from Meta WhatsApp Cloud API
 */
router.post('/', async (req, res) => {
  const body = req.body;

  // Immediate 200 OK response required by Meta
  res.status(200).json({ status: 'received' });

  // Process payload asynchronously
  try {
    const entry = body?.entry?.[0];
    const change = entry?.changes?.[0]?.value;

    if (!change) return;

    // 1. Handle Message Status updates (sent, delivered, read)
    if (change.statuses && change.statuses.length > 0) {
      for (const statusObj of change.statuses) {
        db.addWebhookLog({
          direction: 'inbound',
          event: 'status_update',
          details: `Message ${statusObj.id} status changed to: ${statusObj.status}`
        });
        broadcastEvent('message_status', statusObj);
      }
    }

    // 2. Handle Incoming Messages
    if (change.messages && change.messages.length > 0) {
      const contact = change.contacts?.[0];
      const customerName = contact?.profile?.name || 'WhatsApp Contact';

      for (const msg of change.messages) {
        const senderPhone = '+' + msg.from;
        const chat = db.findOrCreateChat(senderPhone, customerName);

        let msgType = msg.type || 'text';
        let content = '';
        let mediaUrl = null;
        let mediaName = null;
        let mediaBase64 = null;
        let mediaMimeType = null;

        if (msgType === 'text') {
          content = msg.text?.body || '';
        } else if (msgType === 'image') {
          content = msg.image?.caption || 'Photo message';
          mediaName = 'image.jpg';
          if (msg.image?.id) {
            try {
              const mediaData = await fetchMetaMediaBinary(msg.image.id);
              mediaBase64 = mediaData.base64;
              mediaMimeType = mediaData.mimeType;
            } catch (err) {
              console.warn('Could not download image from Meta:', err.message);
            }
          }
        } else if (msgType === 'document') {
          content = msg.document?.caption || `Document: ${msg.document?.filename || 'document.pdf'}`;
          mediaName = msg.document?.filename || 'document.pdf';
          if (msg.document?.id) {
            try {
              const mediaData = await fetchMetaMediaBinary(msg.document.id);
              mediaBase64 = mediaData.base64;
              mediaMimeType = mediaData.mimeType;
            } catch (err) {
              console.warn('Could not download doc from Meta:', err.message);
            }
          }
        }

        // Store customer message in database
        const savedCustomerMsg = db.addMessage({
          chatId: chat.id,
          from: 'customer',
          senderName: customerName,
          type: msgType,
          content,
          mediaUrl,
          mediaName,
          metaMessageId: msg.id,
          status: 'read'
        });

        db.addWebhookLog({
          direction: 'inbound',
          event: 'message_received',
          sender: senderPhone,
          type: msgType,
          details: `"${content}" from ${customerName}`
        });

        broadcastEvent('new_message', savedCustomerMsg);
        broadcastEvent('chat_updated', db.getChat(chat.id));

        // 3. AI Mode or Human Mode Decision
        const settings = db.getSettings();
        const isAiMode = chat.mode === 'ai' && settings.globalAutoPilot !== false;

        if (isAiMode) {
          // Trigger automatic AI reply via Gemini 2.5 Flash + RAG
          const aiResponse = await generateGeminiResponse({
            chatId: chat.id,
            customerMessage: content,
            mediaBase64,
            mediaMimeType,
            mediaType: msgType,
            mediaName
          });

          // Send outbound message back to customer via Meta Cloud API
          const sendResult = await sendMetaWhatsAppMessage({
            to: senderPhone,
            type: 'text',
            text: aiResponse.text
          });

          // Save AI response to DB
          const savedAiMsg = db.addMessage({
            chatId: chat.id,
            from: 'ai',
            senderName: 'Shipplix AI',
            type: 'text',
            content: aiResponse.text,
            metaMessageId: sendResult.messageId,
            status: sendResult.success ? 'delivered' : 'failed',
            ragSources: aiResponse.ragSources || [],
            tokensSaved: aiResponse.tokensSaved || 0,
            modelUsed: aiResponse.modelUsed
          });

          broadcastEvent('new_message', savedAiMsg);
          broadcastEvent('chat_updated', db.getChat(chat.id));
        } else {
          // In Human mode, notify that an agent is needed
          broadcastEvent('human_takeover_pending', {
            chatId: chat.id,
            customerName,
            phoneNumber: senderPhone
          });
        }
      }
    }
  } catch (err) {
    console.error('Error handling webhook payload:', err);
    db.addWebhookLog({
      direction: 'inbound',
      event: 'error',
      details: err.message
    });
  }
});

export default router;
