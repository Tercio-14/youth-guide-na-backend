/**
 * Offline Mode API Routes
 * 
 * Provides endpoints for offline simulation mode.
 * These routes handle local JSON storage for user profile, saved opportunities, and chat history.
 * 
 * OFFLINE MODE ONLY: These routes are ONLY used when the app is in offline simulation mode.
 * They do NOT affect online mode functionality in any way.
 */

const express = require('express');
const router = express.Router();
const {
  readOfflineData,
  writeOfflineData,
  resetOfflineData,
  appendChatMessage,
  getConversation,
  initializeOfflineStorage,
  getOfflineSettings,
  updateOfflineSettings
} = require('../utils/offline-storage');
const { generateMockResponse } = require('../utils/mock-llm');
const { hybridRetrieveOpportunities } = require('../utils/rag');

// Initialize storage on server start
initializeOfflineStorage().catch(console.error);

// ============================================================================
// USER PROFILE ENDPOINTS
// ============================================================================

/**
 * GET /api/offline/user
 * Get offline user profile
 */
router.get('/user', async (req, res) => {
  try {
    console.log('📖 [Offline API] GET /api/offline/user');
    const userData = await readOfflineData('USER');
    
    res.json({
      success: true,
      user: userData
    });
  } catch (error) {
    console.error('❌ [Offline API] Error getting user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load offline user profile',
      message: error.message
    });
  }
});

/**
 * POST /api/offline/user
 * Update offline user profile
 */
router.post('/user', async (req, res) => {
  try {
    console.log('💾 [Offline API] POST /api/offline/user');
    const updates = req.body;
    
    // Read current user data
    const currentUser = await readOfflineData('USER');
    
    // Merge updates (preserve userId and isOfflineUser flag)
    const updatedUser = {
      ...currentUser,
      ...updates,
      userId: currentUser.userId, // Don't allow changing userId
      isOfflineUser: true, // Always mark as offline user
      updatedAt: new Date().toISOString()
    };
    
    // Write updated user
    await writeOfflineData('USER', updatedUser);
    
    res.json({
      success: true,
      message: 'Offline user profile updated',
      user: updatedUser
    });
  } catch (error) {
    console.error('❌ [Offline API] Error updating user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update offline user profile',
      message: error.message
    });
  }
});

/**
 * POST /api/offline/user/reset
 * Reset offline user profile to default
 */
router.post('/user/reset', async (req, res) => {
  try {
    console.log('🔄 [Offline API] POST /api/offline/user/reset');
    await resetOfflineData('USER');
    
    const defaultUser = await readOfflineData('USER');
    
    res.json({
      success: true,
      message: 'Offline user profile reset to default',
      user: defaultUser
    });
  } catch (error) {
    console.error('❌ [Offline API] Error resetting user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset offline user profile',
      message: error.message
    });
  }
});

// ============================================================================
// SAVED OPPORTUNITIES ENDPOINTS
// ============================================================================

/**
 * GET /api/offline/saved
 * Get all saved opportunities
 */
router.get('/saved', async (req, res) => {
  try {
    console.log('📖 [Offline API] GET /api/offline/saved');
    const savedData = await readOfflineData('SAVED');
    
    res.json({
      success: true,
      savedOpportunities: savedData.savedOpportunities || []
    });
  } catch (error) {
    console.error('❌ [Offline API] Error getting saved opportunities:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load saved opportunities',
      message: error.message
    });
  }
});

/**
 * POST /api/offline/saved
 * Save an opportunity
 */
router.post('/saved', async (req, res) => {
  try {
    console.log('💾 [Offline API] POST /api/offline/saved');
    const opportunity = req.body;
    
    if (!opportunity || !opportunity.id) {
      return res.status(400).json({
        success: false,
        error: 'Opportunity ID is required'
      });
    }
    
    // Read current saved data
    const savedData = await readOfflineData('SAVED');
    
    // Check if already saved
    const alreadySaved = savedData.savedOpportunities.some(opp => opp.id === opportunity.id);
    
    if (alreadySaved) {
      return res.json({
        success: true,
        message: 'Opportunity already saved',
        savedOpportunities: savedData.savedOpportunities
      });
    }
    
    // Add saved timestamp
    const savedOpportunity = {
      ...opportunity,
      savedAt: new Date().toISOString(),
      savedOffline: true
    };
    
    // Add to saved list
    savedData.savedOpportunities.push(savedOpportunity);
    
    // Write updated data
    await writeOfflineData('SAVED', savedData);
    
    res.json({
      success: true,
      message: 'Opportunity saved successfully (offline)',
      savedOpportunities: savedData.savedOpportunities
    });
  } catch (error) {
    console.error('❌ [Offline API] Error saving opportunity:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save opportunity',
      message: error.message
    });
  }
});

/**
 * DELETE /api/offline/saved/:id
 * Unsave an opportunity
 */
router.delete('/saved/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🗑️ [Offline API] DELETE /api/offline/saved/${id}`);
    
    // Read current saved data
    const savedData = await readOfflineData('SAVED');
    
    // Filter out the opportunity
    const originalCount = savedData.savedOpportunities.length;
    savedData.savedOpportunities = savedData.savedOpportunities.filter(opp => opp.id !== id);
    
    const removed = originalCount > savedData.savedOpportunities.length;
    
    if (!removed) {
      return res.status(404).json({
        success: false,
        error: 'Opportunity not found in saved list'
      });
    }
    
    // Write updated data
    await writeOfflineData('SAVED', savedData);
    
    res.json({
      success: true,
      message: 'Opportunity removed from saved list (offline)',
      savedOpportunities: savedData.savedOpportunities
    });
  } catch (error) {
    console.error('❌ [Offline API] Error unsaving opportunity:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to unsave opportunity',
      message: error.message
    });
  }
});

/**
 * GET /api/offline/saved/:id
 * Check if an opportunity is saved
 */
router.get('/saved/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`📖 [Offline API] GET /api/offline/saved/${id}`);
    
    const savedData = await readOfflineData('SAVED');
    const isSaved = savedData.savedOpportunities.some(opp => opp.id === id);
    
    res.json({
      success: true,
      isSaved,
      opportunity: savedData.savedOpportunities.find(opp => opp.id === id) || null
    });
  } catch (error) {
    console.error('❌ [Offline API] Error checking saved status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check saved status',
      message: error.message
    });
  }
});

// ============================================================================
// CHAT HISTORY ENDPOINTS
// ============================================================================

/**
 * GET /api/offline/chats
 * Get all offline conversations (summary)
 */
router.get('/chats', async (req, res) => {
  try {
    console.log('📖 [Offline API] GET /api/offline/chats');
    const chatsData = await readOfflineData('CHATS');
    
    // Return conversation summaries (not full messages)
    const summaries = chatsData.conversations.map(conv => ({
      conversationId: conv.conversationId,
      messageCount: conv.messages.length,
      firstMessage: conv.messages[0]?.text || '',
      lastUpdated: conv.lastUpdated,
      createdAt: conv.createdAt
    }));
    
    res.json({
      success: true,
      conversations: summaries
    });
  } catch (error) {
    console.error('❌ [Offline API] Error getting conversations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load conversations',
      message: error.message
    });
  }
});

/**
 * GET /api/offline/chats/:conversationId
 * Get specific conversation with full messages
 */
router.get('/chats/:conversationId', async (req, res) => {
  try {
    const { conversationId } = req.params;
    console.log(`📖 [Offline API] GET /api/offline/chats/${conversationId}`);
    
    const conversation = await getConversation(conversationId);
    
    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: 'Conversation not found'
      });
    }
    
    res.json({
      success: true,
      conversation,
      messages: conversation.messages
    });
  } catch (error) {
    console.error('❌ [Offline API] Error getting conversation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load conversation',
      message: error.message
    });
  }
});

/**
 * POST /api/offline/chats/:conversationId
 * Add message to conversation
 */
router.post('/chats/:conversationId', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const message = req.body;
    
    console.log(`💾 [Offline API] POST /api/offline/chats/${conversationId}`);
    
    if (!message || !message.role || !message.text) {
      return res.status(400).json({
        success: false,
        error: 'Invalid message format'
      });
    }
    
    const conversation = await appendChatMessage(conversationId, message);
    
    res.json({
      success: true,
      message: 'Message added to conversation',
      conversation
    });
  } catch (error) {
    console.error('❌ [Offline API] Error adding message:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add message',
      message: error.message
    });
  }
});

/**
 * DELETE /api/offline/chats/:conversationId
 * Delete conversation
 */
router.delete('/chats/:conversationId', async (req, res) => {
  try {
    const { conversationId } = req.params;
    console.log(`🗑️ [Offline API] DELETE /api/offline/chats/${conversationId}`);
    
    const chatsData = await readOfflineData('CHATS');
    
    const originalCount = chatsData.conversations.length;
    chatsData.conversations = chatsData.conversations.filter(c => c.conversationId !== conversationId);
    
    const removed = originalCount > chatsData.conversations.length;
    
    if (!removed) {
      return res.status(404).json({
        success: false,
        error: 'Conversation not found'
      });
    }
    
    await writeOfflineData('CHATS', chatsData);
    
    res.json({
      success: true,
      message: 'Conversation deleted successfully'
    });
  } catch (error) {
    console.error('❌ [Offline API] Error deleting conversation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete conversation',
      message: error.message
    });
  }
});

/**
 * POST /api/offline/chats/new
 * Create new conversation
 */
router.post('/chats/new', async (req, res) => {
  try {
    const { conversationId } = req.body;
    
    if (!conversationId) {
      return res.status(400).json({
        success: false,
        error: 'Conversation ID is required'
      });
    }
    
    console.log(`💾 [Offline API] POST /api/offline/chats/new - ${conversationId}`);
    
    const chatsData = await readOfflineData('CHATS');
    
    // Check if already exists
    const existing = chatsData.conversations.find(c => c.conversationId === conversationId);
    if (existing) {
      return res.json({
        success: true,
        message: 'Conversation already exists',
        conversation: existing
      });
    }
    
    // Create new conversation
    const newConversation = {
      conversationId,
      messages: [],
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    };
    
    chatsData.conversations.push(newConversation);
    await writeOfflineData('CHATS', chatsData);
    
    res.json({
      success: true,
      message: 'Conversation created successfully',
      conversation: newConversation
    });
  } catch (error) {
    console.error('❌ [Offline API] Error creating conversation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create conversation',
      message: error.message
    });
  }
});

// ============================================================================
// OFFLINE CHAT ENDPOINT
// ============================================================================

/**
 * POST /api/offline/chat
 * Send message in offline mode and get mock response with opportunities
 */
router.post('/chat', async (req, res) => {
  try {
    const { message, conversationId } = req.body;
    
    console.log(`💬 [Offline API] POST /api/offline/chat - ${conversationId}`);
    
    if (!message || !conversationId) {
      return res.status(400).json({
        success: false,
        error: 'Message and conversationId are required'
      });
    }
    
    // Get offline user profile for RAG context
    const userData = await readOfflineData('USER');
    
    // Perform RAG retrieval using dummy opportunities (offline mode)
    // Pass user profile for personalized ranking
    const retrievalResult = await hybridRetrieveOpportunities(
      message,
      {
        location: userData.location,
        education: userData.education,
        skills: userData.skills || [],
        interests: userData.interests || []
      },
      true // isOfflineMode = true (forces dummy data)
    );
    
    const opportunities = retrievalResult.opportunities || [];
    
    console.log(`🔍 [Offline API] Found ${opportunities.length} opportunities via RAG`);
    
    // Generate mock LLM response
    const mockResponse = generateMockResponse(message, opportunities);
    
    // Save user message to conversation
    await appendChatMessage(conversationId, {
      role: 'user',
      text: message,
      content: message
    });
    
    // Save assistant response to conversation
    await appendChatMessage(conversationId, {
      role: 'assistant',
      text: mockResponse.response,
      content: mockResponse.response,
      opportunities,
      intent: mockResponse.intent,
      offlineSimulation: true
    });
    
    // Return response in same format as online chat endpoint
    res.json({
      success: true,
      response: mockResponse.response,
      opportunities,
      conversationId,
      isOffline: true,
      offlineSimulation: true,
      intent: mockResponse.intent,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ [Offline API] Error in offline chat:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process offline chat message',
      message: error.message
    });
  }
});

// ============================================================================
// UTILITY ENDPOINTS
// ============================================================================

/**
 * POST /api/offline/reset
 * Reset all offline data to defaults
 */
router.post('/reset', async (req, res) => {
  try {
    console.log('🔄 [Offline API] POST /api/offline/reset');
    await resetOfflineData();
    
    res.json({
      success: true,
      message: 'All offline data reset to defaults'
    });
  } catch (error) {
    console.error('❌ [Offline API] Error resetting offline data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset offline data',
      message: error.message
    });
  }
});

/**
 * GET /api/offline/status
 * Get offline mode status and data summary
 */
router.get('/status', async (req, res) => {
  try {
    console.log('📊 [Offline API] GET /api/offline/status');
    
    const userData = await readOfflineData('USER');
    const savedData = await readOfflineData('SAVED');
    const chatsData = await readOfflineData('CHATS');
    
    res.json({
      success: true,
      status: {
        offlineMode: true,
        user: {
          name: `${userData.firstName} ${userData.lastName}`,
          email: userData.email
        },
        savedOpportunities: savedData.savedOpportunities.length,
        conversations: chatsData.conversations.length,
        totalMessages: chatsData.conversations.reduce((sum, conv) => sum + conv.messages.length, 0)
      }
    });
  } catch (error) {
    console.error('❌ [Offline API] Error getting status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get offline status',
      message: error.message
    });
  }
});

// ============================================================================
// OFFLINE MODE CONTROL ENDPOINTS
// ============================================================================

/**
 * GET /api/offline/mode/settings
 * Get current offline mode settings
 */
router.get('/mode/settings', async (req, res) => {
  try {
    console.log('⚙️ [Offline API] GET /api/offline/mode/settings');
    const settings = await getOfflineSettings();
    
    res.json({
      success: true,
      settings,
      description: {
        autoDetection: 'When true, app automatically detects offline state via connectivity checks',
        manualOverride: 'When true (and autoDetection is false), app forces offline mode manually'
      }
    });
  } catch (error) {
    console.error('❌ [Offline API] Error getting settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get offline mode settings',
      message: error.message
    });
  }
});

/**
 * POST /api/offline/mode/toggle
 * Toggle automatic offline detection on/off
 * 
 * Body: { autoDetection: boolean }
 */
router.post('/mode/toggle', async (req, res) => {
  try {
    const { autoDetection } = req.body;
    
    if (typeof autoDetection !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'Invalid request: autoDetection must be a boolean'
      });
    }
    
    console.log(`🔄 [Offline API] POST /api/offline/mode/toggle - Setting autoDetection to ${autoDetection}`);
    
    const settings = await updateOfflineSettings({
      autoDetection,
      // If turning auto-detection back on, clear manual override
      ...(autoDetection && { manualOverride: false })
    });
    
    res.json({
      success: true,
      message: `Automatic offline detection ${autoDetection ? 'enabled' : 'disabled'}`,
      settings
    });
  } catch (error) {
    console.error('❌ [Offline API] Error toggling auto-detection:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to toggle offline mode detection',
      message: error.message
    });
  }
});

/**
 * POST /api/offline/mode/force
 * Manually force offline mode on/off
 * Only works when automatic detection is disabled
 * 
 * Body: { forceOffline: boolean }
 */
router.post('/mode/force', async (req, res) => {
  try {
    const { forceOffline } = req.body;
    
    if (typeof forceOffline !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'Invalid request: forceOffline must be a boolean'
      });
    }
    
    console.log(`🎛️ [Offline API] POST /api/offline/mode/force - Force offline: ${forceOffline}`);
    
    // Check current settings
    const currentSettings = await getOfflineSettings();
    
    if (currentSettings.autoDetection) {
      return res.status(400).json({
        success: false,
        error: 'Cannot force offline mode while automatic detection is enabled',
        message: 'Disable automatic detection first using /api/offline/mode/toggle',
        settings: currentSettings
      });
    }
    
    const settings = await updateOfflineSettings({
      manualOverride: forceOffline
    });
    
    res.json({
      success: true,
      message: `Offline mode ${forceOffline ? 'forced ON' : 'forced OFF'}`,
      settings
    });
  } catch (error) {
    console.error('❌ [Offline API] Error forcing offline mode:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to force offline mode',
      message: error.message
    });
  }
});

module.exports = router;
