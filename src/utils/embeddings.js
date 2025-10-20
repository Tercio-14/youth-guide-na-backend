const logger = require('./logger');

const DEFAULT_MODEL = process.env.EMBEDDING_MODEL || 'Xenova/all-MiniLM-L6-v2';

let embeddingPipelinePromise = null;

async function createEmbeddingPipeline(model) {
  logger.info(`[Embeddings] Loading embedding model: ${model}`);

  const transformersModule = await import('@xenova/transformers');
  const pipelineFactory = transformersModule.pipeline || transformersModule.default?.pipeline;

  if (typeof pipelineFactory !== 'function') {
    throw new Error('Failed to load pipeline factory from @xenova/transformers');
  }

  return pipelineFactory('feature-extraction', model);
}

async function getEmbeddingPipeline() {
  if (!embeddingPipelinePromise) {
    const model = DEFAULT_MODEL;
    embeddingPipelinePromise = createEmbeddingPipeline(model);
  }
  return embeddingPipelinePromise;
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

async function embedText(text) {
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return [];
  }

  try {
    const embedder = await getEmbeddingPipeline();
    const output = await embedder(text, { pooling: 'mean', normalize: true });
    const vector = Array.from(output?.data || output);
    return vector;
  } catch (error) {
    logger.error('[Embeddings] Failed to compute embedding', { error: error.message });
    throw error;
  }
}

async function embedTexts(texts) {
  if (!Array.isArray(texts) || texts.length === 0) {
    return [];
  }

  const results = [];
  for (const text of texts) {
    // eslint-disable-next-line no-await-in-loop
    const vector = await embedText(text);
    results.push(vector);
  }
  return results;
}

module.exports = {
  embedText,
  embedTexts,
  getEmbeddingPipeline,
  normalizeVector,
  cosineSimilarity,
  DEFAULT_MODEL,
};
