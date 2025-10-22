/**
 * Comprehensive Chatbot Testing Framework
 * ========================================
 * 
 * Tests chatbot responses across multiple dimensions:
 * 1. User Personas (8 different profiles)
 * 2. Query Types (6 categories)
 * 3. Opportunity Data (Dummy vs Real)
 * 
 * Generates detailed markdown reports with:
 * - Test results
 * - Response appropriateness analysis
 * - Relevance scoring
 * - Recommendations
 */

const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

const BASE_URL = 'http://localhost:3001/api';
const RESULTS_DIR = path.join(__dirname, '../test-results');

// Test configuration
const TEST_CONFIG = {
  baseUrl: BASE_URL,
  timeout: 30000,
  delayBetweenTests: 2000, // 2 seconds between tests to avoid rate limiting
};

// ============================================================================
// USER PERSONAS - 8 Different Types
// ============================================================================

const USER_PERSONAS = [
  {
    id: 'persona_1_skilled_worker',
    name: 'Tondo - Skilled Service Worker',
    profile: {
      firstName: 'Tondo',
      ageBracket: '21-25',
      location: 'Windhoek',
      education: 'Grade 10',
      employmentStatus: 'Unemployed',
      skills: ['Childcare', 'Sewing', 'Cleaning'],
      interests: ['Earn Money', 'Work Near Me', 'Part-time Jobs']
    },
    description: 'Young woman with practical skills, looking for part-time work in service sector'
  },
  {
    id: 'persona_2_fresh_graduate',
    name: 'David - Fresh IT Graduate',
    profile: {
      firstName: 'David',
      ageBracket: '21-25',
      location: 'Windhoek',
      education: 'Tertiary',
      employmentStatus: 'Unemployed',
      skills: ['JavaScript', 'React', 'Node.js', 'Python'],
      interests: ['Software Development', 'Tech Startups', 'Remote Work']
    },
    description: 'Recent university graduate with IT skills, seeking entry-level tech position'
  },
  {
    id: 'persona_3_school_leaver',
    name: 'Maria - Grade 12 Completer',
    profile: {
      firstName: 'Maria',
      ageBracket: '18-20',
      location: 'Windhoek',
      education: 'Grade 12',
      employmentStatus: 'Unemployed',
      skills: ['Mathematics', 'English', 'Accounting'],
      interests: ['University', 'Scholarships', 'Business Studies']
    },
    description: 'Recent Grade 12 graduate seeking bursaries or entry-level opportunities'
  },
  {
    id: 'persona_4_rural_youth',
    name: 'Johannes - Rural Job Seeker',
    profile: {
      firstName: 'Johannes',
      ageBracket: '21-25',
      location: 'Rundu',
      education: 'Grade 10',
      employmentStatus: 'Unemployed',
      skills: ['Farming', 'Manual Labor', 'Livestock Care'],
      interests: ['Agriculture', 'Construction', 'Any Work Available']
    },
    description: 'Youth from rural area, limited education, seeking any available work'
  },
  {
    id: 'persona_5_experienced_worker',
    name: 'Anna - Hospitality Professional',
    profile: {
      firstName: 'Anna',
      ageBracket: '26-30',
      location: 'Swakopmund',
      education: 'Vocational',
      employmentStatus: 'Part-time',
      skills: ['Customer Service', 'Food Handling', 'Housekeeping', 'Front Desk'],
      interests: ['Full-time Work', 'Career Growth', 'Tourism Industry']
    },
    description: 'Experienced hospitality worker seeking better opportunities'
  },
  {
    id: 'persona_6_dropout',
    name: 'Peter - Early School Leaver',
    profile: {
      firstName: 'Peter',
      ageBracket: '18-20',
      location: 'Windhoek',
      education: 'None',
      employmentStatus: 'Unemployed',
      skills: ['Basic Reading', 'Physical Fitness'],
      interests: ['Learn a Trade', 'Training Programs', 'Earn Money']
    },
    description: 'School dropout seeking training or low-skill entry opportunities'
  },
  {
    id: 'persona_7_career_changer',
    name: 'Linda - Career Transition',
    profile: {
      firstName: 'Linda',
      ageBracket: '26-30',
      location: 'Windhoek',
      education: 'Tertiary',
      employmentStatus: 'Full-time',
      skills: ['Accounting', 'Excel', 'Administration', 'Project Management'],
      interests: ['New Challenges', 'Management Roles', 'Professional Growth']
    },
    description: 'Professional looking to advance career or change fields'
  },
  {
    id: 'persona_8_student',
    name: 'Sarah - Current Student',
    profile: {
      firstName: 'Sarah',
      ageBracket: '18-20',
      location: 'Windhoek',
      education: 'Tertiary',
      employmentStatus: 'Studying',
      skills: ['Marketing', 'Social Media', 'Communication', 'Design'],
      interests: ['Internships', 'Part-time Work', 'Gain Experience']
    },
    description: 'University student seeking internship or part-time work for experience'
  }
];

// ============================================================================
// QUERY TYPES - 6 Categories
// ============================================================================

const QUERY_TYPES = [
  {
    category: 'general_search',
    queries: [
      'Any jobs suited for me?',
      'what opportunities are available?',
      'show me what you have',
      'I need work'
    ],
    expected: 'Should return diverse opportunities matching user profile'
  },
  {
    category: 'specific_type',
    queries: [
      'scholarships available?',
      'any training programs?',
      'looking for internships',
      'part-time jobs only'
    ],
    expected: 'Should filter to specific opportunity type requested'
  },
  {
    category: 'skill_based',
    queries: [
      'jobs matching my skills',
      'work that fits my experience',
      'use my [skill] skills' // Will be templated with actual skills
    ],
    expected: 'Should prioritize opportunities matching stated skills'
  },
  {
    category: 'location_based',
    queries: [
      'jobs near me',
      'opportunities in [location]', // Will be templated with actual location
      'work in my area'
    ],
    expected: 'Should prioritize opportunities in or near user location'
  },
  {
    category: 'casual_conversation',
    queries: [
      'hi there!',
      'how are you?',
      'good morning',
      'thanks for your help'
    ],
    expected: 'Should respond warmly and guide toward opportunities'
  },
  {
    category: 'off_topic',
    queries: [
      'what is the weather today?',
      'tell me a joke',
      'what should I cook for dinner?',
      'who won the election?'
    ],
    expected: 'Should acknowledge politely and redirect to opportunities'
  }
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Initialize test environment
 */
async function initializeTests() {
  // Create results directory if it doesn't exist
  try {
    await fs.access(RESULTS_DIR);
  } catch {
    await fs.mkdir(RESULTS_DIR, { recursive: true });
  }

  console.log('✅ Test environment initialized');
  console.log(`📁 Results directory: ${RESULTS_DIR}`);
  
  // Check if authentication bypass is enabled
  await checkAuthenticationStatus();
}

/**
 * Check if backend is configured for testing (auth bypass)
 */
async function checkAuthenticationStatus() {
  console.log('\n🔐 Checking authentication configuration...');
  
  try {
    // Try a simple test request (first request may be slow due to model loading)
    const testResponse = await axios.post(
      `${BASE_URL}/chat`,
      {
        message: 'test',
        conversationId: 'auth_check_test',
        context: { firstName: 'Test' }
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 60000, // 60 seconds for first request (model loading)
        validateStatus: () => true // Don't throw on any status
      }
    );

    if (testResponse.status === 401) {
      console.error('\n❌ AUTHENTICATION ERROR');
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      console.error('The backend requires authentication, but test mode is not enabled.\n');
      console.error('To run tests, you need to bypass authentication:\n');
      console.error('Option 1: Set environment variable before starting server:');
      console.error('  Windows (PowerShell):');
      console.error('    $env:DISABLE_AUTH_FOR_TESTING="true"; npm run dev\n');
      console.error('  Unix/Mac:');
      console.error('    DISABLE_AUTH_FOR_TESTING=true npm run dev\n');
      console.error('Option 2: Add to your .env file:');
      console.error('    DISABLE_AUTH_FOR_TESTING=true\n');
      console.error('⚠️  WARNING: Only enable this in development/testing!');
      console.error('    Never deploy with authentication disabled!\n');
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      process.exit(1);
    }

    console.log('✅ Authentication bypass enabled - tests can proceed');
    console.log('⚠️  Remember to disable DISABLE_AUTH_FOR_TESTING in production!\n');
    
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.error('\n❌ CONNECTION ERROR');
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      console.error(`Cannot connect to backend server at ${BASE_URL}\n`);
      console.error('Make sure the backend server is running:');
      console.error('  1. Open a terminal');
      console.error('  2. cd youth-guide-na-backend');
      console.error('  3. npm run dev\n');
      console.error('Expected server URL: http://localhost:3001');
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      process.exit(1);
    }
    
    // Other errors
    console.error('\n❌ UNEXPECTED ERROR during authentication check');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.error(error.message);
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    process.exit(1);
  }
}

/**
 * Send chat message to API
 */
async function sendChatMessage(message, profile, conversationId = null) {
  try {
    const response = await axios.post(
      `${BASE_URL}/chat`,
      {
        message,
        conversationId: conversationId || `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        context: profile
      },
      {
        headers: {
          'Content-Type': 'application/json',
          // Note: This test assumes backend is in development mode without auth
          // For production, you'd need to add: 'Authorization': `Bearer ${token}`
        },
        timeout: TEST_CONFIG.timeout
      }
    );

    return {
      success: true,
      response: response.data.response,
      opportunities: response.data.opportunities || [],
      latency: response.data.latencyMs || null,
      conversationId: response.data.conversationId
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      response: null,
      opportunities: []
    };
  }
}

/**
 * Analyze response appropriateness
 */
function analyzeResponse(result, queryType, persona, query) {
  const analysis = {
    responseReceived: result.success,
    opportunitiesReturned: result.opportunities.length,
    responseLength: result.response ? result.response.length : 0,
    latency: result.latency,
    appropriateness: {
      score: 0,
      reasons: [],
      issues: []
    }
  };

  if (!result.success) {
    analysis.appropriateness.score = 0;
    analysis.appropriateness.issues.push('Request failed');
    return analysis;
  }

  // Analyze based on query type
  switch (queryType.category) {
    case 'general_search':
      if (result.opportunities.length > 0) {
        analysis.appropriateness.score += 40;
        analysis.appropriateness.reasons.push('Returned opportunities for general search');
      } else {
        analysis.appropriateness.issues.push('No opportunities returned for general search');
      }
      break;

    case 'specific_type':
      const requestedType = extractRequestedType(query);
      if (requestedType && result.opportunities.length > 0) {
        const matchingType = result.opportunities.every(opp => 
          opp.type.toLowerCase().includes(requestedType.toLowerCase())
        );
        if (matchingType) {
          analysis.appropriateness.score += 40;
          analysis.appropriateness.reasons.push(`All opportunities match requested type: ${requestedType}`);
        } else {
          analysis.appropriateness.issues.push(`Opportunities don't match requested type: ${requestedType}`);
        }
      } else if (result.opportunities.length === 0) {
        // Check if response honestly states no matches found
        if (result.response.toLowerCase().includes("couldn't find") || 
            result.response.toLowerCase().includes("no ") ||
            result.response.toLowerCase().includes("don't have")) {
          analysis.appropriateness.score += 35;
          analysis.appropriateness.reasons.push('Honest "no matches" response');
        }
      }
      break;

    case 'casual_conversation':
      if (result.opportunities.length === 0 && result.response.length > 20) {
        analysis.appropriateness.score += 40;
        analysis.appropriateness.reasons.push('Appropriate conversational response');
      }
      break;

    case 'off_topic':
      if (result.response.includes('opportunities') || result.response.includes('help you find')) {
        analysis.appropriateness.score += 40;
        analysis.appropriateness.reasons.push('Redirected to opportunities');
      }
      break;
  }

  // Check profile consideration
  if (result.response.includes(persona.profile.firstName)) {
    analysis.appropriateness.score += 15;
    analysis.appropriateness.reasons.push('Personalized with user name');
  }

  if (persona.profile.skills && persona.profile.skills.length > 0) {
    const mentionsSkill = persona.profile.skills.some(skill => 
      result.response.toLowerCase().includes(skill.toLowerCase())
    );
    if (mentionsSkill) {
      analysis.appropriateness.score += 15;
      analysis.appropriateness.reasons.push('References user skills');
    }
  }

  // Check response tone
  if (result.response.length > 0 && result.response.length < 500) {
    analysis.appropriateness.score += 15;
    analysis.appropriateness.reasons.push('Concise response (under 500 chars)');
  } else if (result.response.length > 500) {
    analysis.appropriateness.issues.push('Response too long (over 500 chars)');
  }

  // Check for encouraging tone
  const encouragingWords = ['great', 'perfect', 'excellent', '!', 'help', 'find'];
  const hasEncouraging = encouragingWords.some(word => 
    result.response.toLowerCase().includes(word)
  );
  if (hasEncouraging) {
    analysis.appropriateness.score += 15;
    analysis.appropriateness.reasons.push('Encouraging and positive tone');
  }

  return analysis;
}

/**
 * Extract requested type from query
 */
function extractRequestedType(query) {
  const lowerQuery = query.toLowerCase();
  if (lowerQuery.includes('scholarship') || lowerQuery.includes('bursary')) return 'scholarship';
  if (lowerQuery.includes('training') || lowerQuery.includes('course')) return 'training';
  if (lowerQuery.includes('internship') || lowerQuery.includes('learnership')) return 'internship';
  if (lowerQuery.includes('job')) return 'job';
  return null;
}

/**
 * Delay between tests
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Export for use in actual test files
module.exports = {
  USER_PERSONAS,
  QUERY_TYPES,
  TEST_CONFIG,
  initializeTests,
  sendChatMessage,
  analyzeResponse,
  delay,
  RESULTS_DIR
};
