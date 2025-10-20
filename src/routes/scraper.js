/**
 * Scraper Routes - Manual scraping trigger endpoints
 * Protected admin-only endpoints to trigger web scraping
 */

const express = require('express');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;

const router = express.Router();

/**
 * POST /api/scrape
 * Trigger manual scraping of all configured sources
 * Protected endpoint - admin only
 */
router.post('/scrape', async (req, res) => {
  console.log('🕷️ [Scraper API] Manual scrape triggered');
  console.log('📅 [Scraper API] Timestamp:', new Date().toISOString());
  
  const startTime = Date.now();
  
  try {
    // Path to Python scraper script
    const scraperPath = path.join(__dirname, '..', '..', 'scrapers', 'run_all.py');
    
    console.log('🔍 [Scraper API] Scraper path:', scraperPath);
    
    // Check if scraper exists
    try {
      await fs.access(scraperPath);
    } catch (error) {
      console.error('❌ [Scraper API] Scraper script not found:', scraperPath);
      return res.status(500).json({
        success: false,
        error: 'Scraper script not found',
        path: scraperPath
      });
    }
    
    // Spawn Python process
    console.log('🐍 [Scraper API] Spawning Python process...');
    const pythonProcess = spawn('python3', [scraperPath], {
      cwd: path.join(__dirname, '..', '..', 'scrapers'),
      env: { ...process.env }
    });
    
    let stdout = '';
    let stderr = '';
    
    // Collect stdout
    pythonProcess.stdout.on('data', (data) => {
      const output = data.toString();
      stdout += output;
      // Log each line from Python
      output.split('\n').filter(line => line.trim()).forEach(line => {
        console.log(`[Scraper] ${line}`);
      });
    });
    
    // Collect stderr
    pythonProcess.stderr.on('data', (data) => {
      const output = data.toString();
      stderr += output;
      console.error(`[Scraper Error] ${output}`);
    });
    
    // Handle process completion
    pythonProcess.on('close', async (code) => {
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      
      console.log(`🏁 [Scraper API] Process exited with code ${code}`);
      console.log(`⏱️ [Scraper API] Total duration: ${duration}s`);
      
      if (code !== 0) {
        console.error('❌ [Scraper API] Scraping failed');
        return res.status(500).json({
          success: false,
          error: 'Scraping process failed',
          exitCode: code,
          stderr: stderr,
          duration: parseFloat(duration)
        });
      }
      
      // Try to read the output file
      const outputPath = path.join(__dirname, '..', '..', 'data', 'opportunities.json');
      
      try {
        const fileStats = await fs.stat(outputPath);
        const fileContent = await fs.readFile(outputPath, 'utf-8');
        const data = JSON.parse(fileContent);
        
        console.log('✅ [Scraper API] opportunities.json updated successfully');
        console.log(`📊 [Scraper API] Total opportunities: ${data.total_count}`);
        console.log(`📁 [Scraper API] File size: ${fileStats.size} bytes`);
        console.log(`🌐 [Scraper API] Sources: ${data.sources.join(', ')}`);
        
        // Return success response
        res.json({
          success: true,
          scrapedCount: data.total_count,
          sources: data.sources,
          timestamp: data.last_updated,
          duration: parseFloat(duration),
          fileSize: fileStats.size,
          scraperStats: data.scraper_stats || {}
        });
        
      } catch (error) {
        console.error('❌ [Scraper API] Error reading output file:', error.message);
        res.status(500).json({
          success: false,
          error: 'Failed to read scraped data',
          message: error.message,
          duration: parseFloat(duration)
        });
      }
    });
    
    // Handle process error
    pythonProcess.on('error', (error) => {
      console.error('❌ [Scraper API] Failed to start Python process:', error.message);
      
      // Check if Python is installed
      if (error.code === 'ENOENT') {
        return res.status(500).json({
          success: false,
          error: 'Python not found',
          message: 'Python3 is not installed or not in PATH',
          hint: 'Install Python 3 and ensure it is accessible as "python3"'
        });
      }
      
      res.status(500).json({
        success: false,
        error: 'Failed to start scraper',
        message: error.message
      });
    });
    
  } catch (error) {
    console.error('❌ [Scraper API] Unexpected error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * GET /api/scrape/status
 * Get the status of the most recent scrape
 */
router.get('/status', async (req, res) => {
  try {
    const outputPath = path.join(__dirname, '..', '..', 'data', 'opportunities.json');
    
    // Check if file exists
    try {
      const fileStats = await fs.stat(outputPath);
      const fileContent = await fs.readFile(outputPath, 'utf-8');
      const data = JSON.parse(fileContent);
      
      res.json({
        exists: true,
        lastUpdated: data.last_updated,
        totalCount: data.total_count,
        sources: data.sources,
        fileSize: fileStats.size,
        scraperStats: data.scraper_stats || {}
      });
      
    } catch (error) {
      res.json({
        exists: false,
        message: 'No scrape data available yet'
      });
    }
    
  } catch (error) {
    console.error('❌ [Scraper API] Error checking status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check scraper status',
      message: error.message
    });
  }
});

/**
 * GET /api/scrape/data
 * Get the raw scraped data (for debugging)
 */
router.get('/data', async (req, res) => {
  try {
    const outputPath = path.join(__dirname, '..', '..', 'data', 'opportunities.json');
    
    const fileContent = await fs.readFile(outputPath, 'utf-8');
    const data = JSON.parse(fileContent);
    
    // Optional: limit number of opportunities returned
    const limit = parseInt(req.query.limit) || data.opportunities.length;
    
    res.json({
      ...data,
      opportunities: data.opportunities.slice(0, limit)
    });
    
  } catch (error) {
    console.error('❌ [Scraper API] Error reading data:', error);
    res.status(404).json({
      success: false,
      error: 'Scraped data not found',
      message: 'Run POST /api/scrape first to generate data'
    });
  }
});

module.exports = router;
