import crypto from 'crypto';
import { db } from './db.js';

const META_GRAPH_VERSION = 'v21.0';

/**
 * Verify Webhook handshake from Meta WhatsApp Cloud API
 */
export function verifyWebhookRequest(req) {
  let mode, token, challenge;

  if (req.query && typeof req.query === 'object') {
    mode = req.query['hub.mode'];
    token = req.query['hub.verify_token'];
    challenge = req.query['hub.challenge'];
  }

  // Fallback: parse query parameters from URL string if req.query is unavailable
  if (!mode || !token || !challenge) {
    try {
      const urlToParse = req.url.startsWith('http') ? req.url : `http://localhost${req.url}`;
      const parsedUrl = new URL(urlToParse);
      mode = mode || parsedUrl.searchParams.get('hub.mode');
      token = token || parsedUrl.searchParams.get('hub.verify_token');
      challenge = challenge || parsedUrl.searchParams.get('hub.challenge');
    } catch {
      // Ignore URL parse failure
    }
  }

  const settings = db.getSettings();
  const configuredToken = process.env.WHATSAPP_VERIFY_TOKEN || settings.whatsappVerifyToken || 'shipplix_agent_webhook_verify_2026';
  const expectedToken = String(configuredToken).trim();
  const suppliedToken = token ? String(token).trim() : '';

  let isTokenMatch = false;
  if (suppliedToken && expectedToken) {
    if (suppliedToken.length === expectedToken.length) {
      try {
        isTokenMatch = crypto.timingSafeEqual(Buffer.from(suppliedToken), Buffer.from(expectedToken));
      } catch {
        isTokenMatch = suppliedToken === expectedToken;
      }
    } else {
      isTokenMatch = false;
    }
  }

  if (mode === 'subscribe' && isTokenMatch) {
    db.addWebhookLog({
      direction: 'inbound',
      event: 'webhook_verification_success',
      type: 'handshake',
      details: `Meta Webhook verified successfully (Challenge: ${challenge})`
    });
    return { verified: true, challenge };
  }

  const maskedToken = suppliedToken ? `${suppliedToken.slice(0, 3)}***` : 'undefined';
  db.addWebhookLog({
    direction: 'inbound',
    event: 'webhook_verification_failed',
    type: 'handshake',
    details: `Verification failed. mode="${mode}", token="${maskedToken}"`
  });
  return {
    verified: false,
    reason: mode !== 'subscribe' ? 'Invalid hub.mode' : 'Invalid hub.verify_token'
  };
}

/**
 * Send an outbound message via official Meta WhatsApp Cloud API
 */
export async function sendMetaWhatsAppMessage({ to, type = 'text', text = '', mediaUrl = null, mediaName = null }) {
  const settings = db.getSettings();
  const phoneNumberId = settings.whatsappPhoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = settings.whatsappAccessToken || process.env.WHATSAPP_ACCESS_TOKEN;

  // Clean recipient phone number (remove + or spaces for Meta payload)
  const recipient = to.replace(/[^\d]/g, '');

  // Log attempt
  const logEntry = {
    direction: 'outbound',
    event: 'send_message',
    sender: 'Shipplix AI / Agent',
    recipient: to,
    type,
    details: text ? text.slice(0, 100) : `Media: ${mediaUrl}`
  };

  // If live credentials are not set, return simulated send success
  if (!phoneNumberId || !accessToken) {
    logEntry.status = 'simulated_success';
    logEntry.details += ' (Simulated dispatch - Meta credentials pending in Settings)';
    db.addWebhookLog(logEntry);
    return {
      success: true,
      simulated: true,
      messageId: 'wamid.simulated_' + Date.now(),
      notice: 'Message dispatched in simulation mode. Connect Meta credentials in Settings for live WhatsApp delivery.'
    };
  }

  // Construct official Meta WhatsApp Cloud API payload
  let payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: recipient,
  };

  if (type === 'text') {
    payload.type = 'text';
    payload.text = { preview_url: true, body: text };
  } else if (type === 'image') {
    payload.type = 'image';
    payload.image = { link: mediaUrl, caption: text || undefined };
  } else if (type === 'document') {
    payload.type = 'document';
    payload.document = {
      link: mediaUrl,
      caption: text || undefined,
      filename: mediaName || 'document.pdf'
    };
  } else {
    payload.type = 'text';
    payload.text = { body: text || `[Unsupported media: ${type}]` };
  }

  const url = `https://graph.facebook.com/${META_GRAPH_VERSION}/${phoneNumberId}/messages`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      logEntry.status = 'error';
      logEntry.error = data.error?.message || response.statusText;
      db.addWebhookLog(logEntry);
      throw new Error(`Meta API error: ${data.error?.message || response.statusText}`);
    }

    logEntry.status = 'sent';
    logEntry.messageId = data.messages?.[0]?.id;
    db.addWebhookLog(logEntry);

    return {
      success: true,
      simulated: false,
      messageId: data.messages?.[0]?.id,
      response: data
    };
  } catch (err) {
    console.error('Failed to send Meta WhatsApp message:', err.message);
    logEntry.status = 'error';
    logEntry.error = err.message;
    db.addWebhookLog(logEntry);
    return {
      success: false,
      error: err.message
    };
  }
}

/**
 * Fetch and download media binary from Meta WhatsApp Cloud API
 */
export async function fetchMetaMediaBinary(mediaId) {
  const settings = db.getSettings();
  const accessToken = settings.whatsappAccessToken || process.env.WHATSAPP_ACCESS_TOKEN;

  if (!accessToken) {
    throw new Error('Meta Access Token is required to download media.');
  }

  // Step 1: Query media details
  const metaUrl = `https://graph.facebook.com/${META_GRAPH_VERSION}/${mediaId}`;
  const metaRes = await fetch(metaUrl, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });
  if (!metaRes.ok) throw new Error('Failed to retrieve media URL from Meta');

  const metaData = await metaRes.json();
  const downloadUrl = metaData.url;
  const mimeType = metaData.mime_type;

  // Step 2: Download binary with Bearer authorization
  const binaryRes = await fetch(downloadUrl, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'User-Agent': 'curl/7.64.1'
    }
  });
  if (!binaryRes.ok) throw new Error('Failed to stream media binary');

  const arrayBuffer = await binaryRes.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const base64 = buffer.toString('base64');

  return {
    base64,
    mimeType,
    fileSize: metaData.file_size
  };
}

/**
 * Mark a message as read in Meta WhatsApp Cloud API
 */
export async function markMetaMessageAsRead(messageId) {
  const settings = db.getSettings();
  const phoneNumberId = settings.whatsappPhoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = settings.whatsappAccessToken || process.env.WHATSAPP_ACCESS_TOKEN;

  if (!phoneNumberId || !accessToken || !messageId || messageId.startsWith('wamid.simulated')) {
    return { success: true, simulated: true };
  }

  const url = `https://graph.facebook.com/${META_GRAPH_VERSION}/${phoneNumberId}/messages`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        status: 'read',
        message_id: messageId
      })
    });
    return { success: res.ok };
  } catch (e) {
    console.warn('Failed to mark WhatsApp message read:', e.message);
    return { success: false, error: e.message };
  }
}
