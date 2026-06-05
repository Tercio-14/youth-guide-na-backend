const express = require('express');
const { admin, collections } = require('../config/firebase');
const { verifyToken, requireAdmin, optionalAuth } = require('../middleware/auth');
const { embedText } = require('../utils/embeddings');
const { buildOpportunityContext } = require('../utils/retrieve');
const logger = require('../utils/logger');

const router = express.Router();
const FieldValue = admin.firestore.FieldValue;

/**
 * GET /api/opportunities
 * List and filter opportunities (public endpoint).
 * Supports ?category= and ?type= query params (one filter at a time).
 */
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { category, type, limit: limitParam = '50' } = req.query;
    const limitVal = Math.min(parseInt(limitParam, 10) || 50, 200);

    let query = collections.opportunities;

    if (category) {
      query = query.where('category', '==', category);
    } else if (type) {
      query = query.where('type', '==', type);
    }

    query = query.limit(limitVal);

    const snapshot = await query.get();
    const opportunities = snapshot.docs.map((doc) => {
      const data = doc.data();
      // Strip raw embedding vectors from API responses
      delete data.embedding;
      return { id: doc.id, ...data };
    });

    res.json({
      success: true,
      opportunities,
      total: opportunities.length,
      filters: { category, type },
      limit: limitVal,
    });
  } catch (error) {
    logger.error('Get opportunities error:', error);
    res.status(500).json({ error: 'Failed to retrieve opportunities', message: error.message });
  }
});

/**
 * GET /api/opportunities/:id
 * Get a single opportunity by ID.
 */
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await collections.opportunities.doc(id).get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Opportunity not found' });
    }

    const data = doc.data();
    delete data.embedding;

    res.json({ success: true, opportunity: { id: doc.id, ...data } });
  } catch (error) {
    logger.error('Get opportunity error:', error);
    res.status(500).json({ error: 'Failed to retrieve opportunity', message: error.message });
  }
});

/**
 * POST /api/opportunities
 * Create a new opportunity (admin only).
 * Triggers asynchronous embedding computation after creation.
 */
router.post('/', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { title, category, description, skillsRequired, cost, location, contact, source, type } = req.body;

    if (!title || !category || !description || !cost || !location || !contact || !source) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'title, category, description, cost, location, contact, and source are required',
      });
    }

    const opportunityData = {
      title,
      category,
      type: type || category,
      description,
      skillsRequired: skillsRequired
        ? skillsRequired.split(',').map((s) => s.trim()).filter(Boolean)
        : [],
      cost,
      location,
      contact,
      source,
      createdAt: FieldValue.serverTimestamp(),
      createdBy: req.user.uid,
      hasEmbedding: false,
    };

    const docRef = await collections.opportunities.add(opportunityData);
    logger.info(`[Opportunities] Created: ${docRef.id} by ${req.user.uid}`);

    // Compute embedding asynchronously — do not block the response
    const context = buildOpportunityContext({ title, category, description, cost, location, skillsRequired, contact, source });
    embedText(context)
      .then(async (embedding) => {
        if (embedding.length) {
          await docRef.update({
            embedding: Array.from(embedding),
            embeddingDim: embedding.length,
            embeddingModel: process.env.EMBEDDING_MODEL || 'text-embedding-004',
            hasEmbedding: true,
            embeddingUpdatedAt: FieldValue.serverTimestamp(),
          });
          logger.info(`[Opportunities] Embedding computed for ${docRef.id}`);
        }
      })
      .catch((err) => logger.error(`[Opportunities] Embedding failed for ${docRef.id}:`, err));

    res.status(201).json({
      success: true,
      message: 'Opportunity created. Embedding computing in background.',
      opportunityId: docRef.id,
      opportunity: { id: docRef.id, ...opportunityData },
    });
  } catch (error) {
    logger.error('Create opportunity error:', error);
    res.status(500).json({ error: 'Failed to create opportunity', message: error.message });
  }
});

/**
 * PUT /api/opportunities/:id
 * Update an opportunity (admin only).
 * Re-computes embedding asynchronously if content fields changed.
 */
router.put('/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const docRef = collections.opportunities.doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Opportunity not found' });
    }

    const updates = { ...req.body, updatedAt: FieldValue.serverTimestamp(), updatedBy: req.user.uid };
    // Never allow overwriting embedding fields directly via PUT body
    delete updates.embedding;
    delete updates.hasEmbedding;
    delete updates.embeddingDim;
    delete updates.embeddingModel;

    await docRef.update(updates);
    logger.info(`[Opportunities] Updated: ${id} by ${req.user.uid}`);

    // Re-embed if content fields changed
    const contentFields = ['title', 'description', 'category', 'skillsRequired', 'location', 'contact', 'source', 'cost'];
    const needsReEmbed = contentFields.some((f) => req.body[f] !== undefined);

    if (needsReEmbed) {
      const freshData = { ...doc.data(), ...updates };
      const context = buildOpportunityContext(freshData);
      embedText(context)
        .then(async (embedding) => {
          if (embedding.length) {
            await docRef.update({
              embedding: Array.from(embedding),
              embeddingDim: embedding.length,
              embeddingModel: process.env.EMBEDDING_MODEL || 'text-embedding-004',
              hasEmbedding: true,
              embeddingUpdatedAt: FieldValue.serverTimestamp(),
            });
          }
        })
        .catch((err) => logger.error(`[Opportunities] Re-embed failed for ${id}:`, err));
    }

    res.json({ success: true, message: 'Opportunity updated', opportunityId: id });
  } catch (error) {
    logger.error('Update opportunity error:', error);
    res.status(500).json({ error: 'Failed to update opportunity', message: error.message });
  }
});

/**
 * DELETE /api/opportunities/:id
 * Delete an opportunity (admin only).
 */
router.delete('/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const docRef = collections.opportunities.doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Opportunity not found' });
    }

    await docRef.delete();
    logger.info(`[Opportunities] Deleted: ${id} by ${req.user.uid}`);

    res.json({ success: true, message: 'Opportunity deleted', opportunityId: id });
  } catch (error) {
    logger.error('Delete opportunity error:', error);
    res.status(500).json({ error: 'Failed to delete opportunity', message: error.message });
  }
});

/**
 * POST /api/opportunities/ingest
 * Batch ingest opportunities with embedding computation (admin only).
 */
router.post('/ingest', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { opportunities } = req.body;

    if (!Array.isArray(opportunities) || opportunities.length === 0) {
      return res.status(400).json({ error: 'opportunities must be a non-empty array' });
    }

    let processed = 0;
    let failed = 0;

    for (const opp of opportunities) {
      try {
        const docRef = collections.opportunities.doc();
        const context = buildOpportunityContext(opp);
        // eslint-disable-next-line no-await-in-loop
        const embedding = await embedText(context);

        // eslint-disable-next-line no-await-in-loop
        await docRef.set({
          ...opp,
          embedding: Array.from(embedding),
          embeddingDim: embedding.length,
          embeddingModel: process.env.EMBEDDING_MODEL || 'text-embedding-004',
          hasEmbedding: embedding.length > 0,
          embeddingUpdatedAt: FieldValue.serverTimestamp(),
          createdAt: FieldValue.serverTimestamp(),
          createdBy: req.user.uid,
        });
        processed += 1;
      } catch (err) {
        logger.error('[Opportunities] Ingest failed for item:', err);
        failed += 1;
      }
    }

    res.json({
      success: true,
      message: 'Batch ingest complete',
      processed,
      failed,
      processedAt: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Ingest opportunities error:', error);
    res.status(500).json({ error: 'Failed to ingest opportunities', message: error.message });
  }
});

module.exports = router;
