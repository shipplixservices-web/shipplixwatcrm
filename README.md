# 🤖 WhatsApp AI Agent — SaaS CRM & Support Copilot

An enterprise-ready SaaS web application connecting official **Meta WhatsApp Cloud API (Graph API v21.0)** with **Google Gemini 2.5 Flash** and an intelligent **RAG Knowledge Base (Supabase pgvector)**.

Built with a modern **WhatsApp Web + Intercom CRM** interface, featuring real-time Server-Sent Events, per-chat and global AI auto-pilot toggles, human-in-the-loop override, multimodal understanding (text, images, documents), and an interactive **WhatsApp Client Simulator**.

---

## 🚀 Key Features

### 1. 💬 Modern Chat Dashboard (WhatsApp Web + Intercom CRM)
- **Live Conversation Canvas**: Real-time incoming & outgoing messages with WhatsApp-styled chat bubbles, blue double-ticks, sender tags (Customer, AI Assistant 🤖, Human Support Agent 👤), and timestamps.
- **Multimodal Message Support**:
  - Text messages
  - Images (with inline thumbnails and lightbox preview)
  - PDF & Document attachments (with download and viewer support)
- **Instant Chat Filtering**: Filter conversations by *All*, *AI Mode*, *Human Mode*, or *Unread*.
- **Live Search**: Search across contact names, phone numbers, and message content.

### 2. ⚡ AI Mode vs. Human Mode (Per-Chat & Global)
- **AI Mode (Auto-Pilot)**: Incoming WhatsApp messages automatically receive smart, accurate, short replies via **Google Gemini 2.5 Flash** enriched with verified **RAG Knowledge Base** context.
- **Human Mode (Agent Override)**: Admin can take over any chat with 1 click. AI pauses auto-replies, and human agents type replies directly.
- **AI Copilot ("Suggest Reply")**: Human agents can request an instant AI draft powered by RAG before sending to customers.
- **Global Auto-Pilot Toggle**: Switch between global autonomous AI handling and manual supervised mode in the top navbar.

### 3. 🧠 Smart Knowledge Base & RAG Memory (Supabase pgvector)
- **Multi-Format Ingestion**: Upload PDFs, text files (`.txt`, `.md`), JSON, and CSV documents.
- **Automatic Text Extraction & Chunking**: Automatic parsing (using `pdf-parse`) and sliding-window semantic chunking with overlap and token estimations.
- **Smart Retrieval Engine**: High-speed keyword coverage and term-frequency scoring that retrieves the most relevant context chunks while reducing LLM token consumption by **70–85%**.
- **Supabase Integration**: Native integration with Supabase PostgreSQL tables and `pgvector(768)` embeddings, plus a built-in 1-click SQL migration generator.
- **RAG Sandbox**: Test search queries in real-time, inspect similarity scores, and review retrieved chunks.

### 4. 🔌 Official Meta WhatsApp Cloud API (Graph API v21.0)
- **Webhook Verification Endpoint**: `GET /api/webhook` with `hub.mode`, `hub.verify_token`, and `hub.challenge`.
- **Message Receiver Endpoint**: `POST /api/webhook` handling official Meta inbound payloads (`entry[].changes[].value.messages[]`, contacts, statuses).
- **Outbound Message Endpoint**: `POST https://graph.facebook.com/v21.0/{PHONE_NUMBER_ID}/messages` with Bearer auth token for text, images, and documents.
- **Media Download Pipeline**: Two-step Meta media retrieval via `GET /{MEDIA_ID}` and authorized streaming.

### 5. 📱 Built-in WhatsApp Mobile Simulator & Webhook Inspector
- Interactive mobile phone preview on screen allows testing customer messages (text, photos of damaged goods, invoices) without waiting for a public ngrok tunnel.
- Real-time Webhook Inspector logs raw Meta events, payload headers, and delivery statuses.

---

## 🛠️ Tech Stack

- **Frontend**: React 19, Vanilla CSS Design System (WhatsApp Dark & Light themes, sleek glassmorphism, micro-animations, Inter/Plus Jakarta typography), Lucide React icons.
- **Backend**: Node.js, Express, Server-Sent Events (SSE) for live synchronization.
- **AI Engine**: Google Gemini 2.5 Flash (`@google/generative-ai`) with multimodal vision and document analysis.
- **RAG Engine**: Semantic chunker, BM25 / Cosine similarity scoring, `pdf-parse`.
- **Database**: Supabase client (`@supabase/supabase-js`) with persistent JSON storage fallback.
- **WhatsApp**: Official Meta WhatsApp Cloud API v21.0.

---

## ⚙️ Configuration & Environment (`.env`)

Create a `.env` file in the root directory (a `.env.example` is provided):

```env
PORT=3001

# Google Gemini API
# Get your API key from https://aistudio.google.com/
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash

# Meta WhatsApp Cloud API (Graph API v21.0)
# From Meta for Developers > WhatsApp > API Setup
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_BUSINESS_ACCOUNT_ID=your_waba_id
WHATSAPP_ACCESS_TOKEN=your_permanent_access_token
WHATSAPP_VERIFY_TOKEN=shipplix_agent_webhook_verify_2026

# Supabase Database (Optional - persistent store active by default)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Agent Defaults
DEFAULT_MODE=ai
MAX_RAG_CHUNKS=4
RAG_SIMILARITY_THRESHOLD=0.15
```

---

## 🏃 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Both Backend & Frontend Concurrently
```bash
npm run dev
```

The application will start:
- **Frontend CRM**: [http://localhost:5173/](http://localhost:5173/)
- **Backend API**: [http://localhost:3001/](http://localhost:3001/)
- **Meta Webhook**: [http://localhost:3001/api/webhook](http://localhost:3001/api/webhook)
- **Real-Time Stream**: [http://localhost:3001/api/events](http://localhost:3001/api/events)

---

## 🧪 Testing the Solution

1. Open [http://localhost:5173/](http://localhost:5173/) in your browser.
2. In the **WhatsApp Mobile Simulator** (bottom right):
   - Select contact (e.g. *Sarah Jenkins*).
   - Click a quick prompt: *"Does express shipping deliver on Sunday in Brooklyn?"* and click **Send**.
   - Watch the message arrive in real-time in the admin CRM chat viewport.
   - Observe the **Shipplix AI Assistant** respond automatically with verified Knowledge Base data and cite `RAG: Shipplix Logistics FAQ & Service Guide.pdf (Chunk #2)`.
3. Test **Human Override**:
   - In the active chat header, toggle from **AI Mode** to **Human Mode**.
   - Send another message from the simulator. The message is queued with an unread badge and no automated AI reply.
   - Click **Suggest Reply** to test the AI Copilot, or type a custom manual response and click Send.
4. Test **Knowledge Base & RAG**:
   - Click **Knowledge Base** in the top navbar.
   - Inspect the **Structured Chunks Inspector** to review parsed document chunks.
   - Switch to **RAG Smart Memory Sandbox** to test queries and see real-time relevance scoring and token savings.
   - Upload new PDF, TXT, or Markdown documents.
5. Test **Settings**:
   - Click **Settings** in the top navbar to configure Gemini API keys, test Meta WhatsApp Cloud API credentials, and copy the Supabase pgvector schema.
