import app from '../server/app.js';

/**
 * Catch-all Vercel Serverless Function for all `/api/*` endpoints.
 * Handles /api/chats, /api/health, /api/settings, /api/kb, etc.
 */
export default function handler(req, res) {
  // Normalize URL if Vercel serverless passes internal function path
  if (req.url && req.url.includes('[...all]')) {
    const rawPath = req.headers['x-matched-path'] || req.headers['x-forwarded-uri'] || '';
    if (rawPath && rawPath.startsWith('/api')) {
      req.url = rawPath;
    }
  }
  return app(req, res);
}
