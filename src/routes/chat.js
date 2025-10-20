const express = require('express');
const { verifyToken } = require('../middleware/auth');
const { collections, admin } = require('../config/firebase');
const logger = require('../utils/logger');
const { retrieveOpportunities } = require('../utils/rag'); // Updated to use new RAG system
const { generateChatCompletion } = require('../utils/llm');

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
  const skills = Array.isArray(profile.skills) ? profile.skills.filter(Boolean) : [];
  if (skills.length) parts.push(`Skills: ${skills.join(', ')}`);
  const interests = Array.isArray(profile.interests) ? profile.interests.filter(Boolean) : [];
  if (interests.length) parts.push(`Interests: ${interests.join(', ')}`);
  if (profile.location) parts.push(`Location preference: ${profile.location}`);
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

      // Use new RAG system with preference-based ranking
      const retrievalStartTime = Date.now();
      retrievedOpportunities = await retrieveOpportunities(retrievalQuery, {
        topK: MAX_OPPORTUNITIES,
        minScore: 0.05, // Lower threshold for better recall
        userProfile: mergedProfile, // Pass user profile for personalization
      });
      retrievalLatencyMs = Date.now() - retrievalStartTime;

      promptOpportunities = formatOpportunitiesForPrompt(retrievedOpportunities);
      
      logger.info('[Chat] Retrieved opportunities', {
        count: retrievedOpportunities.length,
        latencyMs: retrievalLatencyMs
      });
    } else {
      logger.info('[Chat] Skipping opportunity retrieval - casual conversation');
    }

  const systemMessage = `You are YouthGuide NA, a friendly and factual assistant that helps young people in Namibia find verified opportunities such as jobs, training, or scholarships.

You will receive:
- a short user message,
- a short summary of their profile (skills, interests, etc.),
- and POSSIBLY a list of retrieved opportunities from the database (only if the user is asking for them).

Guidelines:
1. If the user greets you, respond warmly and ask if they need help finding opportunities.
2. If the user talks about something unrelated (food, hobbies, personal topics), respond with genuine empathy and interest first, then naturally transition to opportunities. Show you're listening and care about them as a person.
3. DO NOT be dismissive or robotic. Be warm, friendly, and personable while guiding them toward opportunities.
4. When the user requests opportunities AND opportunities are provided below, summarise the top 2-3 in plain sentences.
5. If the user asked for opportunities but none are available, say: "I couldn't find any new opportunities right now, but I'll keep an eye out for you."
6. Never invent opportunities. Only use what's provided below.
7. Keep responses under 70 words but make them feel genuine and warm.

Example responses:
- Off-topic (food): "Pizza sounds amazing, I'd definitely go for it! 🍕 By the way, while you're thinking about lunch, I'm here whenever you want to explore job or training opportunities. No rush though - enjoy your meal first!"
- Frustration: "I totally get your frustration, and I apologize if I came across wrong. I'm here to support you however I can. If you're interested in finding opportunities like jobs or training, I'd love to help with that. What matters most to you right now?"
- Greeting: "Hey! I'm doing great, thanks for asking! 😊 I help young people find opportunities like jobs, training, or scholarships. What are you looking for today?"`;

    const userMessageForLLM = [
      `User query:\n${trimmedMessage}`,
      `User profile summary:\n${profileSummary}`,
      `Retrieved opportunities:\n${promptOpportunities}`,
      requestingOpportunities 
        ? 'The user is asking for opportunities. If opportunities are provided above, summarise them naturally. If not, let them know you couldn\'t find any.'
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