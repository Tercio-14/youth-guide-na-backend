const express = require('express');
const { verifyToken, requireAdmin, optionalAuth } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/opportunities
 * List and filter opportunities (public endpoint)
 */
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { category, skills, location, cost, limit = 50 } = req.query;
    
    // TODO: Implement opportunity filtering and retrieval from Firestore
    const opportunities = [];

    res.json({
      success: true,
      opportunities,
      total: opportunities.length,
      filters: { category, skills, location, cost },
      limit: parseInt(limit)
    });
    
  } catch (error) {
    console.error('Get opportunities error:', error);
    res.status(500).json({
      error: 'Failed to retrieve opportunities',
      message: error.message
    });
  }
});

/**
 * POST /api/opportunities
 * Create new opportunity (admin only)
 */
router.post('/', verifyToken, requireAdmin, async (req, res) => {
  try {
    const {
      title,
      category,
      description,
      skillsRequired,
      cost,
      location,
      contact,
      source
    } = req.body;

    // Basic validation
    if (!title || !category || !description || !cost || !location || !contact || !source) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'title, category, description, cost, location, contact, and source are required'
      });
    }

    // TODO: Implement opportunity creation and embedding computation
    const opportunityId = `opp_${Date.now()}`;

    res.status(201).json({
      success: true,
      message: 'Opportunity created successfully',
      opportunityId,
      opportunity: {
        id: opportunityId,
        title,
        category,
        description,
        skillsRequired: skillsRequired || [],
        cost,
        location,
        contact,
        source,
        createdAt: new Date().toISOString(),
        createdBy: req.user.uid
      }
    });
    
  } catch (error) {
    console.error('Create opportunity error:', error);
    res.status(500).json({
      error: 'Failed to create opportunity',
      message: error.message
    });
  }
});

/**
 * PUT /api/opportunities/:id
 * Update opportunity (admin only)
 */
router.put('/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // TODO: Implement opportunity update and re-compute embeddings if needed

    res.json({
      success: true,
      message: 'Opportunity updated successfully',
      opportunityId: id,
      updates
    });
    
  } catch (error) {
    console.error('Update opportunity error:', error);
    res.status(500).json({
      error: 'Failed to update opportunity',
      message: error.message
    });
  }
});

/**
 * DELETE /api/opportunities/:id
 * Delete opportunity (admin only)
 */
router.delete('/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // TODO: Implement opportunity deletion

    res.json({
      success: true,
      message: 'Opportunity deleted successfully',
      opportunityId: id
    });
    
  } catch (error) {
    console.error('Delete opportunity error:', error);
    res.status(500).json({
      error: 'Failed to delete opportunity',
      message: error.message
    });
  }
});

/**
 * POST /api/ingest
 * Batch ingest opportunities with embedding computation (admin only)
 */
router.post('/ingest', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { opportunities } = req.body;

    if (!Array.isArray(opportunities) || opportunities.length === 0) {
      return res.status(400).json({
        error: 'Invalid input',
        message: 'opportunities must be a non-empty array'
      });
    }

    // TODO: Implement batch ingestion with embedding computation

    res.json({
      success: true,
      message: 'Opportunities ingested successfully',
      count: opportunities.length,
      processedAt: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Ingest opportunities error:', error);
    res.status(500).json({
      error: 'Failed to ingest opportunities',
      message: error.message
    });
  }
});

module.exports = router;