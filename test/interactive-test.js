/**
 * Interactive Test Runner for Smart Filtering
 * This script will guide you through getting your Firebase token
 * and then run the tests automatically.
 */

const readline = require('readline');
const axios = require('axios');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const BASE_URL = 'http://localhost:3001';

// Test cases
const TEST_CASES = [
  {
    name: 'General Query',
    message: 'what opportunities are available?',
    expectation: 'Should return multiple types'
  },
  {
    name: 'Scholarships (correct spelling)',
    message: 'show me scholarships',
    expectation: 'ONLY scholarships/bursaries'
  },
  {
    name: 'Scholarships (misspelling)',
    message: 'any scholerships available?',
    expectation: 'Handles typo → ONLY scholarships'
  },
  {
    name: 'Funding (synonym)',
    message: 'I need funding for university',
    expectation: 'Understands synonym → ONLY scholarships'
  },
  {
    name: 'Internships',
    message: 'looking for internships',
    expectation: 'ONLY internships/learnerships'
  }
];

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function checkBackend() {
  try {
    const response = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Backend is healthy');
    return true;
  } catch (error) {
    console.error('❌ Backend is not running!');
    console.error('   Start it with: npm start\n');
    return false;
  }
}

async function testWithToken(token) {
  console.log('\n🧪 Running tests...\n');
  let passCount = 0;

  for (const testCase of TEST_CASES) {
    console.log(`📝 Test: ${testCase.name}`);
    console.log(`   Query: "${testCase.message}"`);
    
    try {
      const response = await axios.post(
        `${BASE_URL}/api/chat`,
        { message: testCase.message },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 15000 // 15 second timeout
        }
      );

      if (response.data && response.data.response) {
        const text = response.data.response.toLowerCase();
        
        // Analyze response
        const hasScholarships = /scholarship|bursary|bursaries/i.test(text);
        const hasInternships = /internship|learnership/i.test(text);
        const hasJobs = /\bjob\b|position|employment/i.test(text);
        const hasTraining = /training|course|program/i.test(text);
        
        console.log(`   Response preview: "${response.data.response.substring(0, 100)}..."`);
        console.log(`   Contains: ${[
          hasScholarships ? 'scholarships' : '',
          hasInternships ? 'internships' : '',
          hasJobs ? 'jobs' : '',
          hasTraining ? 'training' : ''
        ].filter(Boolean).join(', ') || 'nothing specific'}`);
        
        // Check if result matches expectation
        let success = false;
        if (testCase.message.includes('scholarship') || testCase.message.includes('scholership') || testCase.message.includes('funding')) {
          success = hasScholarships && !hasJobs && !hasInternships;
          console.log(`   ${success ? '✅ PASS' : '❌ FAIL'}: ${success ? 'Correctly filtered to scholarships' : 'Unexpected content'}`);
        } else if (testCase.message.includes('internship')) {
          success = hasInternships && !hasJobs && !hasScholarships;
          console.log(`   ${success ? '✅ PASS' : '❌ FAIL'}: ${success ? 'Correctly filtered to internships' : 'Unexpected content'}`);
        } else {
          // General query
          const typeCount = [hasScholarships, hasInternships, hasJobs, hasTraining].filter(Boolean).length;
          success = typeCount >= 1;
          console.log(`   ${success ? '✅ PASS' : '⚠️ WARNING'}: Shows ${typeCount} different types`);
        }
        
        if (success) passCount++;
        
      } else {
        console.log('   ❌ FAIL: No response received');
      }
    } catch (error) {
      console.log(`   ❌ ERROR: ${error.message}`);
      if (error.response?.status === 401) {
        console.log('   Token may be expired - get a fresh one!');
      }
    }
    
    console.log('');
    
    // Wait between requests
    await new Promise(resolve => setTimeout(resolve, 1500));
  }

  console.log('='.repeat(70));
  console.log(`\n📊 Results: ${passCount}/${TEST_CASES.length} tests passed (${Math.round(passCount/TEST_CASES.length*100)}%)\n`);
}

async function main() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║     Interactive Smart Filtering Test Runner               ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // Check backend
  if (!await checkBackend()) {
    rl.close();
    return;
  }

  console.log('\n📋 To get your Firebase token:');
  console.log('   1. Open your frontend (http://localhost:5173)');
  console.log('   2. Log in with your account');
  console.log('   3. Open Browser DevTools (F12)');
  console.log('   4. Go to Network tab');
  console.log('   5. Send a chat message');
  console.log('   6. Find the /api/chat request');
  console.log('   7. Look at Headers → Authorization');
  console.log('   8. Copy everything AFTER "Bearer "\n');

  const token = await question('🔑 Paste your Firebase token here (or press Enter to skip): ');

  if (!token || token.trim() === '') {
    console.log('\n⚠️  No token provided - skipping automated tests');
    console.log('   Use manual testing in the chat UI instead\n');
    rl.close();
    return;
  }

  // Validate token format (JWT format)
  if (token.split('.').length !== 3) {
    console.log('\n❌ Invalid token format!');
    console.log('   Firebase tokens have 3 parts separated by dots (JWT format)');
    console.log('   Example: eyJhbGc...abc123.eyJzdWI...xyz789.SflKxw...def456\n');
    rl.close();
    return;
  }

  await testWithToken(token.trim());
  rl.close();
}

main().catch(error => {
  console.error('\n❌ Test failed:', error.message);
  rl.close();
  process.exit(1);
});
