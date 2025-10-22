const express = require('express');
const { verifyToken } = require('../middleware/auth');
const { collections, admin } = require('../config/firebase');
const logger = require('../utils/logger');
const { retrieveOpportunities, hybridRetrieveOpportunities } = require('../utils/rag'); // Updated to use new RAG system
const { generateChatCompletion } = require('../utils/llm');

// Feature flag: Enable AI-powered hybrid RAG (Two-Stage: TF-IDF + AI reranking)
const USE_HYBRID_RAG = process.env.USE_HYBRID_RAG !== 'false'; // Enabled by default

const router = express.Router();

const MAX_OPPORTUNITIES = parseInt(process.env.MAX_OPPORTUNITIES_PER_QUERY || '5', 10);
const CHAT_MAX_TOKENS = parseInt(process.env.CHAT_MAX_TOKENS || '600', 10);
const USE_CHAT_CONTEXT = process.env.USE_CHAT_CONTEXT === 'true';
const CHAT_CONTEXT_TURNS = parseInt(process.env.CHAT_CONTEXT_TURNS || '3', 10);

function makeConversationId(existingId) {
  if (existingId && typeof existingId === 'string' && existingId.trim()) {
    return existingId.trim();
  }
  const suffix = Math.random().toString(36).slice(2, 8);
  return `conv_${Date.now()}_${suffix}`;
}

function summarizeProfile(profile = {}) {
  const parts = [];
  if (profile.firstName) parts.push(`Name: ${profile.firstName}`);
  if (profile.ageBracket) parts.push(`Age bracket: ${profile.ageBracket}`);
  if (profile.location) parts.push(`Location: ${profile.location}`);
  if (profile.education) parts.push(`Education level: ${profile.education}`);
  if (profile.employmentStatus) parts.push(`Employment status: ${profile.employmentStatus}`);
  const skills = Array.isArray(profile.skills) ? profile.skills.filter(Boolean) : [];
  if (skills.length) parts.push(`Skills: ${skills.join(', ')}`);
  const interests = Array.isArray(profile.interests) ? profile.interests.filter(Boolean) : [];
  if (interests.length) parts.push(`Interests: ${interests.join(', ')}`);
  return parts.join('\n') || 'No profile data provided.';
}

/**
 * Use LLM to detect if user is asking for opportunities or just chatting
 */
async function isAskingForOpportunities(message) {
  try {
    const intentDetectionPrompt = `You are an intent classifier for YouthGuide NA, a chatbot that helps young people in Namibia find opportunities (jobs, training, scholarships, internships).

Analyze this user message and determine if they are:
A) Asking for opportunities (jobs, training, scholarships, internships, etc.)
B) Just chatting casually (greetings, thanks, general conversation)

User message: "${message}"

Respond with ONLY one word:
- "YES" if they are asking for opportunities
- "NO" if they are just chatting casually

Your response:`;

    const result = await generateChatCompletion({
      messages: [
        { role: 'system', content: 'You are a precise intent classifier. Respond only with YES or NO.' },
        { role: 'user', content: intentDetectionPrompt }
      ],
      maxTokens: 10,
      temperature: 0.1 // Low temperature for consistent classification
    });

    const answer = result.text.trim().toUpperCase();
    const isRequestingOpportunities = answer.includes('YES');
    
    logger.info('[Chat] LLM Intent Detection', { 
      message: message.substring(0, 50), 
      llmResponse: answer,
      isRequestingOpportunities 
    });
    
    return isRequestingOpportunities;
  } catch (error) {
    logger.error('[Chat] Intent detection failed, defaulting to false', { error: error.message, stack: error.stack });
    // If LLM fails, default to NOT retrieving opportunities (safer)
    return false;
  }
}

/**
 * Use LLM to intelligently filter opportunities by user's specific intent
 * Handles misspellings, synonyms, and contextual understanding
 * This is the final filtering step after AI reranking
 */
async function filterOpportunitiesByIntent(opportunities, userMessage, userProfile) {
  // Early return if no opportunities to filter
  if (!opportunities || opportunities.length === 0) {
    logger.info('[Chat] No opportunities to filter - returning empty array');
    return [];
  }

  try {
    logger.info('[Chat] Starting LLM intent-based filtering', {
      opportunityCount: opportunities.length,
      userMessage: userMessage.substring(0, 100)
    });

    // Build opportunity list for LLM
    const opportunityList = opportunities.map((opp, index) => {
      const parts = [
        `${index + 1}. ${opp.title}`,
        `Type: ${opp.type || 'Unknown'}`,
      ];
      if (opp.category) parts.push(`Category: ${opp.category}`);
      if (opp.organization) parts.push(`Organization: ${opp.organization}`);
      if (opp.location) parts.push(`Location: ${opp.location}`);
      return parts.join(' | ');
    }).join('\n');

    const filterPrompt = `You are filtering opportunities based on user intent. Analyze what the user is specifically asking for.

User query: "${userMessage}"

User profile:
${summarizeProfile(userProfile)}

Available opportunities (${opportunities.length}):
${opportunityList}

**Task**: Determine if the user wants:
A) **SPECIFIC types** only (e.g., scholarships, bursaries, training, internships, apprenticeships)
B) **GENERAL opportunities** (any job, work, employment opportunities)

**Instructions**:
- If asking for SPECIFIC types (scholarships, training, internships, etc.):
  → Return ONLY the numbers of opportunities that match (e.g., "1,3,5")
  → Consider misspellings (e.g., "scholership" = scholarship, "learneship" = learnership/internship)
  → Consider synonyms (e.g., "funding" = scholarship/bursary, "learning program" = training/course)
  → If NONE match the specific request, return "NONE"

- If asking for GENERAL opportunities (jobs, work, employment):
  → Return "ALL"

**Examples**:
- "any scholarships?" → Return only scholarship/bursary numbers
- "scholerships available?" → Return only scholarship numbers (handles misspelling)
- "I need funding for school" → Return scholarship/bursary numbers (synonym)
- "show me jobs near me" → Return "ALL"
- "any work opportunities?" → Return "ALL"
- "internships in windhoek?" → Return only internship/learnership numbers

Your response (comma-separated numbers, "NONE", or "ALL"):`;

    const result = await generateChatCompletion({
      messages: [
        { 
          role: 'system', 
          content: 'You are a precise opportunity filter. Respond ONLY with comma-separated numbers (e.g., "1,3"), "NONE", or "ALL". No explanations.' 
        },
        { role: 'user', content: filterPrompt }
      ],
      maxTokens: 50,
      temperature: 0.1 // Low temperature for consistent filtering
    });

    const answer = result.text.trim().toUpperCase();
    
    logger.info('[Chat] LLM filtering response', { 
      llmResponse: answer,
      originalCount: opportunities.length
    });

    // Handle "ALL" - user wants general opportunities
    if (answer === 'ALL') {
      logger.info('[Chat] User wants general opportunities - keeping all results', {
        count: opportunities.length
      });
      return opportunities;
    }

    // Handle "NONE" - no opportunities match user's specific request
    if (answer === 'NONE') {
      logger.info('[Chat] No opportunities match specific user request - returning empty array');
      return [];
    }

    // Parse comma-separated numbers
    const selectedIndices = answer
      .split(',')
      .map(s => s.trim())
      .map(s => parseInt(s, 10) - 1) // Convert to 0-based index
      .filter(i => !isNaN(i) && i >= 0 && i < opportunities.length);

    // If parsing failed or no valid indices, keep all opportunities (safer fallback)
    if (selectedIndices.length === 0) {
      logger.warn('[Chat] LLM returned invalid response - keeping all opportunities as fallback', { 
        llmResponse: answer 
      });
      return opportunities;
    }

    // Filter opportunities based on selected indices
    const filteredOpportunities = selectedIndices.map(i => opportunities[i]);
    
    logger.info('[Chat] Successfully filtered opportunities by LLM intent', {
      originalCount: opportunities.length,
      filteredCount: filteredOpportunities.length,
      selectedIndices: selectedIndices.map(i => i + 1), // Log as 1-based for readability
      llmResponse: answer
    });

    return filteredOpportunities;

  } catch (error) {
    logger.error('[Chat] Intent-based filtering failed - keeping all opportunities as fallback', { 
      error: error.message,
      stack: error.stack,
      opportunityCount: opportunities.length
    });
    // On error, return all opportunities (safer than returning empty)
    return opportunities;
  }
}

function formatOpportunitiesForPrompt(opportunities = []) {
  if (!Array.isArray(opportunities) || opportunities.length === 0) {
    return 'No matching opportunities were retrieved for this query.';
  }

  return opportunities.map((opp, index) => {
    const lines = [`${index + 1}. ${opp.title || 'Untitled opportunity'}`];
    if (opp.type) lines.push(`Type: ${opp.type}`);
    if (opp.organization) lines.push(`Organization: ${opp.organization}`);
    if (opp.location) lines.push(`Location: ${opp.location}`);
    if (opp.description) lines.push(`Description: ${opp.description.substring(0, 150)}...`);
    if (opp.date_posted) lines.push(`Posted: ${opp.date_posted}`);
    if (opp.url) lines.push(`URL: ${opp.url}`);
    if (opp.source) lines.push(`Source: ${opp.source}`);
    lines.push(`Relevance score: ${(opp.score ?? 0).toFixed(3)}`);
    return lines.join(' | ');
  }).join('\n');
}

function sanitizeOpportunityForResponse(opportunity) {
  return {
    id: opportunity.id,
    title: opportunity.title || 'Opportunity',
    description: opportunity.description || null,
    type: opportunity.type || 'General',
    organization: opportunity.organization || 'Unknown',
    location: opportunity.location || null,
    date_posted: opportunity.date_posted || null,
    source: opportunity.source || null,
    verified: opportunity.verified !== false, // Default to true
    url: opportunity.url || null,
    score: typeof opportunity.score === 'number' ? Number(opportunity.score.toFixed(4)) : null,
  };
}

async function persistConversation({
  conversationId,
  userId,
  userMessage,
  assistantMessage,
  opportunities,
  profileSnapshot,
  retrieval,
}) {
  try {
    const FieldValue = admin.firestore.FieldValue;
    const conversationRef = collections.chats.doc(conversationId);
    const conversationDoc = await conversationRef.get();

    const basePayload = {
      userId,
      updatedAt: FieldValue.serverTimestamp(),
      lastMessageAt: FieldValue.serverTimestamp(),
      lastUserMessage: userMessage,
      lastAssistantMessage: assistantMessage,
      lastOpportunityCount: opportunities.length,
    };

    if (!conversationDoc.exists) {
      basePayload.createdAt = FieldValue.serverTimestamp();
    }

    await conversationRef.set(basePayload, { merge: true });

    const messagesRef = conversationRef.collection('messages');
    await messagesRef.add({
      role: 'user',
      content: userMessage,
      timestamp: FieldValue.serverTimestamp(),
      profileSnapshot,
    });

    await messagesRef.add({
      role: 'assistant',
      content: assistantMessage,
      timestamp: FieldValue.serverTimestamp(),
      opportunities,
      retrieval,
    });
  } catch (error) {
    logger.error('[Chat] Failed to persist conversation', {
      error: error.message,
      conversationId,
      userId,
    });
  }
}

async function fetchConversationHistory(conversationId, maxTurns) {
  try {
    const messagesRef = collections.chats.doc(conversationId).collection('messages');
    
    // Fetch recent messages ordered by timestamp descending
    const snapshot = await messagesRef
      .orderBy('timestamp', 'desc')
      .limit(maxTurns * 2) // Fetch user + assistant pairs
      .get();

    if (snapshot.empty) {
      logger.info('[ChatContext] No previous messages found. Starting new conversation.', {
        conversationId,
      });
      return [];
    }

    // Reverse to get chronological order
    const messages = [];
    snapshot.docs.reverse().forEach((doc) => {
      const data = doc.data();
      messages.push({
        role: data.role,
        content: data.content,
        timestamp: data.timestamp,
      });
    });

    logger.info('[ChatContext] Using previous chat context: true', {
      conversationId,
      count: messages.length,
      turns: Math.floor(messages.length / 2),
    });

    return messages;
  } catch (error) {
    logger.error('[ChatContext] Failed to fetch conversation history', {
      error: error.message,
      conversationId,
    });
    return [];
  }
}

router.post('/', verifyToken, async (req, res) => {
  const start = Date.now();
  const { message, conversationId, context = {} } = req.body || {};
  const userId = req.user.uid;
  const trimmedMessage = typeof message === 'string' ? message.trim() : '';

  if (!trimmedMessage) {
    return res.status(400).json({
      error: 'Invalid input',
      message: 'Message is required and must be a non-empty string',
    });
  }

  const effectiveConversationId = makeConversationId(conversationId);

  try {
    logger.info('[Chat] Processing user message', {
      userId,
      conversationId: effectiveConversationId,
      messageLength: trimmedMessage.length,
    });

    let profileData = null;
    try {
      const doc = await collections.users.doc(userId).get();
      if (doc.exists) {
        profileData = doc.data();
      }
    } catch (profileError) {
      logger.warn('[Chat] Failed to fetch user profile', {
        error: profileError.message,
        userId,
      });
    }

    const mergedProfile = { ...profileData, ...context };
    const profileSummary = summarizeProfile(mergedProfile);

    // Fetch conversation history if enabled
    let conversationHistory = [];
    let historyUsed = false;
    
    if (USE_CHAT_CONTEXT) {
      conversationHistory = await fetchConversationHistory(
        effectiveConversationId,
        CHAT_CONTEXT_TURNS
      );
      historyUsed = conversationHistory.length > 0;
    } else {
      logger.info('[ChatContext] Chat context disabled via configuration');
    }

    // Detect if user is asking for opportunities using LLM
    const requestingOpportunities = await isAskingForOpportunities(trimmedMessage);
    
    logger.info('[Chat] LLM-based opportunity detection', {
      message: trimmedMessage.substring(0, 100),
      requestingOpportunities,
      messageLength: trimmedMessage.length
    });

    // Only retrieve opportunities if user is asking for them
    let retrievedOpportunities = [];
    let retrievalLatencyMs = 0;
    let promptOpportunities = 'No opportunities retrieved (user is not requesting opportunities).';
    
    if (requestingOpportunities) {
      const retrievalQueryParts = [trimmedMessage];
      if (profileSummary) {
        retrievalQueryParts.push(`Profile summary:\n${profileSummary}`);
      }
      const retrievalQuery = retrievalQueryParts.join('\n\n');

      // Use Two-Stage Hybrid RAG: Fast TF-IDF filtering + AI reranking
      const retrievalStartTime = Date.now();
      
      // Log profile being used for RAG
      logger.info('[Chat] User profile for RAG', {
        hasSkills: !!(mergedProfile?.skills?.length),
        skills: mergedProfile?.skills || [],
        hasInterests: !!(mergedProfile?.interests?.length),
        interests: mergedProfile?.interests || [],
        location: mergedProfile?.location || 'Not specified',
        ageBracket: mergedProfile?.ageBracket || 'Not specified'
      });

      if (USE_HYBRID_RAG) {
        // Stage 1: TF-IDF retrieves ~20 candidates
        // Stage 2: AI reranks to get best 5
        retrievedOpportunities = await hybridRetrieveOpportunities(retrievalQuery, {
          topK: MAX_OPPORTUNITIES,
          minScore: 0.01, // Lower threshold for Stage 1 (AI will filter in Stage 2)
          userProfile: mergedProfile,
        });
        
        logger.info('[Chat] Using Hybrid RAG (TF-IDF + AI reranking)');
      } else {
        // Fallback: Use only TF-IDF (Stage 1)
        retrievedOpportunities = await retrieveOpportunities(retrievalQuery, {
          topK: MAX_OPPORTUNITIES,
          minScore: 0.05,
          userProfile: mergedProfile,
        });
        
        logger.info('[Chat] Using basic TF-IDF RAG (Hybrid disabled)');
      }
      
      retrievalLatencyMs = Date.now() - retrievalStartTime;

      // Use LLM to intelligently filter opportunities by user's specific intent
      // This replaces hardcoded keyword matching with context-aware AI filtering
      // Handles misspellings, synonyms, and nuanced requests
      retrievedOpportunities = await filterOpportunitiesByIntent(
        retrievedOpportunities,
        trimmedMessage,
        mergedProfile
      );

      // Check if opportunities are poor matches (all AI scores below 65)
      const hasPoorMatches = retrievedOpportunities.length > 0 && 
        retrievedOpportunities.every(opp => (opp.aiScore || 0) < 65);
      
      if (hasPoorMatches) {
        logger.warn('[Chat] All opportunities are poor matches for user profile', {
          count: retrievedOpportunities.length,
          avgAiScore: (retrievedOpportunities.reduce((sum, o) => sum + (o.aiScore || 0), 0) / retrievedOpportunities.length).toFixed(1),
          userSkills: mergedProfile.skills,
          userInterests: mergedProfile.interests
        });
        // Clear opportunities so system responds honestly about no good matches
        retrievedOpportunities = [];
      }

      promptOpportunities = formatOpportunitiesForPrompt(retrievedOpportunities);
      
      logger.info('[Chat] Retrieved opportunities', {
        count: retrievedOpportunities.length,
        useHybridRAG: USE_HYBRID_RAG,
        latencyMs: retrievalLatencyMs
      });
    } else {
      logger.info('[Chat] Skipping opportunity retrieval - casual conversation');
    }

  const systemMessage = `You are YouthGuide NA, a helpful assistant for young people in Namibia seeking real opportunities (jobs, training, internships, scholarships).

**Your Core Principles:**
1. **Factual & Grounded**: Only share information from verified opportunities in the database. Never invent opportunities, requirements, or details.
2. **Short & Direct**: Keep responses under 50 words. Get to the point quickly - youth appreciate brevity.
3. **Personalized**: When opportunities match a user's profile (skills, interests, location), explain WHY they're a good fit in 1-2 sentences.
4. **Youth-Friendly Tone**: Be warm, encouraging, and conversational - like a supportive older sibling, not a formal counselor.

**Response Guidelines:**

*When opportunities are provided:*
- Write a brief personalized intro (2-3 sentences max) explaining why these opportunities match the user's profile
- Mention specific skills/interests from their profile that align
- DO NOT list opportunity details - they'll be shown as cards separately
- Example: "I found 3 tech opportunities that match your IT skills! Two offer remote work, which is perfect since you're in Windhoek. Check them out below."

*When NO opportunities are found OR when opportunities don't match what the user asked for:*
- Be honest and encouraging: "I couldn't find any [specific thing they asked for] at the moment. Try broadening your search or check back later."
- DO NOT show opportunities that don't match their request (e.g., don't show jobs if they asked for scholarships)
- Example: "I didn't find any scholarships right now, but I'll keep looking. You can also try searching for training programs or internships."

*For casual conversation or greetings:*
- Respond warmly but briefly
- Gently guide toward opportunities without being pushy
- Example: "Hey! 👋 Great to hear from you. I'm here to help you find jobs, training, or internships in Namibia. What are you interested in?"

*For off-topic questions:*
- Acknowledge their message with genuine empathy (1 sentence)
- Smoothly redirect to opportunities
- Example: "That sounds tough - job hunting can be stressful! Let me help you find something that fits your skills. What kind of work interests you?"

**Critical Rules:**
- Never fabricate opportunity details, deadlines, or requirements
- If you don't have information, say so clearly
- Keep responses conversational, short, and actionable
- Always respect the user's time with concise, helpful answers`;

    const userMessageForLLM = [
      `User query:\n${trimmedMessage}`,
      `User profile summary:\n${profileSummary}`,
      `Retrieved opportunities:\n${promptOpportunities}`,
      requestingOpportunities 
        ? 'The user is asking for opportunities. If opportunities are provided above, write a warm, personalized intro explaining WHY these match their profile (mention their skills, interests, or preferences). DO NOT list the opportunity details - they will be shown as cards separately. Just write an encouraging 2-3 sentence intro. If no opportunities found, let them know you couldn\'t find any right now.'
        : 'The user is NOT asking for opportunities - they are chatting casually or discussing off-topic subjects. Respond warmly and genuinely to what they said, showing empathy and personality. Then naturally guide the conversation toward opportunities without being pushy. Make them feel heard and valued.',
    ].join('\n\n');

    // Build messages array for LLM
    const llmMessages = [
      { role: 'system', content: systemMessage },
    ];

    // Add conversation history if available
    if (historyUsed) {
      conversationHistory.forEach((msg) => {
        llmMessages.push({
          role: msg.role === 'assistant' ? 'assistant' : 'user',
          content: msg.content,
        });
      });
      logger.debug('[ChatContext] Added conversation history to prompt', {
        historyMessages: conversationHistory.length,
      });
    }

    // Add current user message
    llmMessages.push({ role: 'user', content: userMessageForLLM });

    const llmResult = await generateChatCompletion({
      messages: llmMessages,
      maxTokens: CHAT_MAX_TOKENS,
    });

    const assistantText = llmResult.text;
    const responseOpportunities = retrievedOpportunities.map(sanitizeOpportunityForResponse);

    await persistConversation({
      conversationId: effectiveConversationId,
      userId,
      userMessage: trimmedMessage,
      assistantMessage: assistantText,
      opportunities: responseOpportunities,
      profileSnapshot: mergedProfile,
      retrieval: {
        latencyMs: retrievalLatencyMs,
        candidateCount: responseOpportunities.length,
      },
    });

    logger.info('[Chat] Chat response generated', {
      userId,
      conversationId: effectiveConversationId,
      historyUsed,
      historyMessageCount: conversationHistory.length,
      opportunityCount: responseOpportunities.length,
      retrievalLatencyMs: retrievalLatencyMs,
      durationMs: Date.now() - start,
    });

    return res.json({
      success: true,
      response: assistantText,
      opportunities: responseOpportunities,
      conversationId: effectiveConversationId,
      retrieval: {
        latencyMs: retrievalLatencyMs,
        candidateCount: responseOpportunities.length,
      },
      usage: llmResult.usage,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('[Chat] Failed to process chat request', {
      error: error.message,
      stack: error.stack,
      userId,
      conversationId: effectiveConversationId,
    });
    return res.status(500).json({
      error: 'Chat processing failed',
      message: "Sorry, I couldn't process your message right now. Please try again.",
    });
  }
});

// Get messages for a specific conversation
router.get('/conversation/:conversationId', verifyToken, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.uid;

    logger.info('[Chat History] Fetching conversation messages', {
      conversationId,
      userId
    });

    // Verify conversation belongs to user
    const conversationDoc = await collections.chats.doc(conversationId).get();
    
    if (!conversationDoc.exists) {
      logger.warn('[Chat History] Conversation not found', { conversationId });
      return res.json({
        success: true,
        messages: []
      });
    }

    const conversationData = conversationDoc.data();
    if (conversationData.userId !== userId) {
      logger.warn('[Chat History] Access denied - conversation belongs to different user', {
        conversationId,
        requestingUserId: userId,
        conversationUserId: conversationData.userId
      });
      return res.status(403).json({
        error: 'Access denied',
        message: 'You can only access your own conversations',
      });
    }

    // Fetch messages from subcollection
    const messagesSnapshot = await collections.chats
      .doc(conversationId)
      .collection('messages')
      .orderBy('timestamp', 'asc')
      .get();

    const messages = messagesSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        role: data.role,
        content: data.content,
        timestamp: data.timestamp?.toDate?.() || data.timestamp,
        opportunities: data.opportunities || []
      };
    });

    logger.info('[Chat History] Messages retrieved successfully', {
      conversationId,
      messageCount: messages.length
    });

    return res.json({
      success: true,
      conversationId,
      messages
    });

  } catch (error) {
    logger.error('[Chat History] Error fetching conversation messages:', error);
    return res.status(500).json({
      error: 'Failed to retrieve conversation messages',
      message: error.message,
    });
  }
});

// GET /conversations/recent - Get recent conversations for the current user
router.get('/conversations/recent', verifyToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const limit = parseInt(req.query.limit, 10) || 5;

    logger.info(`[Recent Conversations] Fetching recent conversations for user: ${userId}, limit: ${limit}`);

    // Get all conversations for this user
    const chatsSnapshot = await collections.chats
      .where('userId', '==', userId)
      .orderBy('updatedAt', 'desc')
      .limit(limit)
      .get();

    if (chatsSnapshot.empty) {
      logger.info(`[Recent Conversations] No conversations found for user: ${userId}`);
      return res.json({
        success: true,
        conversations: [],
      });
    }

    const conversations = [];

    for (const chatDoc of chatsSnapshot.docs) {
      const conversationId = chatDoc.id;
      
      // Get the first user message from this conversation
      const messagesSnapshot = await collections.chats
        .doc(conversationId)
        .collection('messages')
        .where('role', '==', 'user')
        .orderBy('timestamp', 'asc')
        .limit(1)
        .get();

      // Get total message count
      const allMessagesSnapshot = await collections.chats
        .doc(conversationId)
        .collection('messages')
        .get();

      const firstMessage = !messagesSnapshot.empty 
        ? messagesSnapshot.docs[0].data().content 
        : 'New conversation';

      const chatData = chatDoc.data();

      conversations.push({
        id: conversationId,
        firstMessage: firstMessage.substring(0, 100), // Truncate for preview
        lastUpdated: chatData.updatedAt?.toDate ? chatData.updatedAt.toDate().toISOString() : new Date().toISOString(),
        messageCount: allMessagesSnapshot.size,
      });
    }

    logger.info(`[Recent Conversations] Found ${conversations.length} conversations for user: ${userId}`);

    return res.json({
      success: true,
      conversations,
    });

  } catch (error) {
    logger.error('[Recent Conversations] Error fetching recent conversations:', error);
    return res.status(500).json({
      error: 'Failed to retrieve recent conversations',
      message: error.message,
    });
  }
});

router.get('/history/:userId', verifyToken, async (req, res) => {
  try {
    const { userId } = req.params;

    if (userId !== req.user.uid) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You can only access your own chat history',
      });
    }

    const conversationsSnapshot = await collections.chats
      .where('userId', '==', userId)
      .orderBy('updatedAt', 'desc')
      .limit(5)
      .get();

    const conversations = [];
    // eslint-disable-next-line no-restricted-syntax
    for (const doc of conversationsSnapshot.docs) {
      const data = doc.data();
      conversations.push({ id: doc.id, ...data });
    }

    return res.json({
      success: true,
      conversations,
    });
  } catch (error) {
    logger.error('Chat history error:', error);
    return res.status(500).json({
      error: 'Failed to retrieve chat history',
      message: error.message,
    });
  }
});

module.exports = router;