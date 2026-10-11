import app from '../server/app.js';

/**
 * Vercel Serverless Function entry point for Express API router.
 * Dispatches all `/api/*` endpoints (chats, kb, settings, simulator, events, health).
 */
export default function handler(req, res) {
  const matchedPath = req.headers['x-matched-path'] || req.headers['x-forwarded-uri'];
  if (matchedPath && matchedPath.startsWith('/api') && (req.url === '/api' || req.url === '/')) {
    req.url = matchedPath;
  } else if (req.url.includes('index.js')) {
    req.url = req.url.replace('/index.js', '') || '/api';
  }
  return app(req, res);
}
