/**
 * Feedback Routes
 * ===============
 * 
 * Handles user feedback on opportunity recommendations
 */

const express = require('express');
const { verifyToken } = require('../middleware/auth');
const { collections, admin } = require('../config/firebase');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * POST /api/feedback
 * Submit feedback on an opportunity recommendation
 */
router.post('/', verifyToken, async (req, res) => {
  try {
    const { opportunityId, feedback, conversationId } = req.body;
    const userId = req.user.uid;

    // Validate input
    if (!opportunityId) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'opportunityId is required'
      });
    }

    if (!feedback || !['helpful', 'not_relevant'].includes(feedback)) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'feedback must be either "helpful" or "not_relevant"'
      });
    }

    logger.info('[Feedback] Submitting feedback', {
      userId,
      opportunityId,
      feedback,
      conversationId
    });

    // Create feedback document
    const feedbackData = {
      userId,
      opportunityId,
      feedback, // 'helpful' or 'not_relevant'
      conversationId: conversationId || null,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: new Date().toISOString()
    };

    // Store in Firestore
    const feedbackRef = await collections.feedback.add(feedbackData);

    logger.info('[Feedback] Feedback submitted successfully', {
      feedbackId: feedbackRef.id,
      userId,
      opportunityId,
      feedback
    });

    res.status(201).json({
      success: true,
      message: 'Feedback submitted successfully',
      feedbackId: feedbackRef.id
    });

  } catch (error) {
    logger.error('[Feedback] Failed to submit feedback', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.uid
    });

    res.status(500).json({
      error: 'Server Error',
      message: 'Failed to submit feedback'
    });
  }
});

/**
 * GET /api/feedback/opportunity/:opportunityId
 * Get feedback stats for a specific opportunity (admin only)
 */
router.get('/opportunity/:opportunityId', verifyToken, async (req, res) => {
  try {
    const { opportunityId } = req.params;

    logger.info('[Feedback] Fetching feedback stats', {
      opportunityId,
      userId: req.user.uid
    });

    // Query feedback for this opportunity
    const feedbackSnapshot = await collections.feedback
      .where('opportunityId', '==', opportunityId)
      .get();

    const stats = {
      helpful: 0,
      not_relevant: 0,
      total: feedbackSnapshot.size
    };

    feedbackSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.feedback === 'helpful') {
        stats.helpful++;
      } else if (data.feedback === 'not_relevant') {
        stats.not_relevant++;
      }
    });

    res.json({
      opportunityId,
      stats
    });

  } catch (error) {
    logger.error('[Feedback] Failed to fetch feedback stats', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      error: 'Server Error',
      message: 'Failed to fetch feedback stats'
    });
  }
});

/**
 * GET /api/feedback/user
 * Get user's feedback history
 */
router.get('/user', verifyToken, async (req, res) => {
  try {
    const userId = req.user.uid;

    logger.info('[Feedback] Fetching user feedback history', { userId });

    // Query user's feedback
    const feedbackSnapshot = await collections.feedback
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(100)
      .get();

    const feedbackList = [];
    feedbackSnapshot.forEach(doc => {
      feedbackList.push({
        id: doc.id,
        ...doc.data()
      });
    });

    res.json({
      feedback: feedbackList,
      count: feedbackList.length
    });

  } catch (error) {
    logger.error('[Feedback] Failed to fetch user feedback', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.uid
    });

    res.status(500).json({
      error: 'Server Error',
      message: 'Failed to fetch feedback history'
    });
  }
});

module.exports = router;
