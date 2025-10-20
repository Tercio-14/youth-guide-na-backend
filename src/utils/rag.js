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

// Path to opportunities data
const OPPORTUNITIES_PATH = path.join(__dirname, '../../data/opportunities.json');

// Cache for loaded opportunities
let opportunitiesCache = null;
let lastLoadTime = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Load opportunities from JSON file with caching
 */
async function loadOpportunities() {
  try {
    const now = Date.now();
    
    // Return cached data if still valid
    if (opportunitiesCache && lastLoadTime && (now - lastLoadTime) < CACHE_TTL) {
      logger.debug('[RAG] Using cached opportunities', {
        count: opportunitiesCache.length,
        cacheAge: Math.floor((now - lastLoadTime) / 1000) + 's'
      });
      return opportunitiesCache;
    }

    // Load fresh data
    const data = await fs.readFile(OPPORTUNITIES_PATH, 'utf8');
    const parsed = JSON.parse(data);
    
    opportunitiesCache = parsed.opportunities || [];
    lastLoadTime = now;
    
    logger.info('[RAG] Loaded opportunities from file', {
      count: opportunitiesCache.length,
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
 */
function createSearchableText(opportunity) {
  const parts = [
    opportunity.title || '',
    opportunity.description || '',
    opportunity.organization || '',
    opportunity.location || '',
    opportunity.type || '',
    opportunity.source || ''
  ];
  
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
    minScore = 0.05, // Lower default threshold for better recall
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
      // Return random sample for empty queries
      return filteredOpps
        .sort(() => 0.5 - Math.random())
        .slice(0, topK)
        .map(opp => ({ ...opp, score: 0.5 }));
    }
    
    // Tokenize all documents
    const documents = filteredOpps.map(opp => 
      tokenize(createSearchableText(opp))
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
      const finalScore = semanticScore * preferenceBoost;
      
      return {
        ...opp,
        score: finalScore,
        _debug: {
          semanticScore,
          preferenceBoost
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
 * Clear opportunities cache (useful after scraping new data)
 */
function clearCache() {
  opportunitiesCache = null;
  lastLoadTime = null;
  logger.info('[RAG] Cache cleared');
}

module.exports = {
  retrieveOpportunities,
  loadOpportunities,
  clearCache
};
