import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import { registerSSEClient } from './events.js';
import webhookRoutes from './routes/webhook.js';
import chatRoutes from './routes/chats.js';
import kbRoutes from './routes/kb.js';
import settingsRoutes from './routes/settings.js';
import simulatorRoutes from './routes/simulator.js';
import { db } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({
  limit: '30mb',
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: true, limit: '30mb' }));

// Static uploads serving
app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')));

// Real-Time Server-Sent Events (SSE)
app.get('/api/events', (req, res) => {
  registerSSEClient(req, res);
});

// Mount modular API routers
app.use('/api/webhook', webhookRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/kb', kbRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/simulator', simulatorRoutes);

// Health check & overview
app.get('/api/health', (req, res) => {
  const settings = db.getSettings();
  res.json({
    status: 'ok',
    app: 'WhatsApp AI Agent CRM',
    version: '1.0.0',
    model: settings.geminiModel,
    globalAutoPilot: settings.globalAutoPilot !== false,
    timestamp: new Date().toISOString()
  });
});

// Vite middleware in dev or static dist serving in prod
const distPath = path.resolve(__dirname, '../dist');
const isProduction = process.env.NODE_ENV === 'production';

if (!isProduction) {
  try {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, host: '0.0.0.0' },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    // Express 5 compatible catch-all without path-to-regexp '*' error
    app.use(async (req, res, next) => {
      const url = req.originalUrl;
      if (url.startsWith('/api') || url.startsWith('/uploads')) {
        return next();
      }
      try {
        const templatePath = path.resolve(__dirname, '../index.html');
        let template = fs.readFileSync(templatePath, 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e);
        next(e);
      }
    });
  } catch (err) {
    console.error('Failed to initialize Vite dev server middleware:', err);
  }
} else {
  app.use(express.static(distPath));
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api') && !req.path.startsWith('/uploads')) {
      return res.sendFile(path.join(distPath, 'index.html'));
    }
    next();
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`===============================================`);
  console.log(`🤖 WhatsApp AI Agent running on http://0.0.0.0:${PORT}`);
  console.log(`📡 Meta Webhook Endpoint: http://localhost:${PORT}/api/webhook`);
  console.log(`⚡ Realtime SSE Stream:   http://localhost:${PORT}/api/events`);
  console.log(`===============================================`);
});
