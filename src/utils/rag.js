/**
 * RAG (Retrieval-Augmented Generation) Utility
 * ============================================
 * 
 * This module implements semantic search and ranking for opportunities
 * using TF-IDF and cosine similarity for lightweight vector retrieval.
 * 
 * Features:
 * - Load opportunities from JSON file
 * - Calculate TF-IDF scores for documents
 * - Compute cosine similarity between query and opportunities
 * - Rank and filter results based on relevance and user preferences
 */

const fs = require('fs').promises;
const path = require('path');
const logger = require('./logger');

// Paths to opportunities data
const OPPORTUNITIES_PATH = path.join(__dirname, '../../data/opportunities.json');
const DUMMY_OPPORTUNITIES_PATH = path.join(__dirname, '../../test/dummy-opportunities.json');

// Function to get current data source (will be set by config route)
let getDataSourceConfig = null;

// Cache for loaded opportunities
let opportunitiesCache = null;
let lastLoadTime = null;
let lastDataSource = null; // Track which data source was cached
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Set the data source config getter function
 * This allows the config route to control which data source is used
 */
function setDataSourceConfigGetter(getter) {
  getDataSourceConfig = getter;
  logger.info('[RAG] Data source config getter registered');
}

/**
 * Load opportunities from JSON file with caching
 */
async function loadOpportunities() {
  try {
    const now = Date.now();
    
    // Determine which data source to use
    const currentDataSource = getDataSourceConfig ? getDataSourceConfig() : 'opportunities';
    const dataPath = currentDataSource === 'dummy' ? DUMMY_OPPORTUNITIES_PATH : OPPORTUNITIES_PATH;
    
    // Return cached data if still valid AND from the same data source
    if (opportunitiesCache && 
        lastLoadTime && 
        lastDataSource === currentDataSource &&
        (now - lastLoadTime) < CACHE_TTL) {
      logger.debug('[RAG] Using cached opportunities', {
        source: currentDataSource,
        count: opportunitiesCache.length,
        cacheAge: Math.floor((now - lastLoadTime) / 1000) + 's'
      });
      return opportunitiesCache;
    }

    // Load fresh data
    logger.info('[RAG] Loading opportunities from file', {
      source: currentDataSource,
      path: dataPath
    });
    
    const data = await fs.readFile(dataPath, 'utf8');
    const parsed = JSON.parse(data);
    
    // Filter out example/test opportunities (only for real data)
    // Example opportunities have generic descriptions that score too high
    const allOpportunities = parsed.opportunities || [];
    
    if (currentDataSource === 'dummy') {
      // For dummy data, keep everything
      opportunitiesCache = allOpportunities;
    } else {
      // For real data, filter out examples
      opportunitiesCache = allOpportunities.filter(opp => 
        opp.source !== 'Example Website'
      );
    }
    
    lastLoadTime = now;
    lastDataSource = currentDataSource;
    
    logger.info('[RAG] Loaded opportunities from file', {
      source: currentDataSource,
      total: allOpportunities.length,
      count: opportunitiesCache.length,
      filtered: allOpportunities.length - opportunitiesCache.length,
      sources: parsed.sources || [],
      lastUpdated: parsed.last_updated
    });
    
    return opportunitiesCache;
  } catch (error) {
    logger.error('[RAG] Failed to load opportunities', {
      error: error.message,
      path: OPPORTUNITIES_PATH
    });
    
    // Return empty array as fallback
    return [];
  }
}

/**
 * Tokenize and clean text for processing
 */
function tokenize(text) {
  if (!text || typeof text !== 'string') return [];
  
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ') // Remove punctuation
    .split(/\s+/)
    .filter(token => token.length > 2); // Remove short words
}

/**
 * Calculate Term Frequency for a document
 */
function calculateTF(tokens) {
  const tf = {};
  const totalTokens = tokens.length;
  
  tokens.forEach(token => {
    tf[token] = (tf[token] || 0) + 1;
  });
  
  // Normalize by document length
  Object.keys(tf).forEach(token => {
    tf[token] = tf[token] / totalTokens;
  });
  
  return tf;
}

/**
 * Calculate Inverse Document Frequency
 */
function calculateIDF(documents) {
  const idf = {};
  const totalDocs = documents.length;
  
  // Count document frequency for each term
  const df = {};
  documents.forEach(doc => {
    const uniqueTokens = new Set(doc);
    uniqueTokens.forEach(token => {
      df[token] = (df[token] || 0) + 1;
    });
  });
  
  // Calculate IDF
  Object.keys(df).forEach(term => {
    idf[term] = Math.log(totalDocs / df[term]);
  });
  
  return idf;
}

/**
 * Calculate TF-IDF vector for a document
 */
function calculateTFIDF(tokens, idf) {
  const tf = calculateTF(tokens);
  const tfidf = {};
  
  tokens.forEach(token => {
    tfidf[token] = tf[token] * (idf[token] || 0);
  });
  
  return tfidf;
}

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(vec1, vec2) {
  const keys1 = Object.keys(vec1);
  const keys2 = Object.keys(vec2);
  const allKeys = new Set([...keys1, ...keys2]);
  
  let dotProduct = 0;
  let magnitude1 = 0;
  let magnitude2 = 0;
  
  allKeys.forEach(key => {
    const val1 = vec1[key] || 0;
    const val2 = vec2[key] || 0;
    
    dotProduct += val1 * val2;
    magnitude1 += val1 * val1;
    magnitude2 += val2 * val2;
  });
  
  magnitude1 = Math.sqrt(magnitude1);
  magnitude2 = Math.sqrt(magnitude2);
  
  if (magnitude1 === 0 || magnitude2 === 0) return 0;
  
  return dotProduct / (magnitude1 * magnitude2);
}

/**
 * Create searchable text from opportunity
 * @param {object} opportunity - The opportunity object
 * @param {object} options - Options for creating searchable text
 * @param {boolean} options.excludeLocation - Whether to exclude location from searchable text
 * @param {boolean} options.excludeType - Whether to exclude type from searchable text
 */
function createSearchableText(opportunity, options = {}) {
  const { excludeLocation = false, excludeType = false } = options;
  
  const parts = [
    opportunity.title || '',
    opportunity.description || '',
    opportunity.organization || '',
    opportunity.source || ''
  ];
  
  if (!excludeLocation) {
    parts.push(opportunity.location || '');
  }
  
  if (!excludeType) {
    parts.push(opportunity.type || '');
  }
  
  return parts.join(' ');
}

/**
 * Calculate preference-based boost score
 */
function calculatePreferenceBoost(opportunity, userProfile) {
  let boost = 1.0;
  
  if (!userProfile) return boost;
  
  // Location preference boost
  if (userProfile.location && opportunity.location) {
    const userLoc = userProfile.location.toLowerCase();
    const oppLoc = opportunity.location.toLowerCase();
    
    if (oppLoc.includes(userLoc) || userLoc.includes(oppLoc)) {
      boost += 0.3;
    }
  }
  
  // Skills/interests boost
  const userTerms = [
    ...(userProfile.skills || []),
    ...(userProfile.interests || [])
  ].map(t => t.toLowerCase());
  
  const oppText = createSearchableText(opportunity).toLowerCase();
  
  userTerms.forEach(term => {
    if (oppText.includes(term)) {
      boost += 0.2;
    }
  });
  
  // Type preference (e.g., prefer jobs over training)
  if (userProfile.preferredTypes && Array.isArray(userProfile.preferredTypes)) {
    if (userProfile.preferredTypes.includes(opportunity.type)) {
      boost += 0.15;
    }
  }
  
  // Recency boost (recent opportunities get a small boost)
  if (opportunity.date_posted) {
    const postedDate = new Date(opportunity.date_posted);
    const daysSince = (Date.now() - postedDate.getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysSince < 7) {
      boost += 0.1;
    } else if (daysSince < 30) {
      boost += 0.05;
    }
  }
  
  return boost;
}

/**
 * Main RAG retrieval function
 * 
 * @param {string} query - User's search query
 * @param {object} options - Retrieval options
 * @param {number} options.topK - Number of results to return (default: 5)
 * @param {number} options.minScore - Minimum similarity score (default: 0.1)
 * @param {object} options.userProfile - User profile for personalization
 * @param {string[]} options.filterTypes - Filter by opportunity types (Job, Training, etc.)
 * @param {string} options.filterLocation - Filter by location
 * 
 * @returns {Promise<Array>} - Ranked opportunities with scores
 */
async function retrieveOpportunities(query, options = {}) {
  const {
    topK = 5,
    minScore = 0.01, // Very low default threshold for better recall
    userProfile = null,
    filterTypes = null,
    filterLocation = null
  } = options;
  
  logger.info('[RAG] Starting opportunity retrieval', {
    query,
    topK,
    minScore,
    hasProfile: !!userProfile,
    filterTypes,
    filterLocation
  });
  
  try {
    // Load opportunities
    const opportunities = await loadOpportunities();
    
    if (opportunities.length === 0) {
      logger.warn('[RAG] No opportunities available');
      return [];
    }
    
    // Apply filters
    let filteredOpps = opportunities;
    
    if (filterTypes && Array.isArray(filterTypes) && filterTypes.length > 0) {
      filteredOpps = filteredOpps.filter(opp => 
        filterTypes.includes(opp.type)
      );
      logger.debug('[RAG] Applied type filter', {
        filterTypes,
        remaining: filteredOpps.length
      });
    }
    
    if (filterLocation) {
      const locLower = filterLocation.toLowerCase();
      filteredOpps = filteredOpps.filter(opp => 
        opp.location && opp.location.toLowerCase().includes(locLower)
      );
      logger.debug('[RAG] Applied location filter', {
        filterLocation,
        remaining: filteredOpps.length
      });
    }
    
    if (filteredOpps.length === 0) {
      logger.warn('[RAG] No opportunities after filtering');
      return [];
    }
    
    // Tokenize query
    const queryTokens = tokenize(query);
    
    if (queryTokens.length === 0) {
      logger.warn('[RAG] Empty query after tokenization');
      // Return empty array for empty queries
      return [];
    }
    
    // Check if this is a very generic query (e.g., "looking for a job", "find opportunities")
    const genericQueryTerms = ['looking', 'find', 'want', 'need', 'search', 'searching'];
    const typeTerms = ['job', 'jobs', 'training', 'internship', 'scholarship', 'opportunity', 'opportunities'];
    
    const hasGenericTerm = queryTokens.some(token => genericQueryTerms.includes(token));
    const hasTypeTerm = queryTokens.some(token => typeTerms.includes(token));
    const isVeryGenericQuery = hasGenericTerm && hasTypeTerm && queryTokens.length <= 5;
    
    if (isVeryGenericQuery) {
      logger.info('[RAG] Detected generic query, using random sampling approach', {
        query,
        queryTokens
      });
      
      // For generic queries, return a diverse sample based on recency and type
      // This prevents returning nothing when user just says "find me jobs"
      const scoredOpportunities = filteredOpps.map(opp => {
        const preferenceBoost = calculatePreferenceBoost(opp, userProfile);
        
        // Base score from recency
        let baseScore = 0.05;
        if (opp.date_posted) {
          const postedDate = new Date(opp.date_posted);
          const daysSince = (Date.now() - postedDate.getTime()) / (1000 * 60 * 60 * 24);
          
          if (daysSince < 7) {
            baseScore = 0.20;
          } else if (daysSince < 30) {
            baseScore = 0.15;
          } else if (daysSince < 90) {
            baseScore = 0.10;
          }
        }
        
        // Apply profile boost if available
        const finalScore = baseScore * preferenceBoost;
        
        return {
          ...opp,
          score: finalScore,
          _debug: {
            semanticScore: 0,
            preferenceBoost,
            typeAlignmentBoost: 1.0,
            boosted: preferenceBoost > 1.0,
            genericQuery: true
          }
        };
      });
      
      // Sort by score and return top K
      const ranked = scoredOpportunities
        .sort((a, b) => b.score - a.score)
        .slice(0, topK);
      
      logger.info('[RAG] Retrieval complete', {
        totalCandidates: filteredOpps.length,
        returned: ranked.length,
        genericQuery: true
      });
      
      return ranked;
    }
    
    // Determine what to exclude from searchable text based on filters
    // If we're filtering by location/type, exclude those from semantic search
    // to avoid artificially lowering relevance scores
    const searchOptions = {
      excludeLocation: !!filterLocation,
      excludeType: !!(filterTypes && filterTypes.length > 0)
    };
    
    // Tokenize all documents
    const documents = filteredOpps.map(opp => 
      tokenize(createSearchableText(opp, searchOptions))
    );
    
    // Calculate IDF
    const idf = calculateIDF([queryTokens, ...documents]);
    
    // Calculate TF-IDF for query
    const queryTFIDF = calculateTFIDF(queryTokens, idf);
    
    // Calculate scores for each opportunity
    const scoredOpportunities = filteredOpps.map((opp, index) => {
      const docTFIDF = calculateTFIDF(documents[index], idf);
      const semanticScore = cosineSimilarity(queryTFIDF, docTFIDF);
      const preferenceBoost = calculatePreferenceBoost(opp, userProfile);
      
      // Query-type alignment boost
      // If query mentions a type (training, job, internship, scholarship), boost that type
      let typeAlignmentBoost = 1.0;
      const queryLower = query.toLowerCase();
      const oppType = (opp.type || '').toLowerCase();
      
      if (queryLower.includes('training') && oppType === 'training') {
        typeAlignmentBoost = 2.0; // Strong boost for Training when explicitly requested
      } else if (queryLower.includes('internship') && oppType === 'internship') {
        typeAlignmentBoost = 2.0;
      } else if (queryLower.includes('scholarship') && oppType === 'scholarship') {
        typeAlignmentBoost = 2.0;
      } else if (queryLower.includes('bursary') && oppType === 'scholarship') {
        typeAlignmentBoost = 2.0;
      } else if ((queryLower.includes('job') || queryLower.includes('position')) && oppType === 'job') {
        typeAlignmentBoost = 1.3; // Moderate boost for Jobs (more common)
      }
      
      // Apply preference boost
      // For generic queries with low semantic relevance, profile boost becomes more important
      let finalScore = semanticScore;
      
      if (preferenceBoost > 1.0) {
        if (semanticScore > 0) {
          // Boost existing semantic score multiplicatively
          finalScore = semanticScore * preferenceBoost;
        } else if (preferenceBoost > 1.2) {
          // For strong profile matches (boost > 1.2), assign a base score even if semantic is 0
          // This ensures profile-relevant opportunities appear for generic queries
          // Use a stronger base score to ensure it passes typical thresholds
          finalScore = (preferenceBoost - 1.0) * 0.3; // Convert boost to base score
        }
      }
      
      // Apply query-type alignment boost
      // This ensures Training opportunities rank higher when user asks for "training"
      finalScore = finalScore * typeAlignmentBoost;
      
      return {
        ...opp,
        score: finalScore,
        _debug: {
          semanticScore,
          preferenceBoost,
          typeAlignmentBoost,
          boosted: preferenceBoost > 1.0
        }
      };
    });
    
    // Sort by score and filter by minimum threshold
    const rankedOpportunities = scoredOpportunities
      .filter(opp => opp.score >= minScore)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
    
    logger.info('[RAG] Retrieval complete', {
      totalOpportunities: opportunities.length,
      afterFilters: filteredOpps.length,
      aboveThreshold: scoredOpportunities.filter(o => o.score >= minScore).length,
      returned: rankedOpportunities.length,
      topScore: rankedOpportunities[0]?.score.toFixed(4) || 'N/A'
    });
    
    return rankedOpportunities;
    
  } catch (error) {
    logger.error('[RAG] Retrieval failed', {
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}

/**
 * Two-Stage Hybrid RAG: Fast TF-IDF filtering + AI reranking
 * 
 * This is the recommended method for production use as it combines:
 * - Fast Stage 1 filtering (TF-IDF) to get top 20 candidates
 * - Accurate Stage 2 AI reranking to get final top 5
 * 
 * OFFLINE MODE: When isOfflineMode=true, forces dummy data and skips AI reranking
 * 
 * @param {string} query - User's search query
 * @param {object} options - Retrieval options
 * @param {boolean} isOfflineMode - If true, use dummy data and skip AI reranking
 * @returns {Promise<Object>} - { opportunities: Array, isOffline: boolean }
 */
async function hybridRetrieveOpportunities(query, options = {}, isOfflineMode = false) {
  try {
    // OFFLINE MODE: Force dummy data source and skip AI reranking
    if (isOfflineMode) {
      logger.info('[RAG] Offline mode: Using dummy data, skipping AI reranking');
      
      // Temporarily override data source to dummy
      const originalGetter = getDataSourceConfig;
      getDataSourceConfig = () => 'dummy';
      
      try {
        // Use Stage 1 only (TF-IDF) - no AI reranking
        const results = await retrieveOpportunities(query, {
          topK: options.topK || 5,
          ...options
        });
        
        // Restore original getter
        getDataSourceConfig = originalGetter;
        
        logger.info(`[RAG] Offline mode returned ${results.length} opportunities`);
        
        return {
          opportunities: results,
          isOffline: true,
          usedAI: false,
          dataSource: 'dummy'
        };
      } catch (error) {
        // Restore getter even on error
        getDataSourceConfig = originalGetter;
        throw error;
      }
    }
    
    // ONLINE MODE: Use normal hybrid retrieval with AI reranking
    const { hybridRetrieve } = require('./ai-reranker');
    
    // Use current retrieveOpportunities as Stage 1
    const results = await hybridRetrieve(retrieveOpportunities, query, {
      stage1TopK: 20,        // Get 20 candidates from Stage 1
      stage2TopK: options.topK || 5,  // Return 5 after AI reranking
      stage2MinScore: 30,    // Minimum AI score (0-100)
      ...options
    });
    
    return {
      opportunities: results,
      isOffline: false,
      usedAI: true,
      dataSource: getDataSourceConfig ? getDataSourceConfig() : 'opportunities'
    };
    
  } catch (error) {
    logger.error('[RAG] Hybrid retrieval failed', {
      error: error.message,
      isOfflineMode
    });
    throw error;
  }
}

/**
 * Clear opportunities cache (useful after scraping new data)
 */
function clearCache() {
  opportunitiesCache = null;
  lastLoadTime = null;
  logger.info('[RAG] Cache cleared');
}

module.exports = {
  retrieveOpportunities,          // Stage 1 only (TF-IDF)
  hybridRetrieveOpportunities,    // Two-Stage Hybrid (Recommended)
  loadOpportunities,
  clearCache,
  setDataSourceConfigGetter       // Allow config route to control data source
};
