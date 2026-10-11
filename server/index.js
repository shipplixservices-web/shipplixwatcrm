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
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '30mb' }));
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

app.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(`🤖 WhatsApp AI Agent Backend running on port ${PORT}`);
  console.log(`📡 Meta Webhook Endpoint: http://localhost:${PORT}/api/webhook`);
  console.log(`⚡ Realtime SSE Stream:   http://localhost:${PORT}/api/events`);
  console.log(`===============================================`);
});
