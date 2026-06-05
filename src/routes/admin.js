const express = require('express');
const { admin, collections } = require('../config/firebase');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * GET /api/admin/stats
 * System statistics (admin only).
 */
router.get('/stats', verifyToken, requireAdmin, async (req, res) => {
  try {
    const [usersSnap, oppsSnap, chatsSnap] = await Promise.all([
      collections.users.get(),
      collections.opportunities.get(),
      collections.chats.get(),
    ]);

    const byCategory = {};
    oppsSnap.docs.forEach((doc) => {
      const cat = doc.data().category || 'uncategorized';
      byCategory[cat] = (byCategory[cat] || 0) + 1;
    });

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentlyAdded = oppsSnap.docs.filter((doc) => {
      const createdAt = doc.data().createdAt?.toDate?.();
      return createdAt && createdAt > sevenDaysAgo;
    }).length;

    res.json({
      success: true,
      stats: {
        users: { total: usersSnap.size },
        opportunities: { total: oppsSnap.size, byCategory, recentlyAdded },
        chats: { totalConversations: chatsSnap.size },
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('Get admin stats error:', error);
    res.status(500).json({ error: 'Failed to get statistics', message: error.message });
  }
});

/**
 * POST /api/admin/recompute
 * Trigger embedding recomputation via the ingest script logic (admin only).
 */
router.post('/recompute', verifyToken, requireAdmin, async (req, res) => {
  try {
    logger.info(`[Admin] Embedding recomputation requested by: ${req.user.uid}`);
    // Recomputation is done by running `node scripts/ingest.js --force` on the server.
    // This endpoint documents the action and could be extended to spawn the process.
    res.json({
      success: true,
      message: 'Run `node scripts/ingest.js --force` on the server to recompute all embeddings.',
      startedAt: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Recompute embeddings error:', error);
    res.status(500).json({ error: 'Failed to start recomputation', message: error.message });
  }
});

/**
 * GET /api/admin/users
 * List all users with cursor-based pagination (admin only).
 */
router.get('/users', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { limit: limitParam = '50', startAfter } = req.query;
    const limitVal = Math.min(parseInt(limitParam, 10) || 50, 200);

    let query = collections.users.orderBy('createdAt', 'desc').limit(limitVal);

    if (startAfter) {
      const cursor = await collections.users.doc(startAfter).get();
      if (cursor.exists) {
        query = query.startAfter(cursor);
      }
    }

    const snapshot = await query.get();
    const users = snapshot.docs.map((doc) => ({
      uid: doc.id,
      ...doc.data(),
    }));

    const lastDoc = snapshot.docs[snapshot.docs.length - 1];

    res.json({
      success: true,
      users,
      hasMore: snapshot.size === limitVal,
      nextCursor: lastDoc?.id || null,
      total: snapshot.size,
    });
  } catch (error) {
    logger.error('Get admin users error:', error);
    res.status(500).json({ error: 'Failed to get users', message: error.message });
  }
});

/**
 * PUT /api/admin/users/:userId
 * Update user admin status and metadata (admin only).
 * Sets Firebase Auth custom claim `admin` and syncs Firestore.
 * Note: custom claim changes require the user to re-authenticate to take effect.
 */
router.put('/users/:userId', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { isAdmin, isActive, notes } = req.body;

    // Update custom claim in Firebase Auth
    if (typeof isAdmin === 'boolean') {
      await admin.auth().setCustomUserClaims(userId, { admin: isAdmin });
      logger.info(`[Admin] Set admin claim for ${userId}: ${isAdmin} by ${req.user.uid}`);
    }

    // Sync Firestore document
    const firestoreUpdates = {
      updatedAt: new Date().toISOString(),
      updatedBy: req.user.uid,
    };
    if (typeof isAdmin === 'boolean') firestoreUpdates.isAdmin = isAdmin;
    if (typeof isActive === 'boolean') firestoreUpdates.isActive = isActive;
    if (notes !== undefined) firestoreUpdates.adminNotes = notes;

    await collections.users.doc(userId).set(firestoreUpdates, { merge: true });

    res.json({
      success: true,
      message: 'User updated. User must re-authenticate for claim changes to take effect.',
      userId,
      updatedBy: req.user.uid,
      updatedAt: firestoreUpdates.updatedAt,
    });
  } catch (error) {
    logger.error('Update user error:', error);
    if (error.code === 'auth/user-not-found') {
      return res.status(404).json({ error: 'User not found in Firebase Auth' });
    }
    res.status(500).json({ error: 'Failed to update user', message: error.message });
  }
});

/**
 * DELETE /api/admin/users/:userId
 * Delete user from Firebase Auth and Firestore (admin only).
 * A reason is required for audit purposes.
 */
router.delete('/users/:userId', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({
        error: 'Deletion reason required',
        message: 'Please provide a reason for user deletion',
      });
    }

    // Delete from Firebase Auth
    await admin.auth().deleteUser(userId);

    // Delete Firestore user document
    await collections.users.doc(userId).delete();

    // Subcollections (savedOpportunities, etc.) are not auto-deleted.
    logger.warn(`[Admin] User ${userId} deleted by ${req.user.uid}. Reason: ${reason}. Subcollections may remain.`);

    res.json({
      success: true,
      message: 'User deleted from Auth and Firestore. Subcollections were not deleted.',
      userId,
      deletedBy: req.user.uid,
      reason,
      deletedAt: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Delete user error:', error);
    if (error.code === 'auth/user-not-found') {
      return res.status(404).json({ error: 'User not found in Firebase Auth' });
    }
    res.status(500).json({ error: 'Failed to delete user', message: error.message });
  }
});

module.exports = router;
