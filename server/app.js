import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
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

// Middleware
app.use(cors());

// Capture raw body Buffer for Meta HMAC signature verification (X-Hub-Signature-256)
app.use(express.json({
  limit: '30mb',
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));

app.use(express.urlencoded({ extended: true, limit: '30mb' }));

// Static uploads serving (safe for local / tmp)
app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')));

// Real-Time Server-Sent Events (SSE)
const sseHandler = (req, res) => {
  registerSSEClient(req, res);
};
app.get('/api/events', sseHandler);
app.get('/events', sseHandler);

// Health check & overview
const healthHandler = (req, res) => {
  const settings = db.getSettings();
  res.json({
    status: 'ok',
    app: 'WhatsApp AI Agent CRM',
    version: '1.0.0',
    model: settings.geminiModel,
    globalAutoPilot: settings.globalAutoPilot !== false,
    timestamp: new Date().toISOString()
  });
};
app.get('/api/health', healthHandler);
app.get('/health', healthHandler);

// Mount modular API routers with both /api prefix and direct path for Vercel rewrites
app.use('/api/webhook', webhookRoutes);
app.use('/webhook', webhookRoutes);

app.use('/api/chats', chatRoutes);
app.use('/chats', chatRoutes);

app.use('/api/kb', kbRoutes);
app.use('/kb', kbRoutes);

app.use('/api/settings', settingsRoutes);
app.use('/settings', settingsRoutes);

app.use('/api/simulator', simulatorRoutes);
app.use('/simulator', simulatorRoutes);

export default app;
