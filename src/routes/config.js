const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const { verifyToken } = require('../middleware/auth');

// Store current data source configuration
let currentDataSource = 'opportunities'; // 'opportunities' or 'dummy'

/**
 * GET /api/config/data-source
 * Get the current data source being used
 */
router.get('/data-source', (req, res) => {
  try {
    const dataSourcePath = currentDataSource === 'dummy' 
      ? 'test/dummy-opportunities.json'
      : 'data/opportunities.json';

    logger.info('[Config] Data source status requested', {
      currentSource: currentDataSource,
      path: dataSourcePath
    });

    res.status(200).json({
      success: true,
      dataSource: currentDataSource,
      path: dataSourcePath,
      description: currentDataSource === 'dummy' 
        ? 'Using dummy test data (25 opportunities)'
        : 'Using real scraped opportunities data',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('[Config] Failed to get data source status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get data source status',
      message: error.message
    });
  }
});

/**
 * POST /api/config/data-source
 * Switch between opportunities.json and dummy-opportunities.json
 * Requires authentication to prevent unauthorized switching
 */
router.post('/data-source', verifyToken, (req, res) => {
  try {
    const { source } = req.body;

    // Validate source parameter
    if (!source || !['opportunities', 'dummy'].includes(source)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid source parameter',
        message: 'Source must be either "opportunities" or "dummy"',
        currentSource: currentDataSource
      });
    }

    // Check if already using the requested source
    if (currentDataSource === source) {
      logger.info('[Config] Data source unchanged', {
        source: currentDataSource,
        requestedBy: req.user.uid
      });

      return res.status(200).json({
        success: true,
        message: `Already using ${source} data`,
        dataSource: currentDataSource,
        changed: false
      });
    }

    // Switch data source
    const previousSource = currentDataSource;
    currentDataSource = source;

    logger.info('[Config] Data source switched', {
      from: previousSource,
      to: currentDataSource,
      requestedBy: req.user.uid,
      timestamp: new Date().toISOString()
    });

    res.status(200).json({
      success: true,
      message: `Switched to ${source} data`,
      previousSource,
      currentSource: currentDataSource,
      changed: true,
      path: currentDataSource === 'dummy' 
        ? 'test/dummy-opportunities.json'
        : 'data/opportunities.json',
      note: 'Cache will be cleared on next opportunity request',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('[Config] Failed to switch data source:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to switch data source',
      message: error.message
    });
  }
});

/**
 * POST /api/config/reset
 * Reset to default data source (opportunities.json)
 * Requires authentication
 */
router.post('/reset', verifyToken, (req, res) => {
  try {
    const previousSource = currentDataSource;
    currentDataSource = 'opportunities';

    logger.info('[Config] Data source reset to default', {
      from: previousSource,
      to: currentDataSource,
      requestedBy: req.user.uid
    });

    res.status(200).json({
      success: true,
      message: 'Reset to default data source (opportunities.json)',
      previousSource,
      currentSource: currentDataSource,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('[Config] Failed to reset data source:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset data source',
      message: error.message
    });
  }
});

// Export router and getter function for current data source
module.exports = {
  router,
  getCurrentDataSource: () => currentDataSource
};
