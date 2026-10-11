import app from '../server/app.js';

/**
 * Vercel Serverless Function entry point for Express API router.
 * Dispatches all `/api/*` endpoints (chats, kb, settings, simulator, events, health).
 */
export default function handler(req, res) {
  if (req.url.includes('index.js')) {
    req.url = req.url.replace('/index.js', '') || '/api';
  }
  return app(req, res);
}
