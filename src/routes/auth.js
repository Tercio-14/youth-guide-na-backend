const express = require('express');
const { verifyToken } = require('../middleware/auth');
const { collections } = require('../config/firebase');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * POST /api/auth/verify
 * Verify Firebase token and return user info
 */
router.post('/verify', verifyToken, async (req, res) => {
  try {
    // Get user profile from Firestore
    const userDoc = await collections.users.doc(req.user.uid).get();
    
    let userProfile = null;
    if (userDoc.exists) {
      userProfile = userDoc.data();
    }

    res.json({
      success: true,
      user: {
        uid: req.user.uid,
        email: req.user.email,
        emailVerified: req.user.emailVerified,
        name: req.user.name,
        picture: req.user.picture,
        profile: userProfile
      }
    });
    
  } catch (error) {
    logger.error('User verification failed:', error);
    res.status(500).json({
      error: 'Failed to verify user',
      message: error.message
    });
  }
});

/**
 * GET /api/auth/user
 * Get current user info (requires authentication)
 */
router.get('/user', verifyToken, async (req, res) => {
  try {
    // Get user profile from Firestore
    const userDoc = await collections.users.doc(req.user.uid).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({
        error: 'User profile not found',
        message: 'Please complete your profile setup'
      });
    }

    const userProfile = userDoc.data();
    
    res.json({
      success: true,
      user: {
        uid: req.user.uid,
        email: req.user.email,
        emailVerified: req.user.emailVerified,
        profile: userProfile
      }
    });
    
  } catch (error) {
    logger.error('Get user failed:', error);
    res.status(500).json({
      error: 'Failed to get user info',
      message: error.message
    });
  }
});

module.exports = router;