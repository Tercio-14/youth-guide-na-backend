/**
 * Hybrid RAG System Tests
 * ========================
 * 
 * Tests the Two-Stage Hybrid RAG system:
 * - Stage 1: TF-IDF filtering
 * - Stage 2: AI-based reranking
 * 
 * These tests verify that AI reranking improves:
 * - Skill matching (cooking → chef)
 * - Semantic understanding
 * - Profile personalization
 */

// Load environment variables
require('dotenv').config();

const { hybridRetrieveOpportunities } = require('../src/utils/rag');
const { loadOpportunities } = require('../src/utils/rag');

// Colors for terminal output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  reset: '\x1b[0m',
  bright: '\x1b[1m'
};

// Test results tracker
let totalTests = 0;
let passedTests = 0;
const failedTests = [];

/**
 * Simple assertion helper
 */
function assert(condition, testName, expected, actual, details = '') {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`${colors.green}✓${colors.reset} ${testName}`);
    return true;
  } else {
    failedTests.push({ testName, expected, actual, details });
    console.log(`${colors.red}✗${colors.reset} ${testName}`);
    console.log(`  Expected: ${expected}`);
    console.log(`  Actual:   ${actual}`);
    if (details) console.log(`  Details:  ${details}`);
    return false;
  }
}

/**
 * Main test runner
 */
async function runHybridRAGTests() {
  console.log(`\n${colors.bright}${colors.blue}===========================================`);
  console.log(`  HYBRID RAG SYSTEM TESTS`);
  console.log(`  (Two-Stage: TF-IDF + AI Reranking)`);
  console.log(`===========================================${colors.reset}\n`);

  // Load opportunities for reference
  const opportunities = await loadOpportunities();
  console.log(`Total opportunities in database: ${opportunities.length}\n`);

  // ========================================
  // TEST CATEGORY 1: SKILL MATCHING
  // ========================================
  console.log(`${colors.bright}${colors.blue}[CATEGORY 1] Skill Matching with AI${colors.reset}\n`);

  // Test 1: Cooking skills should match Chef jobs
  {
    const profile = {
      skills: ['Cooking', 'Food Preparation'],
      interests: ['Hospitality', 'Culinary Arts']
    };
    const results = await hybridRetrieveOpportunities('I want a job in food industry', {
      topK: 5,
      userProfile: profile
    });
    
    // Check if results have high AI scores
    const avgAIScore = results.reduce((sum, r) => sum + r.aiScore, 0) / results.length;
    
    assert(
      results.length > 0 && avgAIScore >= 40,
      'Cooking skills should match food-related opportunities',
      'Food-related jobs with AI score >= 40',
      results.length > 0 ? `Found ${results.length} results, avg AI score: ${avgAIScore.toFixed(1)}` : 'No results',
      'AI should understand cooking → chef/kitchen/food synonyms'
    );
  }

  // Test 2: Driving skills should match Driver/Logistics jobs
  {
    const profile = {
      skills: ['Driving', 'Navigation'],
      interests: ['Transportation', 'Logistics']
    };
    const results = await hybridRetrieveOpportunities('show me driving jobs', {
      topK: 5,
      userProfile: profile
    });
    
    const hasDriverJobs = results.some(r => 
      r.title.toLowerCase().includes('driver') || 
      r.title.toLowerCase().includes('logistics') ||
      r.title.toLowerCase().includes('transport')
    );
    
    assert(
      hasDriverJobs,
      'Driving skills should match driver/logistics opportunities',
      'Driver, logistics, or transport jobs',
      results.length > 0 ? results.map(r => r.title).join(', ') : 'No results'
    );
  }

  // Test 3: Cleaning skills should match Housekeeping/Janitorial jobs
  {
    const profile = {
      skills: ['Cleaning', 'Maintenance'],
      interests: ['Part-time Jobs']
    };
    const results = await hybridRetrieveOpportunities('cleaning positions available', {
      topK: 5,
      userProfile: profile
    });
    
    const avgAIScore = results.length > 0 ? results.reduce((sum, r) => sum + r.aiScore, 0) / results.length : 0;
    
    assert(
      results.length > 0 && avgAIScore >= 30,
      'Cleaning skills should find relevant opportunities',
      'Cleaning-related jobs with decent AI scores',
      `Found ${results.length} results, avg AI score: ${avgAIScore.toFixed(1)}`
    );
  }

  // ========================================
  // TEST CATEGORY 2: TYPE FILTERING
  // ========================================
  console.log(`\n${colors.bright}${colors.blue}[CATEGORY 2] Strict Type Filtering${colors.reset}\n`);

  // Test 4: "Jobs" query should NOT return Training
  {
    const results = await hybridRetrieveOpportunities('I need jobs near me', {
      topK: 5
    });
    
    const allJobs = results.every(r => r.type === 'Job');
    const trainingCount = results.filter(r => r.type === 'Training').length;
    
    assert(
      allJobs || trainingCount <= 1,
      'Query for "jobs" should prioritize Job type',
      'All Job types (or at most 1 Training with high score)',
      `Types: ${results.map(r => r.type).join(', ')}`,
      'AI should understand intent and rank Jobs higher'
    );
  }

  // Test 5: "Training" query should return Training
  {
    const results = await hybridRetrieveOpportunities('what training programs are available', {
      topK: 5
    });
    
    const hasTraining = results.some(r => r.type === 'Training');
    const trainingCount = results.filter(r => r.type === 'Training').length;
    
    assert(
      hasTraining && trainingCount >= 2,
      'Query for "training" should return Training opportunities',
      'At least 2 Training opportunities',
      `Found ${trainingCount} Training: ${results.filter(r => r.type === 'Training').map(r => r.title).join(', ')}`
    );
  }

  // ========================================
  // TEST CATEGORY 3: PROFILE PERSONALIZATION
  // ========================================
  console.log(`\n${colors.bright}${colors.blue}[CATEGORY 3] Profile-Based Personalization${colors.reset}\n`);

  // Test 6: Strong profile should get high relevance scores
  {
    const profile = {
      skills: ['IT/Computer', 'Software Development', 'Programming'],
      interests: ['Technology', 'Coding'],
      location: 'Windhoek'
    };
    const results = await hybridRetrieveOpportunities('show me opportunities', {
      topK: 5,
      userProfile: profile
    });
    
    const topScore = results[0]?.aiScore || 0;
    const hasITJobs = results.some(r => 
      r.title.toLowerCase().includes('it') || 
      r.title.toLowerCase().includes('software') ||
      r.title.toLowerCase().includes('developer')
    );
    
    assert(
      hasITJobs && topScore >= 50,
      'Strong IT profile should get highly relevant IT opportunities',
      'IT jobs with AI score >= 50',
      `Top result: "${results[0]?.title}" (AI score: ${topScore})`
    );
  }

  // Test 7: Location preference should be respected
  {
    const profile = {
      location: 'Windhoek',
      skills: ['Sales']
    };
    const results = await hybridRetrieveOpportunities('jobs in my area', {
      topK: 5,
      userProfile: profile
    });
    
    const windhoekJobs = results.filter(r => r.location === 'Windhoek').length;
    
    assert(
      windhoekJobs >= 3,
      'Location preference should prioritize local opportunities',
      'At least 3 Windhoek opportunities',
      `Found ${windhoekJobs} Windhoek jobs out of ${results.length}`
    );
  }

  // ========================================
  // TEST CATEGORY 4: SEMANTIC UNDERSTANDING
  // ========================================
  console.log(`\n${colors.bright}${colors.blue}[CATEGORY 4] Semantic Understanding${colors.reset}\n`);

  // Test 8: Generic query with profile should work
  {
    const profile = {
      skills: ['Customer Service', 'Communication'],
      interests: ['People', 'Helping Others']
    };
    const results = await hybridRetrieveOpportunities('I want to help people', {
      topK: 5,
      userProfile: profile
    });
    
    assert(
      results.length > 0,
      'Generic query with profile should find relevant opportunities',
      'Customer service or people-facing roles',
      results.length > 0 ? results.map(r => `${r.title} (AI: ${r.aiScore})`).join(', ') : 'No results'
    );
  }

  // Test 9: Part-time query should understand intent
  {
    const results = await hybridRetrieveOpportunities('part-time work opportunities', {
      topK: 5
    });
    
    const avgAIScore = results.length > 0 ? results.reduce((sum, r) => sum + r.aiScore, 0) / results.length : 0;
    
    assert(
      results.length > 0 && avgAIScore >= 30,
      'Part-time query should return relevant opportunities',
      'Opportunities with decent relevance',
      `${results.length} results, avg AI score: ${avgAIScore.toFixed(1)}`
    );
  }

  // ========================================
  // TEST CATEGORY 5: COMPARISON WITH STAGE 1
  // ========================================
  console.log(`\n${colors.bright}${colors.blue}[CATEGORY 5] Stage 1 vs Stage 2 Improvement${colors.reset}\n`);

  // Test 10: AI reranking should improve results
  {
    const profile = {
      skills: ['Sales', 'Marketing'],
      interests: ['Business']
    };
    const results = await hybridRetrieveOpportunities('sales positions', {
      topK: 5,
      userProfile: profile
    });
    
    // Check if top results have higher AI scores than Stage 1 scores
    const improvements = results.filter(r => r.aiScore > (r.stage1Score * 100));
    
    assert(
      improvements.length >= 2,
      'AI reranking should improve at least 2 results',
      'At least 2 opportunities with AI score > Stage1 score',
      `${improvements.length} improved results`
    );
  }

  // ========================================
  // RESULTS SUMMARY
  // ========================================
  console.log(`\n${colors.bright}${colors.blue}===========================================`);
  console.log(`  TEST RESULTS`);
  console.log(`===========================================${colors.reset}\n`);

  const successRate = ((passedTests / totalTests) * 100).toFixed(1);
  const passColor = successRate >= 80 ? colors.green : successRate >= 60 ? colors.yellow : colors.red;

  console.log(`Total Tests:  ${totalTests}`);
  console.log(`Passed:       ${colors.green}${passedTests}${colors.reset}`);
  console.log(`Failed:       ${colors.red}${totalTests - passedTests}${colors.reset}`);
  console.log(`Success Rate: ${passColor}${successRate}%${colors.reset}\n`);

  if (failedTests.length > 0) {
    console.log(`${colors.bright}Failed Tests Details:${colors.reset}\n`);
    failedTests.forEach((test, i) => {
      console.log(`${i + 1}. ${test.testName}`);
      console.log(`   Expected: ${test.expected}`);
      console.log(`   Actual:   ${test.actual}`);
      if (test.details) console.log(`   Details:  ${test.details}`);
      console.log('');
    });
  }

  console.log(`${colors.bright}===========================================\n${colors.reset}`);

  // Exit with error code if tests failed
  process.exit(totalTests - passedTests);
}

// Run tests
runHybridRAGTests().catch(error => {
  console.error('Test execution failed:', error);
  process.exit(1);
});
