import express from 'express';
import crypto from 'crypto';
import { db } from '../db.js';
import { verifyWebhookRequest, sendMetaWhatsAppMessage, fetchMetaMediaBinary } from '../whatsapp.js';
import { generateGeminiResponse } from '../gemini.js';
import { broadcastEvent } from '../events.js';

const router = express.Router();

/**
 * Verify the X-Hub-Signature-256 HMAC header that Meta attaches to every webhook POST.
 * Returns true if valid or if META_APP_SECRET is not configured (dev mode).
 */
function verifyMetaSignature(rawBody, signatureHeader) {
  const appSecret = process.env.META_APP_SECRET || db.getSettings().metaAppSecret;
  if (!appSecret) {
    // No secret configured — skip verification (dev/demo mode)
    return true;
  }
  if (!signatureHeader) {
    console.warn('[Webhook] Missing X-Hub-Signature-256 header — rejecting request.');
    return false;
  }

  const expected = 'sha256=' + crypto
    .createHmac('sha256', appSecret)
    .update(rawBody)
    .digest('hex');

  // Constant-time comparison to prevent timing attacks
  try {
    if (expected.length !== signatureHeader.length) return false;
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signatureHeader));
  } catch {
    return false;
  }
}

/**
 * Handle Meta Webhook Verification (GET /api/webhook)
 */
function handleWebhookVerification(req, res) {
  const result = verifyWebhookRequest(req);
  if (result.verified) {
    // Return exact challenge string as plain text HTTP 200 (no quotes, no JSON wrapper)
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.status(200).send(String(result.challenge));
  }
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  return res.status(403).send(result.reason || 'Verification failed');
}

router.get('/', handleWebhookVerification);
router.get('', handleWebhookVerification);

/**
 * Handle Meta Webhook Events (POST /api/webhook)
 */
async function handleWebhookEvent(req, res) {
  // 1. Verify Meta payload signature (X-Hub-Signature-256)
  const rawBody = req.rawBody ? req.rawBody : Buffer.from(JSON.stringify(req.body));
  const signature = req.headers['x-hub-signature-256'];
  if (!verifyMetaSignature(rawBody, signature)) {
    db.addWebhookLog({
      direction: 'inbound',
      event: 'signature_verification_failed',
      type: 'security',
      details: 'Invalid X-Hub-Signature-256 HMAC signature.'
    });
    return res.status(401).json({ error: 'Invalid webhook signature' });
  }

  // 2. Validate payload structure
  const body = req.body;
  if (!body || typeof body !== 'object') {
    return res.status(400).json({ error: 'Invalid webhook payload structure' });
  }

  // Immediate 200 OK response required by Meta
  res.status(200).json({ status: 'received' });

  // 3. Process payload asynchronously
  try {
    const entry = body?.entry?.[0];
    const change = entry?.changes?.[0]?.value;

    if (!change) return;

    // Handle Message Status updates (sent, delivered, read)
    if (Array.isArray(change.statuses)) {
      for (const statusObj of change.statuses) {
        db.addWebhookLog({
          direction: 'inbound',
          event: 'status_update',
          details: `Message ${statusObj.id} status changed to: ${statusObj.status}`
        });
        broadcastEvent('message_status', statusObj);
      }
    }

    // Handle Incoming Messages
    if (Array.isArray(change.messages)) {
      const contact = change.contacts?.[0];
      const customerName = contact?.profile?.name || 'WhatsApp Contact';

      for (const msg of change.messages) {
        if (!msg || !msg.from) continue;

        // Deduplication: prevent processing duplicate message retries from Meta
        if (msg.id) {
          const isDuplicate = db.data.messages.some(m => m.metaMessageId === msg.id);
          if (isDuplicate) {
            console.log(`[Webhook] Duplicate message ${msg.id} ignored.`);
            continue;
          }
        }

        const senderPhone = msg.from.startsWith('+') ? msg.from : '+' + msg.from;
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
          details: `"${content.slice(0, 80)}"`
        });

        broadcastEvent('new_message', savedCustomerMsg);
        broadcastEvent('chat_updated', db.getChat(chat.id));

        // Decision: AI Mode vs Human Mode
        const settings = db.getSettings();
        const isAiMode = chat.mode === 'ai' && settings.globalAutoPilot !== false;

        if (isAiMode) {
          const aiResponse = await generateGeminiResponse({
            chatId: chat.id,
            customerMessage: content,
            mediaBase64,
            mediaMimeType,
            mediaType: msgType,
            mediaName
          });

          const sendResult = await sendMetaWhatsAppMessage({
            to: senderPhone,
            type: 'text',
            text: aiResponse.text
          });

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
          broadcastEvent('human_takeover_pending', {
            chatId: chat.id,
            customerName,
            phoneNumber: senderPhone
          });
        }
      }
    }
  } catch (err) {
    console.error('Error handling webhook payload:', err.message);
    db.addWebhookLog({
      direction: 'inbound',
      event: 'error',
      details: err.message
    });
  }
}

router.post('/', handleWebhookEvent);
router.post('', handleWebhookEvent);

export default router;
