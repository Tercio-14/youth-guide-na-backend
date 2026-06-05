const { GoogleGenerativeAI } = require('@google/generative-ai');
const logger = require('./logger');

const DEFAULT_MODEL = process.env.EMBEDDING_MODEL || 'text-embedding-004';

function getClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured');
  }
  return new GoogleGenerativeAI(apiKey);
}

function normalizeVector(vector) {
  if (!Array.isArray(vector) || vector.length === 0) {
    return [];
  }
  const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
  if (!norm) {
    return vector;
  }
  return vector.map((value) => value / norm);
}

function cosineSimilarity(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length || a.length === 0) {
    return 0;
  }
  let dot = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
  }
  return dot;
}

/**
 * Embed a single string using Gemini text-embedding-004.
 * Returns a float array (768-dimensional by default).
 */
async function embedText(text) {
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return [];
  }

  try {
    const client = getClient();
    const model = client.getGenerativeModel({ model: DEFAULT_MODEL });
    const result = await model.embedContent(text);
    return Array.from(result.embedding.values);
  } catch (error) {
    logger.error('[Embeddings] Failed to compute embedding', { error: error.message });
    throw error;
  }
}

/**
 * Embed multiple strings sequentially.
 */
async function embedTexts(texts) {
  if (!Array.isArray(texts) || texts.length === 0) {
    return [];
  }
  const results = [];
  for (const text of texts) {
    // eslint-disable-next-line no-await-in-loop
    results.push(await embedText(text));
  }
  return results;
}

module.exports = {
  embedText,
  embedTexts,
  normalizeVector,
  cosineSimilarity,
  DEFAULT_MODEL,
};
