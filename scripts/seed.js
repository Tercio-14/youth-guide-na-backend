#!/usr/bin/env node
/* eslint-disable no-console */
require('dotenv').config();

const fs = require('fs');
const path = require('path');

const logger = require('../src/utils/logger');
const { collections, admin } = require('../src/config/firebase');

const FieldValue = admin.firestore.FieldValue;
const DATA_FILE = path.join(__dirname, '..', 'data', 'opportunities.json');
const BATCH_LIMIT = 450; // Firestore allows 500 writes per batch; stay under.

/**
 * Seeds the Firestore `opportunities` collection from data/opportunities.json.
 *
 * Each opportunity keeps its original scraped fields and gains a normalized
 * `category` (derived from `type`) so it is queryable and included in the
 * retrieval context. Embeddings are NOT computed here — run
 * `node scripts/ingest.js --force` afterwards to embed the seeded documents.
 *
 * Existing documents with the same id are overwritten (merge). Pass --wipe to
 * delete all existing opportunities before seeding.
 */
async function seed({ wipe } = {}) {
  if (!fs.existsSync(DATA_FILE)) {
    throw new Error(`Data file not found: ${DATA_FILE}`);
  }

  const raw = fs.readFileSync(DATA_FILE, 'utf8');
  const parsed = JSON.parse(raw);
  const opportunities = Array.isArray(parsed) ? parsed : parsed.opportunities;

  if (!Array.isArray(opportunities) || opportunities.length === 0) {
    logger.warn('[Seed] No opportunities found in data file.');
    return;
  }

  if (wipe) {
    logger.info('[Seed] --wipe: deleting existing opportunities...');
    const existing = await collections.opportunities.get();
    let batch = collections.opportunities.firestore.batch();
    let count = 0;
    for (const doc of existing.docs) {
      batch.delete(doc.ref);
      count += 1;
      if (count % BATCH_LIMIT === 0) {
        // eslint-disable-next-line no-await-in-loop
        await batch.commit();
        batch = collections.opportunities.firestore.batch();
      }
    }
    if (count % BATCH_LIMIT !== 0) {
      await batch.commit();
    }
    logger.info(`[Seed] Deleted ${count} existing opportunities.`);
  }

  logger.info(`[Seed] Seeding ${opportunities.length} opportunities...`);

  let batch = collections.opportunities.firestore.batch();
  let pending = 0;
  let written = 0;

  for (const opp of opportunities) {
    if (!opp.title) {
      logger.warn(`[Seed] Skipping opportunity without title (id: ${opp.id || 'unknown'})`);
      // eslint-disable-next-line no-continue
      continue;
    }

    const docId = opp.id ? String(opp.id) : collections.opportunities.doc().id;
    const docRef = collections.opportunities.doc(docId);

    const data = {
      ...opp,
      category: opp.category || (opp.type ? String(opp.type).toLowerCase() : 'general'),
      hasEmbedding: false,
      createdAt: opp.createdAt || FieldValue.serverTimestamp(),
      seededAt: FieldValue.serverTimestamp(),
    };
    delete data.id; // id lives on the document, not in the body

    batch.set(docRef, data, { merge: true });
    pending += 1;
    written += 1;

    if (pending >= BATCH_LIMIT) {
      // eslint-disable-next-line no-await-in-loop
      await batch.commit();
      batch = collections.opportunities.firestore.batch();
      pending = 0;
      logger.info(`[Seed] Committed ${written} so far...`);
    }
  }

  if (pending > 0) {
    await batch.commit();
  }

  logger.info(`[Seed] Done. Wrote ${written} opportunities.`);
  logger.info('[Seed] Next step: run `node scripts/ingest.js --force` to compute embeddings.');
}

(async () => {
  const wipe = process.argv.includes('--wipe');

  try {
    logger.info('[Seed] Starting opportunity seed');
    await seed({ wipe });
    process.exit(0);
  } catch (error) {
    logger.error('[Seed] Fatal error', { error: error.message, stack: error.stack });
    process.exit(1);
  }
})();
