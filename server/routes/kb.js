import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { db } from '../db.js';
import { extractTextFromFile, chunkText, searchKnowledgeBase } from '../rag.js';
import { broadcastEvent } from '../events.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const UPLOADS_DIR = isServerless ? '/tmp/uploads' : path.resolve(__dirname, '../../uploads');

try {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
} catch (err) {
  // Gracefully handle read-only environments
}

// Multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `${unique}-${file.originalname}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB max
});

const router = express.Router();

/**
 * GET /api/kb/documents
 * List all knowledge base documents and stats
 */
router.get('/documents', (req, res) => {
  const documents = db.getDocuments();
  const chunks = db.getChunks();
  res.json({
    success: true,
    documents,
    totalChunks: chunks.length,
    totalDocuments: documents.length
  });
});

/**
 * GET /api/kb/chunks
 * Retrieve all chunks or chunks for a specific document
 */
router.get('/chunks', (req, res) => {
  const { documentId } = req.query;
  const chunks = db.getChunks(documentId);
  res.json({ success: true, chunks });
});

/**
 * POST /api/kb/upload
 * Upload PDF, Text, or Document file, extract text, chunk and index
 */
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    const { originalname, mimetype, size, path: tempPath } = req.file;

    // 1. Extract text content
    const extractedText = await extractTextFromFile(tempPath, mimetype);

    if (!extractedText || !extractedText.trim()) {
      return res.status(400).json({ success: false, error: 'Could not extract text from the uploaded file.' });
    }

    // 2. Generate structured chunks
    const docId = 'doc_' + Date.now();
    const chunks = chunkText(extractedText, originalname, docId);

    // 3. Create Document record
    const doc = {
      id: docId,
      title: originalname,
      filename: path.basename(tempPath),
      fileType: mimetype,
      size,
      chunkCount: chunks.length,
      status: 'indexed',
      uploadedAt: new Date().toISOString(),
      summary: extractedText.slice(0, 240).replace(/\s+/g, ' ') + '...'
    };

    // 4. Save to local DB
    db.addDocument(doc, chunks);

    // 5. If Supabase is connected, attempt sync to Supabase tables
    const supabase = db.getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from('knowledge_documents').insert([{
          id: doc.id,
          title: doc.title,
          file_type: doc.fileType,
          size_bytes: doc.size,
          chunk_count: doc.chunkCount,
          summary: doc.summary,
          created_at: doc.uploadedAt
        }]);

        if (chunks.length > 0) {
          await supabase.from('knowledge_chunks').insert(chunks.map(c => ({
            id: c.id,
            document_id: c.documentId,
            doc_title: c.docTitle,
            chunk_index: c.chunkIndex,
            content: c.content,
            token_estimate: c.tokenEstimate
          })));
        }
      } catch (sbErr) {
        console.warn('Supabase sync skipped/failed (tables might not exist yet):', sbErr.message);
      }
    }

    broadcastEvent('kb_updated', { doc, chunksCount: chunks.length });

    res.json({
      success: true,
      document: doc,
      chunksCount: chunks.length,
      sampleChunk: chunks[0]
    });
  } catch (err) {
    console.error('Upload & indexing error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/kb/test-search
 * Test RAG retrieval against knowledge base for any query
 */
router.post('/test-search', async (req, res) => {
  const { query, topK, minScore } = req.body;
  if (!query) {
    return res.status(400).json({ success: false, error: 'Query is required' });
  }

  const result = await searchKnowledgeBase(query, { topK, minScore });
  res.json({ success: true, ...result });
});

/**
 * DELETE /api/kb/documents/:id
 * Remove document and associated chunks
 */
router.delete('/documents/:id', async (req, res) => {
  const { id } = req.params;
  const result = db.deleteDocument(id);

  // Sync delete with Supabase if active
  const supabase = db.getSupabaseClient();
  if (supabase) {
    try {
      await supabase.from('knowledge_chunks').delete().eq('document_id', id);
      await supabase.from('knowledge_documents').delete().eq('id', id);
    } catch (e) {
      // ignore
    }
  }

  broadcastEvent('kb_updated', { deletedId: id });
  res.json({ success: true });
});

export default router;
