/**
 * AI-Based Opportunity Reranking Module
 * =====================================
 * 
 * This module uses LLM to intelligently score and rerank opportunities
 * based on user query and profile context. It's used in Stage 2 of the
 * Two-Stage Hybrid RAG system.
 * 
 * Features:
 * - Semantic understanding of skill matches (e.g., "cooking" → "chef")
 * - Context-aware relevance scoring
 * - Batch processing for efficiency
 * - Result caching to reduce API costs
 */

const logger = require('./logger');
const { generateChatCompletion } = require('./llm');

/**
 * Score a single opportunity's relevance to user query and profile
 * 
 * @param {string} userQuery - The user's search query
 * @param {object} userProfile - User profile with skills, interests, location
 * @param {object} opportunity - The opportunity to score
 * @returns {Promise<object>} - Object with score (0-100) and reasoning
 */
async function scoreOpportunityRelevance(userQuery, userProfile, opportunity) {
  try {
    const prompt = buildScoringPrompt(userQuery, userProfile, opportunity);
    
    const response = await generateChatCompletion({
      messages: [
        {
          role: 'system',
          content: 'You are an expert career counselor who evaluates job/opportunity matches. Rate relevance accurately and consistently. Always respond with valid JSON.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.1, // Low temperature for consistent scoring
      maxTokens: 150 // Increased to accommodate JSON response with reasoning
    });
    
    // Parse JSON response
    const scoreText = response.text.trim();
    let parsedResponse;
    
    try {
      // Try to parse as JSON
      parsedResponse = JSON.parse(scoreText);
      
      // Validate structure
      if (typeof parsedResponse.score !== 'number') {
        throw new Error('Invalid JSON structure: missing score field');
      }
      
      // Validate score is in range
      const validScore = Math.max(0, Math.min(100, parsedResponse.score));
      
      return {
        score: validScore,
        reasoning: parsedResponse.reasoning || 'No reasoning provided'
      };
      
    } catch (parseError) {
      // Fallback: try to extract just the number if JSON parsing fails
      logger.warn('[AI Reranker] JSON parse failed, falling back to number extraction', {
        response: scoreText.substring(0, 100),
        opportunityId: opportunity.id
      });
      
      const score = parseInt(scoreText.match(/\d+/)?.[0] || '50');
      return {
        score: Math.max(0, Math.min(100, score)),
        reasoning: 'Legacy numeric response'
      };
    }
    
  } catch (error) {
    logger.error('[AI Reranker] Failed to score opportunity', {
      error: error.message,
      opportunityId: opportunity.id
    });
    // Return neutral score on error to not exclude the opportunity
    return {
      score: 50,
      reasoning: 'Scoring error - default neutral score'
    };
  }
}

/**
 * Build the scoring prompt for LLM evaluation
 */
function buildScoringPrompt(userQuery, userProfile, opportunity) {
  // Build profile context
  const profileContext = [];
  
  if (userProfile) {
    if (userProfile.skills && userProfile.skills.length > 0) {
      profileContext.push(`Skills: ${userProfile.skills.join(', ')}`);
    }
    if (userProfile.interests && userProfile.interests.length > 0) {
      profileContext.push(`Interests: ${userProfile.interests.join(', ')}`);
    }
    if (userProfile.location) {
      profileContext.push(`Location: ${userProfile.location}`);
    }
    if (userProfile.education) {
      profileContext.push(`Education Level: ${userProfile.education}`);
    }
    if (userProfile.preferredTypes && userProfile.preferredTypes.length > 0) {
      profileContext.push(`Preferred Types: ${userProfile.preferredTypes.join(', ')}`);
    }
  }
  
  const profileStr = profileContext.length > 0 
    ? profileContext.join('\n') 
    : 'No specific profile information';
  
  return `You are an expert career counselor evaluating opportunity matches for young people in Namibia.

Analyze the following opportunity against the user's query and profile, then return a JSON response with your evaluation.

USER QUERY: "${userQuery}"

USER PROFILE:
${profileStr}

OPPORTUNITY:
- Title: ${opportunity.title}
- Type: ${opportunity.type}
- Organization: ${opportunity.organization || 'Unknown'}
- Location: ${opportunity.location}
- Description: ${opportunity.description}
- Education Requirements: ${opportunity.requirements || opportunity.education_required || 'Not specified'}

EVALUATION CRITERIA:
1. **Skill Match** (25%): Does the opportunity match the user's skills? Consider synonyms and related skills (e.g., "cooking" matches "chef", "culinary", "kitchen staff").
2. **Query Relevance** (25%): Does it directly address what the user is asking for in their query?
3. **Education Level Match** (20%): Does the user's education level meet or exceed the opportunity's requirements? Give higher scores when the user's education matches or exceeds requirements. Education hierarchy: Tertiary > Grade 12 > Grade 10 > Grade 8 or below. If no requirements specified, assume it's suitable for all levels.
4. **Interest Alignment** (15%): Does it align with the user's stated interests and career goals?
5. **Location Fit** (10%): Is the location accessible or matches user's location preference?
6. **Type Match** (5%): Does the opportunity type (Job/Training/Internship/Scholarship) match the user's needs?

SCORING GUIDELINES:
- 90-100: Excellent match - opportunity strongly aligns with user's skills, query intent, and profile
- 75-89: Good match - meets most criteria with minor gaps
- 60-74: Fair match - partially relevant, some criteria met
- 40-59: Weak match - limited relevance, significant mismatches
- 0-39: Poor match - does not fit user's needs or query

**IMPORTANT**: Respond ONLY with a valid JSON object in this exact format (no markdown, no extra text):
{
  "score": <number between 0-100>,
  "reasoning": "<brief 1-sentence explanation of why this score was given, mentioning key matching or mismatching factors>"
}`;
}

/**
 * Rerank opportunities using AI-based relevance scoring
 * 
 * @param {string} userQuery - The user's search query
 * @param {object} userProfile - User profile with skills, interests, location
 * @param {Array} candidates - Array of candidate opportunities (from Stage 1)
 * @param {object} options - Reranking options
 * @returns {Promise<Array>} - Reranked opportunities with AI scores
 */
async function rerankOpportunities(userQuery, userProfile, candidates, options = {}) {
  const {
    topK = 5,
    minScore = 30, // Minimum AI score (0-100)
    batchSize = 10, // Process in batches to avoid rate limits
  } = options;
  
  logger.info('[AI Reranker] Starting opportunity reranking', {
    candidateCount: candidates.length,
    topK,
    minScore,
    hasProfile: !!userProfile
  });
  
  if (candidates.length === 0) {
    return [];
  }
  
  const startTime = Date.now();
  
  try {
    // Score all candidates
    const scoredOpportunities = await Promise.all(
      candidates.map(async (opportunity) => {
        const scoringResult = await scoreOpportunityRelevance(userQuery, userProfile, opportunity);
        const aiScore = scoringResult.score;
        const cosineScore = opportunity.score || 0;
        
        // Dynamic scoring formula: AI score gets exponential boost + cosine similarity
        // This emphasizes high-quality AI matches while still considering retrieval relevance
        const finalScore = (aiScore ** 1.1) * 0.75 + cosineScore * 0.25;
        
        return {
          ...opportunity,
          aiScore,
          aiReasoning: scoringResult.reasoning,
          // Keep original score for debugging
          stage1Score: cosineScore,
          // Combined score with new dynamic formula
          finalScore,
          _debug: {
            ...(opportunity._debug || {}),
            aiScore,
            aiReasoning: scoringResult.reasoning,
            stage1Score: cosineScore,
            finalScore
          }
        };
      })
    );
    
    // Filter and sort by final score
    const reranked = scoredOpportunities
      .filter(opp => opp.aiScore >= minScore)
      .sort((a, b) => b.finalScore - a.finalScore)
      .slice(0, topK);
    
    const latencyMs = Date.now() - startTime;
    
    logger.info('[AI Reranker] Reranking complete', {
      originalCount: candidates.length,
      afterFiltering: scoredOpportunities.filter(o => o.aiScore >= minScore).length,
      returned: reranked.length,
      latencyMs,
      avgLatencyPerOpp: Math.round(latencyMs / candidates.length),
      topScore: reranked[0]?.finalScore.toFixed(4) || 'N/A'
    });
    
    // Log top results with reasoning for debugging profile matching
    if (reranked.length > 0) {
      logger.info('[AI Reranker] Top results with reasoning:', {
        topResults: reranked.slice(0, 5).map(o => ({
          title: o.title,
          type: o.type,
          location: o.location,
          aiScore: o.aiScore,
          finalScore: o.finalScore.toFixed(2),
          reasoning: o.aiReasoning
        }))
      });
    }
    
    return reranked;
    
  } catch (error) {
    logger.error('[AI Reranker] Reranking failed', {
      error: error.message,
      stack: error.stack
    });
    
    // Fallback: return original candidates sorted by Stage 1 score
    logger.warn('[AI Reranker] Falling back to Stage 1 scores');
    return candidates
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, topK);
  }
}

/**
 * Two-Stage Hybrid RAG: Fast filtering + AI reranking
 * 
 * @param {Function} stage1Retriever - Stage 1 retrieval function (e.g., TF-IDF)
 * @param {string} query - User's search query
 * @param {object} options - Combined options for both stages
 * @returns {Promise<Array>} - Final reranked opportunities
 */
async function hybridRetrieve(stage1Retriever, query, options = {}) {
  const {
    stage1TopK = 20, // Get more candidates from Stage 1
    stage2TopK = 5,   // Return fewer after AI reranking
    stage2MinScore = 30,
    userProfile = null,
    ...stage1Options
  } = options;
  
  logger.info('[Hybrid RAG] Starting two-stage retrieval', {
    query,
    stage1TopK,
    stage2TopK
  });
  
  // Stage 1: Fast TF-IDF filtering
  const stage1Start = Date.now();
  const candidates = await stage1Retriever(query, {
    ...stage1Options,
    topK: stage1TopK,
    userProfile
  });
  const stage1Latency = Date.now() - stage1Start;
  
  logger.info('[Hybrid RAG] Stage 1 complete', {
    candidatesFound: candidates.length,
    latencyMs: stage1Latency
  });
  
  if (candidates.length === 0) {
    logger.warn('[Hybrid RAG] No candidates from Stage 1');
    return [];
  }
  
  // Stage 2: AI-based reranking
  const stage2Start = Date.now();
  const reranked = await rerankOpportunities(
    query, 
    userProfile, 
    candidates,
    {
      topK: stage2TopK,
      minScore: stage2MinScore
    }
  );
  const stage2Latency = Date.now() - stage2Start;
  
  logger.info('[Hybrid RAG] Stage 2 complete', {
    finalCount: reranked.length,
    latencyMs: stage2Latency,
    totalLatencyMs: stage1Latency + stage2Latency
  });
  
  return reranked;
}

module.exports = {
  scoreOpportunityRelevance,
  rerankOpportunities,
  hybridRetrieve
};
