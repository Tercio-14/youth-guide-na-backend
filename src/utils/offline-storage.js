/**
 * Offline Storage Utility
 * 
 * Handles reading and writing JSON files for offline mode simulation.
 * Provides safe file operations with error handling and atomic writes.
 * 
 * OFFLINE MODE: This module is ONLY used when the app is in offline simulation mode.
 * It does NOT affect online mode functionality.
 */

const fs = require('fs').promises;
const path = require('path');

// Base directory for offline data
const OFFLINE_DATA_DIR = path.join(__dirname, '../../data/offline');
const TEMPLATES_DIR = path.join(OFFLINE_DATA_DIR, 'templates');

// File paths
const FILES = {
  USER: path.join(OFFLINE_DATA_DIR, 'offlineUser.json'),
  SAVED: path.join(OFFLINE_DATA_DIR, 'offlineSavedOpportunities.json'),
  CHATS: path.join(OFFLINE_DATA_DIR, 'offlineChats.json'),
  SYNC_QUEUE: path.join(OFFLINE_DATA_DIR, 'syncQueue.json'),
  SETTINGS: path.join(OFFLINE_DATA_DIR, 'offlineSettings.json'),
};

const TEMPLATES = {
  USER: path.join(TEMPLATES_DIR, 'defaultUser.json'),
  CHATS: path.join(TEMPLATES_DIR, 'defaultChats.json'),
  SAVED: path.join(TEMPLATES_DIR, 'defaultSaved.json'),
};

/**
 * Initialize offline storage
 * Creates directories and default files if they don't exist
 */
async function initializeOfflineStorage() {
  try {
    // Ensure directories exist
    await fs.mkdir(OFFLINE_DATA_DIR, { recursive: true });
    await fs.mkdir(TEMPLATES_DIR, { recursive: true });

    // Check if data files exist, if not, create from templates
    for (const [key, filePath] of Object.entries(FILES)) {
      try {
        await fs.access(filePath);
        console.log(`✅ [Offline Storage] ${key} file exists`);
      } catch (error) {
        // File doesn't exist, create from template
        const templateKey = key === 'USER' ? 'USER' : key === 'SAVED' ? 'SAVED' : 'CHATS';
        const templatePath = TEMPLATES[templateKey];
        
        if (key === 'SYNC_QUEUE') {
          // Sync queue has no template, create default
          await writeOfflineData('SYNC_QUEUE', {
            queue: [],
            lastSync: null,
            pendingCount: 0
          });
        } else if (key === 'SETTINGS') {
          // Settings file, create default
          await writeOfflineData('SETTINGS', {
            autoDetection: true,
            manualOverride: false,
            lastUpdated: new Date().toISOString(),
            notes: 'autoDetection: Enable/disable automatic offline mode detection. manualOverride: Force offline mode manually (only works when autoDetection is false)'
          });
          console.log(`✅ [Offline Storage] Created ${key} with defaults`);
        } else {
          try {
            const templateData = await fs.readFile(templatePath, 'utf-8');
            await fs.writeFile(filePath, templateData, 'utf-8');
            console.log(`✅ [Offline Storage] Created ${key} from template`);
          } catch (templateError) {
            console.error(`❌ [Offline Storage] Error creating ${key} from template:`, templateError);
          }
        }
      }
    }

    console.log('✅ [Offline Storage] Initialization complete');
    return { success: true };
  } catch (error) {
    console.error('❌ [Offline Storage] Initialization error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Read offline data from JSON file
 * @param {string} fileKey - Key from FILES object ('USER', 'SAVED', 'CHATS', 'SYNC_QUEUE')
 * @returns {Promise<Object>} Parsed JSON data
 */
async function readOfflineData(fileKey) {
  try {
    const filePath = FILES[fileKey];
    if (!filePath) {
      throw new Error(`Invalid file key: ${fileKey}`);
    }

    const data = await fs.readFile(filePath, 'utf-8');
    const parsed = JSON.parse(data);
    
    console.log(`📖 [Offline Storage] Read ${fileKey} successfully`);
    return parsed;
  } catch (error) {
    console.error(`❌ [Offline Storage] Error reading ${fileKey}:`, error.message);
    
    // If file doesn't exist or is corrupt, return template data
    if (error.code === 'ENOENT' || error instanceof SyntaxError) {
      console.log(`🔄 [Offline Storage] Returning template data for ${fileKey}`);
      return await getTemplateData(fileKey);
    }
    
    throw error;
  }
}

/**
 * Write offline data to JSON file
 * Uses atomic write (write to temp file, then rename)
 * @param {string} fileKey - Key from FILES object
 * @param {Object} data - Data to write
 * @returns {Promise<boolean>} Success status
 */
async function writeOfflineData(fileKey, data) {
  try {
    const filePath = FILES[fileKey];
    if (!filePath) {
      throw new Error(`Invalid file key: ${fileKey}`);
    }

    // Update timestamp
    if (data && typeof data === 'object') {
      if (fileKey === 'USER') {
        data.updatedAt = new Date().toISOString();
      } else {
        data.lastUpdated = new Date().toISOString();
      }
    }

    // Atomic write: write to temp file first
    const tempPath = `${filePath}.tmp`;
    await fs.writeFile(tempPath, JSON.stringify(data, null, 2), 'utf-8');
    
    // Rename temp file to actual file (atomic operation)
    await fs.rename(tempPath, filePath);
    
    console.log(`💾 [Offline Storage] Wrote ${fileKey} successfully`);
    return true;
  } catch (error) {
    console.error(`❌ [Offline Storage] Error writing ${fileKey}:`, error.message);
    throw error;
  }
}

/**
 * Reset offline data to defaults
 * @param {string|null} fileKey - Specific file to reset, or null for all
 */
async function resetOfflineData(fileKey = null) {
  try {
    const keysToReset = fileKey ? [fileKey] : Object.keys(FILES);
    
    for (const key of keysToReset) {
      if (key === 'SYNC_QUEUE') {
        await writeOfflineData(key, {
          queue: [],
          lastSync: null,
          pendingCount: 0
        });
      } else {
        const templateData = await getTemplateData(key);
        await writeOfflineData(key, templateData);
      }
      console.log(`🔄 [Offline Storage] Reset ${key} to default`);
    }
    
    return { success: true, message: 'Offline data reset successfully' };
  } catch (error) {
    console.error('❌ [Offline Storage] Error resetting data:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get template data for a file key
 * @param {string} fileKey - File key
 * @returns {Promise<Object>} Template data
 */
async function getTemplateData(fileKey) {
  try {
    let templatePath;
    
    switch (fileKey) {
      case 'USER':
        templatePath = TEMPLATES.USER;
        break;
      case 'SAVED':
        templatePath = TEMPLATES.SAVED;
        break;
      case 'CHATS':
        templatePath = TEMPLATES.CHATS;
        break;
      case 'SYNC_QUEUE':
        return { queue: [], lastSync: null, pendingCount: 0 };
      default:
        throw new Error(`No template for ${fileKey}`);
    }
    
    const data = await fs.readFile(templatePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`❌ [Offline Storage] Error reading template for ${fileKey}:`, error);
    
    // Return minimal default data
    if (fileKey === 'USER') {
      return {
        userId: 'offline-user-default',
        email: 'offline@youthguide.local',
        firstName: 'Offline',
        lastName: 'User',
        isOfflineUser: true
      };
    }
    return {};
  }
}

/**
 * Append to chat conversation
 * @param {string} conversationId - Conversation ID
 * @param {Object} message - Message object
 */
async function appendChatMessage(conversationId, message) {
  try {
    const chatsData = await readOfflineData('CHATS');
    
    // Find or create conversation
    let conversation = chatsData.conversations.find(c => c.conversationId === conversationId);
    
    if (!conversation) {
      conversation = {
        conversationId,
        messages: [],
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      };
      chatsData.conversations.push(conversation);
    }
    
    // Add message
    conversation.messages.push({
      ...message,
      timestamp: new Date().toISOString()
    });
    
    conversation.lastUpdated = new Date().toISOString();
    
    // Save
    await writeOfflineData('CHATS', chatsData);
    
    console.log(`💬 [Offline Storage] Appended message to conversation ${conversationId}`);
    return conversation;
  } catch (error) {
    console.error('❌ [Offline Storage] Error appending message:', error);
    throw error;
  }
}

/**
 * Get conversation by ID
 * @param {string} conversationId - Conversation ID
 */
async function getConversation(conversationId) {
  try {
    const chatsData = await readOfflineData('CHATS');
    const conversation = chatsData.conversations.find(c => c.conversationId === conversationId);
    
    if (!conversation) {
      console.log(`ℹ️ [Offline Storage] Conversation ${conversationId} not found`);
      return null;
    }
    
    return conversation;
  } catch (error) {
    console.error('❌ [Offline Storage] Error getting conversation:', error);
    throw error;
  }
}

/**
 * Get offline mode settings
 */
async function getOfflineSettings() {
  try {
    const settings = await readOfflineData('SETTINGS');
    console.log('⚙️ [Offline Storage] Read settings:', settings);
    return settings;
  } catch (error) {
    console.error('❌ [Offline Storage] Error reading settings:', error);
    // Return defaults if file doesn't exist
    return {
      autoDetection: true,
      manualOverride: false,
      lastUpdated: new Date().toISOString()
    };
  }
}

/**
 * Update offline mode settings
 * @param {Object} updates - Settings to update
 */
async function updateOfflineSettings(updates) {
  try {
    const currentSettings = await getOfflineSettings();
    const newSettings = {
      ...currentSettings,
      ...updates,
      lastUpdated: new Date().toISOString()
    };
    
    await writeOfflineData('SETTINGS', newSettings);
    console.log('⚙️ [Offline Storage] Updated settings:', newSettings);
    return newSettings;
  } catch (error) {
    console.error('❌ [Offline Storage] Error updating settings:', error);
    throw error;
  }
}

module.exports = {
  initializeOfflineStorage,
  readOfflineData,
  writeOfflineData,
  resetOfflineData,
  appendChatMessage,
  getConversation,
  getOfflineSettings,
  updateOfflineSettings,
  FILES,
  OFFLINE_DATA_DIR
};
