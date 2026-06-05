const express = require('express');
const { verifyToken } = require('../middleware/auth');
const { collections } = require('../config/firebase');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * GET /api/users/profile
 * Get user profile
 */
router.get('/profile', verifyToken, async (req, res) => {
  const startTime = Date.now();
  logger.info(`[GET /profile] Request started for user: ${req.user.uid} (${req.user.email})`);
  
  try {
    logger.debug(`[GET /profile] Fetching user document from Firestore for UID: ${req.user.uid}`);
    const userDoc = await collections.users.doc(req.user.uid).get();
    
    if (!userDoc.exists) {
      logger.warn(`[GET /profile] Profile not found for user: ${req.user.uid} (${req.user.email})`);
      return res.status(404).json({
        error: 'Profile not found',
        message: 'Please complete your profile setup'
      });
    }

    const profile = userDoc.data();
    logger.info(`[GET /profile] Profile retrieved successfully for user: ${req.user.uid} - Duration: ${Date.now() - startTime}ms`);
    logger.debug(`[GET /profile] Profile data keys: ${Object.keys(profile).join(', ')}`);
    
    res.json({
      success: true,
      profile: {
        ...profile,
        uid: req.user.uid,
        email: req.user.email
      }
    });
    
  } catch (error) {
    logger.error(`[GET /profile] Error retrieving profile for user ${req.user.uid}:`, {
      error: error.message,
      stack: error.stack,
      uid: req.user.uid,
      email: req.user.email,
      duration: Date.now() - startTime
    });
    res.status(500).json({
      error: 'Failed to get profile',
      message: error.message
    });
  }
});

/**
 * POST /api/users/debug-profile
 * Debug endpoint to test profile data reception
 */
router.post('/debug-profile', verifyToken, async (req, res) => {
  logger.info(`[DEBUG] Request received from user: ${req.user.uid}`);
  logger.info(`[DEBUG] Request body: ${JSON.stringify(req.body, null, 2)}`);
  logger.info(`[DEBUG] Request headers: ${JSON.stringify(req.headers, null, 2)}`);
  
  res.json({
    success: true,
    receivedBody: req.body,
    user: req.user.uid,
    timestamp: new Date().toISOString()
  });
});

/**
 * POST /api/users/profile
 * Create or update user profile
 */
router.post('/profile', verifyToken, async (req, res) => {
  const startTime = Date.now();
  logger.info(`[POST /profile] Profile save request started for user: ${req.user.uid} (${req.user.email})`);
  
  // COMPREHENSIVE REQUEST DEBUGGING
  logger.info(`[POST /profile] === DETAILED REQUEST DEBUG ===`);
  logger.info(`[POST /profile] Request method: ${req.method}`);
  logger.info(`[POST /profile] Content-Type: ${req.headers['content-type']}`);
  logger.info(`[POST /profile] Content-Length: ${req.headers['content-length']}`);
  logger.info(`[POST /profile] Authorization header present: ${!!req.headers.authorization}`);
  logger.info(`[POST /profile] Request body exists: ${!!req.body}`);
  logger.info(`[POST /profile] Request body type: ${typeof req.body}`);
  logger.info(`[POST /profile] Request body is empty object: ${JSON.stringify(req.body) === '{}'}`);
  logger.info(`[POST /profile] Request body keys: [${Object.keys(req.body || {}).join(', ')}]`);
  logger.info(`[POST /profile] Request body stringified: ${JSON.stringify(req.body)}`);
  logger.info(`[POST /profile] === END REQUEST DEBUG ===`);

  try {
    const { firstName, ageBracket, location, education, employmentStatus, skills, interests, phone } = req.body;
    
    logger.debug(`[POST /profile] Extracted fields:`, {
      firstName: typeof firstName + ' - "' + firstName + '"',
      ageBracket: typeof ageBracket + ' - "' + ageBracket + '"',
      location: typeof location + ' - "' + location + '"',
      education: typeof education + ' - "' + education + '"',
      employmentStatus: typeof employmentStatus + ' - "' + employmentStatus + '"',
      skills: typeof skills + ' - ' + JSON.stringify(skills),
      interests: typeof interests + ' - ' + JSON.stringify(interests),
      phone: typeof phone + ' - "' + phone + '"'
    });

    // Validate required fields
    const validationIssues = [];
    
    if (!firstName || typeof firstName !== 'string' || firstName.trim() === '') {
      validationIssues.push('firstName is required and must be a non-empty string');
    }
    if (!ageBracket || typeof ageBracket !== 'string' || ageBracket.trim() === '') {
      validationIssues.push('ageBracket is required and must be a non-empty string');
    }
    if (!skills) {
      validationIssues.push('skills is required');
    } else if (!Array.isArray(skills)) {
      validationIssues.push('skills must be an array');
    } else if (skills.length === 0) {
      validationIssues.push('skills array cannot be empty');
    }
    if (!interests) {
      validationIssues.push('interests is required');
    } else if (!Array.isArray(interests)) {
      validationIssues.push('interests must be an array');
    } else if (interests.length === 0) {
      validationIssues.push('interests array cannot be empty');
    }

    if (validationIssues.length > 0) {
      logger.warn(`[POST /profile] Validation failed for user ${req.user.uid}: ${validationIssues.join(', ')}`);
      logger.warn(`[POST /profile] Validation failure details:`, {
        issues: validationIssues,
        receivedData: {
          firstName: { value: firstName, type: typeof firstName, length: firstName?.length },
          ageBracket: { value: ageBracket, type: typeof ageBracket, length: ageBracket?.length },
          skills: { value: skills, type: typeof skills, isArray: Array.isArray(skills), length: skills?.length },
          interests: { value: interests, type: typeof interests, isArray: Array.isArray(interests), length: interests?.length },
          phone: { value: phone, type: typeof phone, length: phone?.length }
        },
        rawBody: req.body,
        bodyStringified: JSON.stringify(req.body)
      });
      return res.status(400).json({
        error: 'Validation failed',
        message: 'firstName, ageBracket, skills, and interests are required',
        issues: validationIssues,
        debug: {
          receivedFields: Object.keys(req.body || {}),
          bodyEmpty: Object.keys(req.body || {}).length === 0
        }
      });
    }

    // Check if this is an existing profile
    logger.debug(`[POST /profile] Checking for existing profile for user: ${req.user.uid}`);
    const existingDoc = await collections.users.doc(req.user.uid).get();
    const isNewProfile = !existingDoc.exists;

    const profileData = {
      firstName: firstName.trim(),
      ageBracket,
      location: location?.trim() || '',
      education: education || '',
      employmentStatus: employmentStatus || '',
      skills: skills.map(skill => skill.trim()).filter(Boolean),
      interests: interests.map(interest => interest.trim()).filter(Boolean),
      phone: phone?.trim() || null,
      updatedAt: new Date().toISOString()
    };

    // Only set createdAt for new profiles
    if (isNewProfile) {
      profileData.createdAt = new Date().toISOString();
      logger.info(`[POST /profile] Creating new profile for user: ${req.user.uid}`);
    } else {
      logger.info(`[POST /profile] Updating existing profile for user: ${req.user.uid}`);
    }

    logger.debug(`[POST /profile] Profile data to save:`, JSON.stringify(profileData, null, 2));

    // Save to Firestore
    logger.debug(`[POST /profile] Saving to Firestore for user: ${req.user.uid}`);
    await collections.users.doc(req.user.uid).set(profileData, { merge: true });
    
    logger.info(`[POST /profile] Profile ${isNewProfile ? 'created' : 'updated'} successfully for user: ${req.user.uid} - Duration: ${Date.now() - startTime}ms`);

    // Verify the save by reading back
    logger.debug(`[POST /profile] Verifying save by reading back document for user: ${req.user.uid}`);
    const savedDoc = await collections.users.doc(req.user.uid).get();
    if (!savedDoc.exists) {
      logger.error(`[POST /profile] CRITICAL: Document not found after save for user: ${req.user.uid}`);
      throw new Error('Profile save verification failed - document not found after save');
    }

    const savedData = savedDoc.data();
    logger.debug(`[POST /profile] Verification successful - saved data keys: ${Object.keys(savedData).join(', ')}`);

    res.json({
      success: true,
      message: `Profile ${isNewProfile ? 'created' : 'updated'} successfully`,
      profile: {
        ...profileData,
        uid: req.user.uid,
        email: req.user.email
      }
    });
    
  } catch (error) {
    logger.error(`[POST /profile] Error saving profile for user ${req.user.uid}:`, {
      error: error.message,
      stack: error.stack,
      uid: req.user.uid,
      email: req.user.email,
      body: req.body,
      duration: Date.now() - startTime
    });
    res.status(500).json({
      error: 'Failed to save profile',
      message: error.message
    });
  }
});

/**
 * PATCH /api/users/profile
 * Partially update user profile — only writes fields present in request body.
 */
router.patch('/profile', verifyToken, async (req, res) => {
  try {
    const allowedFields = [
      'firstName', 'ageBracket', 'location', 'education',
      'employmentStatus', 'skills', 'interests', 'phone',
    ];
    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields provided for update' });
    }

    updates.updatedAt = new Date().toISOString();
    await collections.users.doc(req.user.uid).set(updates, { merge: true });

    logger.info(`[PATCH /profile] Profile updated for user: ${req.user.uid}`);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      profile: { ...updates, uid: req.user.uid, email: req.user.email },
    });
  } catch (error) {
    logger.error(`[PATCH /profile] Error for user ${req.user.uid}:`, error);
    res.status(500).json({ error: 'Failed to update profile', message: error.message });
  }
});

// Deprecated saved endpoints — use /api/saved instead
router.get('/saved', verifyToken, (req, res) => {
  res.redirect(301, '/api/saved');
});

router.post('/save/:opportunityId', verifyToken, (req, res) => {
  res.status(410).json({
    error: 'Deprecated endpoint',
    message: 'Use POST /api/saved with body { opportunity: { id, ... } }',
  });
});

router.delete('/save/:opportunityId', verifyToken, (req, res) => {
  res.redirect(301, `/api/saved/${req.params.opportunityId}`);
});

module.exports = router;