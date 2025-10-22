/**
 * Test Smart LLM-Based Opportunity Filtering
 * Tests the new filterOpportunitiesByIntent function to ensure it:
 * 1. Returns ALL opportunities for general queries
 * 2. Filters to SPECIFIC types when asked
 * 3. Handles misspellings correctly
 * 4. Understands synonyms
 * 5. Returns NONE when no matches exist
 * 
 * NOTE: This test requires manual testing via the chat UI since
 * the backend uses Firebase authentication (no direct login endpoint).
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

// Firebase token (must be obtained from frontend)
// Set this environment variable: FIREBASE_TOKEN=<your-token>
let authToken = process.env.FIREBASE_TOKEN || null;

/**
 * Check if backend is healthy
 */
async function checkBackend() {
  try {
    const response = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Backend is healthy:', response.data.status);
    return true;
  } catch (error) {
    console.error('❌ Backend check failed:', error.message);
    console.error('   Make sure the backend is running: npm start');
    return false;
  }
}

/**
 * Send a chat message and get response
 */
async function sendMessage(message) {
  try {
    const response = await axios.post(
      `${BASE_URL}/api/chat`,
      { message },
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000 // 15 second timeout for LLM responses
      }
    );
    return response.data;
  } catch (error) {
    if (error.response?.status === 401) {
      console.error(`❌ Authentication failed - token may be expired`);
      console.error(`   Get a fresh token and try again`);
    } else {
      console.error(`❌ Error: ${error.response?.data?.message || error.message}`);
    }
    return null;
  }
}

/**
 * Test cases for smart filtering
 */
const TEST_CASES = [
  {
    name: 'General Query (should return ALL)',
    message: 'what opportunities are available?',
    expectation: 'Should return multiple opportunities of different types'
  },
  {
    name: 'Specific: Scholarships (correct spelling)',
    message: 'show me scholarships',
    expectation: 'Should return ONLY scholarships/bursaries'
  },
  {
    name: 'Specific: Scholarships (misspelling)',
    message: 'any scholerships available?',
    expectation: 'Should handle misspelling and return ONLY scholarships'
  },
  {
    name: 'Specific: Funding (synonym)',
    message: 'I need funding for university',
    expectation: 'Should understand synonym and return ONLY scholarships/bursaries'
  },
  {
    name: 'Specific: Internships',
    message: 'looking for internships',
    expectation: 'Should return ONLY internships/learnerships'
  },
  {
    name: 'Specific: Training',
    message: 'training programs near me',
    expectation: 'Should return ONLY training/courses'
  },
  {
    name: 'General with location filter',
    message: 'jobs in windhoek',
    expectation: 'Should return ALL types (location is not a type filter)'
  },
  {
    name: 'Specific: Bursaries',
    message: 'any bursaries for grade 12?',
    expectation: 'Should return ONLY bursaries/scholarships'
  }
];

/**
 * Analyze response to determine filtering effectiveness
 */
function analyzeResponse(testCase, response) {
  if (!response || !response.response) {
    console.log(`  ⚠️  No response received`);
    return;
  }

  const message = response.response;
  console.log(`  📝 Response preview: "${message.substring(0, 150)}..."`);

  // Count opportunity types mentioned
  const hasScholarships = /scholarship|bursary|bursaries/i.test(message);
  const hasInternships = /internship|learnership/i.test(message);
  const hasJobs = /job|position|employment/i.test(message);
  const hasTraining = /training|course|program/i.test(message);
  const noResults = /no.*available|couldn't find|don't have/i.test(message);

  console.log(`  📊 Content analysis:`);
  console.log(`     - Scholarships/Bursaries: ${hasScholarships ? '✅' : '❌'}`);
  console.log(`     - Internships/Learnerships: ${hasInternships ? '✅' : '❌'}`);
  console.log(`     - Jobs/Employment: ${hasJobs ? '✅' : '❌'}`);
  console.log(`     - Training/Courses: ${hasTraining ? '✅' : '❌'}`);
  console.log(`     - No results: ${noResults ? '✅' : '❌'}`);

  // Determine if filtering worked
  const queryLower = testCase.message.toLowerCase();
  let success = false;

  if (queryLower.includes('scholarship') || queryLower.includes('scholership') || queryLower.includes('funding') || queryLower.includes('bursary')) {
    // Should ONLY have scholarships/bursaries
    success = hasScholarships && !hasJobs && !hasInternships && !hasTraining;
    if (success) {
      console.log(`  ✅ PASS: Correctly filtered to scholarships/bursaries only`);
    } else if (noResults) {
      console.log(`  ⚠️  No scholarships found (may be correct if none exist)`);
    } else {
      console.log(`  ❌ FAIL: Response includes non-scholarship opportunities`);
    }
  } else if (queryLower.includes('internship') || queryLower.includes('learnership')) {
    // Should ONLY have internships
    success = hasInternships && !hasJobs && !hasScholarships && !hasTraining;
    if (success) {
      console.log(`  ✅ PASS: Correctly filtered to internships only`);
    } else if (noResults) {
      console.log(`  ⚠️  No internships found (may be correct if none exist)`);
    } else {
      console.log(`  ❌ FAIL: Response includes non-internship opportunities`);
    }
  } else if (queryLower.includes('training') || queryLower.includes('course')) {
    // Should ONLY have training
    success = hasTraining && !hasJobs && !hasScholarships && !hasInternships;
    if (success) {
      console.log(`  ✅ PASS: Correctly filtered to training only`);
    } else if (noResults) {
      console.log(`  ⚠️  No training found (may be correct if none exist)`);
    } else {
      console.log(`  ❌ FAIL: Response includes non-training opportunities`);
    }
  } else {
    // General query - should have multiple types
    const typeCount = [hasScholarships, hasInternships, hasJobs, hasTraining].filter(Boolean).length;
    success = typeCount >= 2 || noResults;
    if (success) {
      console.log(`  ✅ PASS: Returns general opportunities (${typeCount} types found)`);
    } else {
      console.log(`  ⚠️  Only ${typeCount} type found (may need more diverse data)`);
    }
  }

  console.log('');
  return success;
}

/**
 * Run all tests
 */
async function runTests() {
  console.log('🧪 Testing Smart LLM-Based Opportunity Filtering\n');
  console.log('=' .repeat(70));
  console.log('');

  // Check backend health
  if (!await checkBackend()) {
    console.error('\n❌ Cannot proceed - backend is not running');
    console.error('   Start it with: npm start\n');
    return;
  }

  // Check if we have auth token
  if (!authToken) {
    console.log('\n⚠️  No Firebase token provided');
    console.log('   This test requires authentication to call the chat API');
    console.log('\n📋 Manual Testing Instructions:');
    console.log('   1. Open your frontend chat application');
    console.log('   2. Log in with your test account');
    console.log('   3. Try these queries in the chat interface:\n');
    
    TEST_CASES.forEach((testCase, i) => {
      console.log(`   ${i + 1}. ${testCase.name}`);
      console.log(`      Query: "${testCase.message}"`);
      console.log(`      Expected: ${testCase.expectation}\n`);
    });
    
    console.log('   4. Verify the responses match expectations');
    console.log('   5. Check backend logs for filtering decisions\n');
    console.log('💡 To run automated tests, set FIREBASE_TOKEN environment variable:');
    console.log('   FIREBASE_TOKEN=<your-token> node test/test-smart-filtering.js\n');
    return;
  }

  console.log('');
  let passCount = 0;
  let totalCount = TEST_CASES.length;

  // Run each test
  for (const testCase of TEST_CASES) {
    console.log(`🧪 Test: ${testCase.name}`);
    console.log(`  📤 Query: "${testCase.message}"`);
    console.log(`  🎯 Expectation: ${testCase.expectation}`);

    const response = await sendMessage(testCase.message);
    if (response) {
      const success = analyzeResponse(testCase, response);
      if (success) passCount++;
    } else {
      console.log(`  ❌ FAIL: No response received\n`);
    }

    // Wait between requests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Summary
  console.log('=' .repeat(70));
  console.log(`\n📊 Test Summary: ${passCount}/${totalCount} tests passed (${Math.round(passCount/totalCount*100)}%)\n`);
}

// Run tests
runTests().catch(error => {
  console.error('Test suite failed:', error);
  process.exit(1);
});
