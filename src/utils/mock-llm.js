/**
 * Mock LLM Response Generator
 * 
 * Generates realistic chatbot responses for offline simulation mode.
 * Mimics the behavior of OpenRouter API without requiring internet connection.
 * 
 * OFFLINE MODE ONLY: This module is ONLY used when the app is in offline simulation mode.
 * It does NOT affect online mode functionality.
 */

/**
 * Intent categories for message classification
 */
const INTENTS = {
  GREETING: 'greeting',
  JOB_SEARCH: 'job_search',
  TRAINING: 'training',
  SCHOLARSHIP: 'scholarship',
  INTERNSHIP: 'internship',
  HELP: 'help',
  LOCATION: 'location',
  SALARY: 'salary',
  GENERAL: 'general'
};

/**
 * Response templates library
 * Organized by intent with multiple variations for natural feel
 */
const RESPONSE_TEMPLATES = {
  [INTENTS.GREETING]: [
    "Hi there! 👋 I'm here to help you find opportunities in Namibia. I'm currently in offline mode, so I'm working with cached data. What kind of opportunity are you looking for today?",
    "Hello! Welcome to YouthGuide NA. I'm operating in offline simulation mode right now, which means I can help you browse our cached opportunities. What interests you?",
    "Hey! Great to see you. I'm running in offline mode at the moment, but I can still help you explore opportunities. Are you looking for jobs, training, or something else?",
    "Hi! 😊 I'm your YouthGuide assistant. We're in offline mode, so I'll be searching through locally cached opportunities. What can I help you find?",
    "Welcome! I'm here to assist you with finding opportunities. Note that I'm in offline simulation mode, so responses are based on cached data. What are you interested in?"
  ],

  [INTENTS.JOB_SEARCH]: [
    "I'll search for job opportunities in our cached database. Let me find the best matches for you based on what we have available offline.",
    "Looking for job opportunities! I'm checking our offline database for relevant positions. Here's what I found:",
    "Great! I'm searching through cached job listings. Since we're offline, these are opportunities I have stored locally. Let me show you what matches:",
    "Job hunting mode activated! 💼 I'm browsing through our locally stored opportunities to find the best fits for you:",
    "Perfect! Let me search our offline job database. These are the most relevant opportunities I can find with the cached data:"
  ],

  [INTENTS.TRAINING]: [
    "I'll look for training programs and educational opportunities in our offline database. Here's what I found:",
    "Searching for training opportunities! 📚 I'm checking our cached database for programs that might interest you:",
    "Great choice! Education and training are important. Let me search through our offline data for relevant programs:",
    "I'm looking through cached training opportunities. Since we're in offline mode, these are programs I have stored locally:",
    "Excellent! Let me find training programs in our offline database that could help you develop your skills:"
  ],

  [INTENTS.SCHOLARSHIP]: [
    "Let me search for scholarship opportunities in our cached data. Here are some programs that might help fund your education:",
    "Searching for scholarships! 🎓 I'm checking our offline database for funding opportunities:",
    "Great! I'll look through our cached scholarship listings. These are the opportunities I have available offline:",
    "I'm searching for scholarship opportunities in our local database. Here's what I found:",
    "Let me find scholarship programs in our offline data that could support your educational goals:"
  ],

  [INTENTS.INTERNSHIP]: [
    "Looking for internship opportunities! I'm searching through our cached database for relevant positions:",
    "I'll find internship opportunities in our offline data. These are great for gaining practical experience:",
    "Searching for internships! 💼 Let me check our locally stored opportunities for positions that match:",
    "Great! I'm looking through cached internship listings. Here's what I have available offline:",
    "Let me search our offline database for internship opportunities that could help kickstart your career:"
  ],

  [INTENTS.HELP]: [
    "I'm here to help! In offline mode, I can assist you with:\n• Searching cached job opportunities\n• Finding training programs\n• Browsing internships and scholarships\n• Saving opportunities for later\n• Updating your profile\n\nWhat would you like to explore?",
    "Happy to help! Since we're in offline mode, here's what I can do:\n✓ Search through cached opportunities\n✓ Help you save interesting listings\n✓ Update your profile\n✓ Answer questions about opportunities\n\nWhat do you need?",
    "Let me guide you! In offline simulation mode, I can:\n• Search local opportunity database\n• Show you jobs, training, internships\n• Help save opportunities\n• Update your preferences\n\nHow can I assist?",
    "I'm here to support you! With offline mode, I can:\n📌 Browse cached opportunities\n📌 Search by keywords\n📌 Save opportunities\n📌 Update your profile\n\nWhat would you like to do?"
  ],

  [INTENTS.LOCATION]: [
    "I can search for opportunities in specific locations! Let me filter our cached data by location for you:",
    "Location-based search activated! 📍 I'm looking through our offline database for opportunities in your area:",
    "I'll search for opportunities by location. Here's what I found in our cached data:",
    "Searching by location! Let me find opportunities near you in our offline database:"
  ],

  [INTENTS.SALARY]: [
    "I'll look for paid opportunities in our cached database. Here are positions with salary information:",
    "Searching for paid opportunities! 💰 Let me find listings with compensation details:",
    "I'm filtering for opportunities with salary information in our offline data:",
    "Looking for paid positions! Here's what I found in our cached database with salary details:"
  ],

  [INTENTS.GENERAL]: [
    "I'm searching through our offline database for relevant opportunities. Here's what I found:",
    "Let me look through the cached opportunities we have available. Here are some matches:",
    "I'm browsing our locally stored opportunities to find something that fits. Check these out:",
    "Searching our offline database... Here are some opportunities that might interest you:",
    "Let me find relevant opportunities in our cached data. Here's what matches your query:"
  ]
};

/**
 * Closing phrases to add natural conversation flow
 */
const CLOSING_PHRASES = [
  "\n\nLet me know if you'd like more information about any of these!",
  "\n\nWould you like to explore any of these opportunities further?",
  "\n\nFeel free to save any that interest you! I can show you more options too.",
  "\n\nLet me know if you need details about any of these, or if you'd like to see more.",
  "\n\nYou can save these to view later! Want me to find more opportunities?",
  "\n\nInterested in any of these? I can provide more details or find similar opportunities.",
  "\n\nThese look promising! Let me know if you want to explore any further."
];

/**
 * No results responses
 */
const NO_RESULTS_RESPONSES = [
  "I searched our offline database but didn't find exact matches for that. Try different keywords, or let me know what type of opportunity you're looking for (jobs, training, internships, etc.).",
  "Hmm, I couldn't find opportunities matching that in our cached data. Could you try rephrasing or tell me more about what you're looking for?",
  "No exact matches found in our offline database. Try broader terms like 'jobs', 'training', or 'internship', or tell me your location!",
  "I didn't find specific matches for that query. In offline mode, I have limited data. Try searching for general categories like 'jobs in Windhoek' or 'IT training'."
];

/**
 * Detect intent from user message
 * @param {string} message - User's message
 * @returns {string} Detected intent
 */
function detectIntent(message) {
  const lowerMessage = message.toLowerCase();

  // Greeting patterns
  if (/^(hi|hello|hey|greetings|good morning|good afternoon|good evening|howdy|sup)\b/i.test(lowerMessage)) {
    return INTENTS.GREETING;
  }

  // Help patterns
  if (/\b(help|assist|guide|how|what can you|support|explain)\b/i.test(lowerMessage)) {
    return INTENTS.HELP;
  }

  // Training patterns
  if (/\b(training|course|learn|education|study|program|skill|workshop|certificate)\b/i.test(lowerMessage)) {
    return INTENTS.TRAINING;
  }

  // Scholarship patterns
  if (/\b(scholarship|bursary|funding|financial aid|grant|sponsor)\b/i.test(lowerMessage)) {
    return INTENTS.SCHOLARSHIP;
  }

  // Internship patterns
  if (/\b(internship|intern|placement|work experience|practicum)\b/i.test(lowerMessage)) {
    return INTENTS.INTERNSHIP;
  }

  // Job search patterns
  if (/\b(job|work|employment|position|vacancy|career|hiring|recruit)\b/i.test(lowerMessage)) {
    return INTENTS.JOB_SEARCH;
  }

  // Location patterns
  if (/\b(in|near|at|around|location|area|region|windhoek|walvis bay|swakopmund|oshakati|rundu|katima mulilo)\b/i.test(lowerMessage)) {
    return INTENTS.LOCATION;
  }

  // Salary patterns
  if (/\b(salary|pay|wage|paid|money|income|compensation|stipend)\b/i.test(lowerMessage)) {
    return INTENTS.SALARY;
  }

  // Default to general
  return INTENTS.GENERAL;
}

/**
 * Select random item from array
 * @param {Array} array - Array to select from
 * @returns {*} Random item
 */
function randomChoice(array) {
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * Format opportunities for inclusion in response
 * @param {Array} opportunities - Array of opportunity objects
 * @returns {string} Formatted opportunities text
 */
function formatOpportunities(opportunities) {
  if (!opportunities || opportunities.length === 0) {
    return '';
  }

  // Don't format in text, return empty since opportunities are displayed separately
  return '';
}

/**
 * Generate mock LLM response
 * @param {string} userMessage - User's message
 * @param {Array} opportunities - Array of opportunity objects (optional)
 * @returns {Object} Response object with text and metadata
 */
function generateMockResponse(userMessage, opportunities = []) {
  try {
    // Detect intent
    const intent = detectIntent(userMessage);
    
    console.log(`🤖 [Mock LLM] Detected intent: ${intent}`);
    
    // Get appropriate response template
    const templates = RESPONSE_TEMPLATES[intent] || RESPONSE_TEMPLATES[INTENTS.GENERAL];
    let responseText = randomChoice(templates);
    
    // If no opportunities found and expecting them
    if (opportunities.length === 0 && 
        [INTENTS.JOB_SEARCH, INTENTS.TRAINING, INTENTS.SCHOLARSHIP, 
         INTENTS.INTERNSHIP, INTENTS.LOCATION, INTENTS.SALARY, INTENTS.GENERAL].includes(intent)) {
      responseText = randomChoice(NO_RESULTS_RESPONSES);
    } else if (opportunities.length > 0) {
      // Add closing phrase if opportunities are present
      responseText += randomChoice(CLOSING_PHRASES);
    }
    
    return {
      response: responseText,
      intent,
      isOffline: true,
      offlineSimulation: true,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('❌ [Mock LLM] Error generating response:', error);
    
    // Fallback response
    return {
      response: "I'm in offline mode and encountered an issue. I can still help you browse cached opportunities. What are you looking for?",
      intent: INTENTS.GENERAL,
      isOffline: true,
      error: error.message
    };
  }
}

/**
 * Generate contextual follow-up response
 * @param {string} previousIntent - Previous conversation intent
 * @returns {string} Follow-up message
 */
function generateFollowUp(previousIntent) {
  const followUps = {
    [INTENTS.JOB_SEARCH]: "Would you like to see more job opportunities, or filter by location?",
    [INTENTS.TRAINING]: "Interested in any of these programs? I can help you find more training opportunities.",
    [INTENTS.SCHOLARSHIP]: "Would you like to see more scholarship opportunities or explore other options?",
    [INTENTS.INTERNSHIP]: "Want to see more internship positions? I can search by location or field.",
    [INTENTS.GENERAL]: "Let me know if you'd like to see more, or if you're looking for something specific!"
  };
  
  return followUps[previousIntent] || "What else can I help you with?";
}

/**
 * Validate and enhance user query for better matching
 * @param {string} query - User's query
 * @returns {string} Enhanced query
 */
function enhanceQuery(query) {
  // Remove common filler words
  const fillers = ['please', 'can you', 'could you', 'i want', 'i need', 'show me', 'find me'];
  let enhanced = query.toLowerCase();
  
  fillers.forEach(filler => {
    enhanced = enhanced.replace(new RegExp(`\\b${filler}\\b`, 'gi'), '');
  });
  
  return enhanced.trim();
}

module.exports = {
  generateMockResponse,
  detectIntent,
  generateFollowUp,
  enhanceQuery,
  INTENTS
};
