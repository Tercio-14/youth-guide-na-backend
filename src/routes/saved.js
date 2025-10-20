/**
 * Saved Opportunities Route
 * =========================
 * 
 * Handles saving, retrieving, and managing user's saved opportunities.
 * Stores data in Firestore under users/{userId}/savedOpportunities collection.
 */

const express = require('express');
const { verifyToken } = require('../middleware/auth');
const { collections, admin } = require('../config/firebase');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * GET /api/saved
 * Get all saved opportunities for the authenticated user
 */
router.get('/', verifyToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    
    logger.info('[Saved] Fetching saved opportunities', { userId });
    
    const savedRef = collections.users.doc(userId).collection('savedOpportunities');
    const snapshot = await savedRef.orderBy('savedAt', 'desc').get();
    
    const opportunities = [];
    snapshot.forEach(doc => {
      opportunities.push({
        id: doc.id,
        ...doc.data(),
        savedAt: doc.data().savedAt?.toDate().toISOString() || null
      });
    });
    
    logger.info('[Saved] Retrieved saved opportunities', {
      userId,
      count: opportunities.length
    });
    
    res.json({
      success: true,
      count: opportunities.length,
      opportunities
    });
    
  } catch (error) {
    logger.error('[Saved] Failed to fetch saved opportunities', {
      error: error.message,
      userId: req.user?.uid
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to fetch saved opportunities'
    });
  }
});

/**
 * POST /api/saved
 * Save an opportunity for the authenticated user
 * 
 * Body:
 * {
 *   opportunity: { id, title, description, type, organization, location, url, ... }
 * }
 */
router.post('/', verifyToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { opportunity } = req.body;
    
    if (!opportunity || !opportunity.id) {
      return res.status(400).json({
        success: false,
        error: 'Opportunity data with id is required'
      });
    }
    
    logger.info('[Saved] Saving opportunity', {
      userId,
      opportunityId: opportunity.id,
      title: opportunity.title
    });
    
    const savedRef = collections.users
      .doc(userId)
      .collection('savedOpportunities')
      .doc(opportunity.id);
    
    const FieldValue = admin.firestore.FieldValue;
    
    await savedRef.set({
      ...opportunity,
      savedAt: FieldValue.serverTimestamp(),
      userId
    });
    
    logger.info('[Saved] Successfully saved opportunity', {
      userId,
      opportunityId: opportunity.id
    });
    
    res.json({
      success: true,
      message: 'Opportunity saved successfully',
      opportunityId: opportunity.id
    });
    
  } catch (error) {
    logger.error('[Saved] Failed to save opportunity', {
      error: error.message,
      userId: req.user?.uid
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to save opportunity'
    });
  }
});

/**
 * DELETE /api/saved/:opportunityId
 * Remove a saved opportunity
 */
router.delete('/:opportunityId', verifyToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { opportunityId } = req.params;
    
    logger.info('[Saved] Removing saved opportunity', {
      userId,
      opportunityId
    });
    
    const savedRef = collections.users
      .doc(userId)
      .collection('savedOpportunities')
      .doc(opportunityId);
    
    await savedRef.delete();
    
    logger.info('[Saved] Successfully removed saved opportunity', {
      userId,
      opportunityId
    });
    
    res.json({
      success: true,
      message: 'Opportunity removed successfully',
      opportunityId
    });
    
  } catch (error) {
    logger.error('[Saved] Failed to remove saved opportunity', {
      error: error.message,
      userId: req.user?.uid,
      opportunityId: req.params.opportunityId
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to remove saved opportunity'
    });
  }
});

/**
 * GET /api/saved/check/:opportunityId
 * Check if an opportunity is saved
 */
router.get('/check/:opportunityId', verifyToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { opportunityId } = req.params;
    
    const savedRef = collections.users
      .doc(userId)
      .collection('savedOpportunities')
      .doc(opportunityId);
    
    const doc = await savedRef.get();
    
    res.json({
      success: true,
      isSaved: doc.exists,
      opportunityId
    });
    
  } catch (error) {
    logger.error('[Saved] Failed to check saved status', {
      error: error.message,
      userId: req.user?.uid,
      opportunityId: req.params.opportunityId
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to check saved status'
    });
  }
});

/**
 * POST /api/saved/batch-check
 * Check multiple opportunities' saved status at once
 * 
 * Body: { opportunityIds: ['id1', 'id2', ...] }
 */
router.post('/batch-check', verifyToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { opportunityIds } = req.body;
    
    if (!Array.isArray(opportunityIds)) {
      return res.status(400).json({
        success: false,
        error: 'opportunityIds must be an array'
      });
    }
    
    const savedRef = collections.users
      .doc(userId)
      .collection('savedOpportunities');
    
    const savedStatus = {};
    
    // Batch get all documents
    const promises = opportunityIds.map(id => savedRef.doc(id).get());
    const docs = await Promise.all(promises);
    
    docs.forEach((doc, index) => {
      savedStatus[opportunityIds[index]] = doc.exists;
    });
    
    res.json({
      success: true,
      savedStatus
    });
    
  } catch (error) {
    logger.error('[Saved] Failed to batch check saved status', {
      error: error.message,
      userId: req.user?.uid
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to check saved status'
    });
  }
});

module.exports = router;
