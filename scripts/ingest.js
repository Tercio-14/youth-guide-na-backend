#!/usr/bin/env node
/* eslint-disable no-console */
require('dotenv').config();

const logger = require('../src/utils/logger');
const { collections, admin } = require('../src/config/firebase');
const { embedText, DEFAULT_MODEL } = require('../src/utils/embeddings');
const { buildOpportunityContext } = require('../src/utils/retrieve');

const FieldValue = admin.firestore.FieldValue;

function shouldProcessDocument(data, force) {
  if (force) {
    return true;
  }
  return !data.hasEmbedding || !Array.isArray(data.embedding) || data.embedding.length === 0;
}

async function ingestOpportunities({ force } = {}) {
  const snapshot = await collections.opportunities.get();

  if (snapshot.empty) {
    logger.warn('[Ingest] No opportunities found to process.');
    return;
  }

  logger.info(`[Ingest] Processing ${snapshot.size} opportunities${force ? ' (force mode)' : ''}`);

  let processed = 0;
  let skipped = 0;
  const start = Date.now();

  // eslint-disable-next-line no-restricted-syntax
  for (const doc of snapshot.docs) {
    const data = doc.data();

    if (!shouldProcessDocument(data, force)) {
      skipped += 1;
      // eslint-disable-next-line no-continue
      continue;
    }

    const context = buildOpportunityContext(data);
    if (!context) {
      logger.warn(`[Ingest] Skipping opportunity ${doc.id} due to missing context fields.`);
      skipped += 1;
      // eslint-disable-next-line no-continue
      continue;
    }

    try {
      // eslint-disable-next-line no-await-in-loop
      const embedding = await embedText(context);
      if (!embedding.length) {
        logger.warn(`[Ingest] Empty embedding for opportunity ${doc.id}`);
        skipped += 1;
        // eslint-disable-next-line no-continue
        continue;
      }

      const update = {
        embedding: Array.from(embedding),
        embeddingDim: embedding.length,
        embeddingModel: DEFAULT_MODEL,
        hasEmbedding: true,
        embeddingUpdatedAt: FieldValue.serverTimestamp(),
        contextPreview: context.slice(0, 500),
      };

      // eslint-disable-next-line no-await-in-loop
      await doc.ref.set(update, { merge: true });
      processed += 1;
      logger.info(`[Ingest] Embedded opportunity ${doc.id}`);
    } catch (error) {
      logger.error(`[Ingest] Failed embedding for ${doc.id}`, { error: error.message });
    }
  }

  const latency = Date.now() - start;
  logger.info('[Ingest] Completed embedding process', {
    processed,
    skipped,
    durationMs: latency,
  });
}

(async () => {
  const force = process.argv.includes('--force');

  try {
    logger.info('[Ingest] Starting opportunity embedding pipeline');
    await ingestOpportunities({ force });
    logger.info('[Ingest] Done');
    process.exit(0);
  } catch (error) {
    logger.error('[Ingest] Fatal error', { error: error.message, stack: error.stack });
    process.exit(1);
  }
})();
