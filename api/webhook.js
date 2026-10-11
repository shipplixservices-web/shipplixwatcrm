import app from '../server/app.js';
import { verifyWebhookRequest } from '../server/whatsapp.js';

/**
 * Dedicated Vercel Serverless Function for Meta WhatsApp Cloud API Webhook.
 * Handles:
 *  - GET: Meta verification handshake (returns exact hub.challenge as plain text HTTP 200)
 *  - POST: Inbound WhatsApp messages, statuses, and delivery updates
 */
export default async function handler(req, res) {
  // 1. Direct GET Verification for Meta Webhook Handshake
  if (req.method === 'GET') {
    const result = verifyWebhookRequest(req);
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');

    if (result.verified) {
      return res.status(200).send(String(result.challenge));
    }
    return res.status(403).send(result.reason || 'Verification failed');
  }

  // 2. Normalize req.url so Express router matches correctly under Vercel serverless
  if (!req.url.startsWith('/api/webhook') && !req.url.startsWith('/webhook')) {
    req.url = '/api/webhook' + (req.url.startsWith('/') ? req.url : '/' + req.url);
  }

  return app(req, res);
}
