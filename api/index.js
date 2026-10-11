import app from '../server/app.js';

/**
 * Vercel Serverless Function entry point for Express API router.
 * Dispatches all `/api/*` endpoints (chats, kb, settings, simulator, events, health).
 */
export default function handler(req, res) {
  return app(req, res);
}
