import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');
import { db } from './db.js';

// Common English stopwords for search filtering
const STOP_WORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'aren',
  'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by',
  'can', 'could', 'did', 'do', 'does', 'doing', 'down', 'during', 'each', 'few', 'for', 'from',
  'further', 'had', 'has', 'have', 'having', 'he', 'her', 'here', 'hers', 'herself', 'him', 'himself',
  'his', 'how', 'i', 'if', 'in', 'into', 'is', 'it', 'its', 'itself', 'just', 'me', 'more', 'most',
  'my', 'myself', 'no', 'nor', 'not', 'now', 'of', 'off', 'on', 'once', 'only', 'or', 'other', 'our',
  'ours', 'ourselves', 'out', 'over', 'own', 'same', 'she', 'should', 'so', 'some', 'such', 'than',
  'that', 'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there', 'these', 'they', 'this',
  'those', 'through', 'to', 'too', 'under', 'until', 'up', 'very', 'was', 'we', 'were', 'what', 'when',
  'where', 'which', 'while', 'who', 'whom', 'why', 'with', 'would', 'you', 'your', 'yours', 'yourself'
]);

/**
 * Tokenize and normalize text into meaningful keywords
 */
export function tokenize(text = '') {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP_WORDS.has(w));
}

/**
 * Extract text from uploaded file buffer/path
 */
export async function extractTextFromFile(filePath, mimeType) {
  try {
    if (mimeType === 'application/pdf' || filePath.toLowerCase().endsWith('.pdf')) {
      const dataBuffer = fs.readFileSync(filePath);
      const parsed = await pdf(dataBuffer);
      return parsed.text || '';
    } else {
      // Plain text, markdown, json, csv
      return fs.readFileSync(filePath, 'utf-8');
    }
  } catch (err) {
    console.error('Failed to extract text from file:', err);
    throw new Error(`Failed to extract text: ${err.message}`);
  }
}

/**
 * Split text into semantic chunks with overlap
 */
export function chunkText(text, docTitle, documentId, chunkSize = 450, overlap = 70) {
  const clean = text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  if (!clean) return [];

  // Split primarily by paragraphs or double newlines
  const paragraphs = clean.split(/\n\s*\n/);
  const chunks = [];
  let currentChunk = '';
  let chunkIndex = 0;

  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) continue;

    if ((currentChunk + '\n\n' + trimmed).length > chunkSize && currentChunk.length > 0) {
      chunks.push({
        id: `chunk_${documentId}_${chunkIndex}`,
        documentId,
        docTitle,
        chunkIndex,
        content: currentChunk.trim(),
        tokenEstimate: Math.ceil(currentChunk.trim().split(/\s+/).length * 1.3)
      });
      chunkIndex++;
      // Retain last portion as overlap
      const words = currentChunk.split(/\s+/);
      const overlapWords = words.slice(-Math.min(words.length, 12)).join(' ');
      currentChunk = overlapWords + '\n\n' + trimmed;
    } else {
      currentChunk = currentChunk ? (currentChunk + '\n\n' + trimmed) : trimmed;
    }
  }

  if (currentChunk.trim().length > 0) {
    chunks.push({
      id: `chunk_${documentId}_${chunkIndex}`,
      documentId,
      docTitle,
      chunkIndex,
      content: currentChunk.trim(),
      tokenEstimate: Math.ceil(currentChunk.trim().split(/\s+/).length * 1.3)
    });
  }

  return chunks;
}

/**
 * BM25 / Cosine-like keyword similarity scoring for RAG
 */
export function calculateRelevanceScore(queryTokens, chunkText) {
  if (!queryTokens.length) return 0;
  const chunkTokens = tokenize(chunkText);
  if (!chunkTokens.length) return 0;

  const chunkTokenFreq = {};
  for (const token of chunkTokens) {
    chunkTokenFreq[token] = (chunkTokenFreq[token] || 0) + 1;
  }

  let matchedTokens = 0;
  let tfScore = 0;
  const querySet = new Set(queryTokens);

  for (const token of querySet) {
    if (chunkTokenFreq[token]) {
      matchedTokens++;
      const tf = chunkTokenFreq[token];
      tfScore += Math.log(1 + tf) + 1.0;
    } else {
      // Partial prefix/stem match
      for (const cToken of Object.keys(chunkTokenFreq)) {
        if (cToken.startsWith(token) || token.startsWith(cToken)) {
          matchedTokens += 0.5;
          tfScore += 0.6;
          break;
        }
      }
    }
  }

  if (matchedTokens === 0) return 0;

  // Fraction of query terms matched (0..1)
  const coverage = matchedTokens / querySet.size;
  // Normalized score: blend coverage (70%) and term frequency (30%)
  const score = (coverage * 0.7) + (Math.min(tfScore / (querySet.size * 2), 1) * 0.3);
  return Number(score.toFixed(3));
}

/**
 * Search the Knowledge Base for relevant context chunks
 */
export async function searchKnowledgeBase(query, options = {}) {
  const settings = db.getSettings();
  const topK = options.topK || settings.featureLimits?.ragTopK || 3;
  const minScore = options.minScore !== undefined ? options.minScore : 0.15;

  const allChunks = db.getChunks();
  if (!allChunks.length || !query || !query.trim()) {
    return {
      chunks: [],
      totalAvailable: allChunks.length,
      estimatedTokensSaved: 0,
      contextPrompt: ''
    };
  }

  const queryTokens = tokenize(query);

  const scoredChunks = allChunks.map(chunk => {
    const score = calculateRelevanceScore(queryTokens, chunk.content);
    return {
      ...chunk,
      score: Number(score.toFixed(3))
    };
  });

  // Filter and sort descending
  const relevant = scoredChunks
    .filter(c => c.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  // If top chunks are found, build formatted context
  let contextPrompt = '';
  let usedTokens = 0;
  let totalDocTokens = allChunks.reduce((acc, c) => acc + (c.tokenEstimate || 50), 0);

  if (relevant.length > 0) {
    contextPrompt = `\n\n--- KNOWLEDGE BASE CONTEXT (Retrieved automatically via RAG) ---\n` +
      relevant.map((c, i) => `[Source ${i + 1}: ${c.docTitle} (Relevance Score: ${c.score})]\n${c.content}`).join('\n\n') +
      `\n--- END KNOWLEDGE BASE CONTEXT ---\n(Instructions: Base your response primarily on the verified knowledge above. If the answer is in the knowledge base, be clear, concise, and helpful.)\n`;

    usedTokens = relevant.reduce((acc, c) => acc + (c.tokenEstimate || 50), 0);
  }

  const estimatedTokensSaved = Math.max(0, totalDocTokens - usedTokens);

  return {
    query,
    chunks: relevant,
    totalAvailable: allChunks.length,
    retrievedCount: relevant.length,
    estimatedTokensSaved,
    contextPrompt
  };
}
