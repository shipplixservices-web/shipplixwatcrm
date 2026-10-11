import app from '../server/app.js';

/**
 * Catch-all Vercel Serverless Function for all nested `/api/*` endpoints.
 * Catches `/api/chats`, `/api/chats/:id`, `/api/settings/test-whatsapp`, etc.
 */
export default function handler(req, res) {
  return app(req, res);
}
