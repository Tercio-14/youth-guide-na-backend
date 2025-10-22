/**
 * COMPREHENSIVE RAG SYSTEM TESTS
 * 
 * These tests verify that the RAG system retrieves the correct opportunities
 * based on user queries, profile preferences, and various edge cases.
 * 
 * Run with: node test/comprehensive-rag-tests.js
 */

const { retrieveOpportunities } = require('../src/utils/rag');
const fs = require('fs');
const path = require('path');

// Load opportunities data
const opportunitiesPath = path.join(__dirname, '../data/opportunities.json');
const opportunitiesData = JSON.parse(fs.readFileSync(opportunitiesPath, 'utf8'));
const allOpportunities = opportunitiesData.opportunities;

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

// Test results tracker
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const failures = [];

/**
 * Test assertion helper
 */
function assert(condition, testName, expected, actual, details = '') {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`${colors.green}✓${colors.reset} ${testName}`);
    return true;
  } else {
    failedTests++;
    const failure = {
      testName,
      expected,
      actual,
      details
    };
    failures.push(failure);
    console.log(`${colors.red}✗${colors.reset} ${testName}`);
    console.log(`  ${colors.red}Expected:${colors.reset} ${expected}`);
    console.log(`  ${colors.red}Actual:${colors.reset} ${actual}`);
    if (details) console.log(`  ${colors.yellow}Details:${colors.reset} ${details}`);
    return false;
  }
}

/**
 * Helper to check if results contain specific opportunity
 */
function containsOpportunity(results, opportunityId) {
  return results.some(opp => opp.id === opportunityId);
}

/**
 * Helper to check if results contain opportunity with specific title pattern
 */
function containsTitlePattern(results, pattern) {
  return results.some(opp => pattern.test(opp.title));
}

/**
 * Helper to get opportunity types from results
 */
function getTypes(results) {
  return [...new Set(results.map(opp => opp.type))];
}

/**
 * Helper to get locations from results
 */
function getLocations(results) {
  return [...new Set(results.map(opp => opp.location))];
}

/**
 * Run all tests
 */
async function runTests() {
  console.log(`\n${colors.bright}${colors.cyan}===========================================`);
  console.log(`  COMPREHENSIVE RAG SYSTEM TESTS`);
  console.log(`===========================================${colors.reset}\n`);
  console.log(`Total opportunities in database: ${allOpportunities.length}\n`);

  // ========================================
  // TEST CATEGORY 1: SPECIFIC JOB SEARCHES
  // ========================================
  console.log(`${colors.bright}${colors.blue}[CATEGORY 1] Specific Job Searches${colors.reset}\n`);

  // Test 1: IT/Software Developer search
  {
    const results = await retrieveOpportunities('software developer jobs', { topK: 5, minScore: 0.05 });
    const hasITJobs = containsOpportunity(results, 'example_1') || // Junior Software Developer
                      containsOpportunity(results, 'aba013e53296faf2'); // IT PROJECT MANAGER
    
    assert(
      hasITJobs,
      'IT/Software jobs should appear for "software developer jobs" query',
      'IT/Software related opportunities',
      results.length > 0 ? results.map(r => r.title).join(', ') : 'No results',
      'Should prioritize Junior Software Developer (example_1) or IT PROJECT MANAGER'
    );
  }

  // Test 2: Bank/Finance jobs
  {
    const results = await retrieveOpportunities('bank jobs windhoek', { topK: 5, minScore: 0.05 });
    const hasBankJobs = containsTitlePattern(results, /bank|treasurer|finance/i);
    
    assert(
      hasBankJobs,
      'Bank jobs should appear for "bank jobs windhoek" query',
      'Bank Windhoek or similar financial roles',
      results.map(r => r.title).join(', '),
      'Should include EXECUTIVE OFFICER – Bank Windhoek or CHIEF TREASURER'
    );
  }

  // Test 3: Security Guard specific search
  {
    const results = await retrieveOpportunities('security guard position', { topK: 5, minScore: 0.05 });
    const hasSecurityJob = containsOpportunity(results, 'example_3'); // Security Guard
    
    assert(
      hasSecurityJob,
      'Security Guard job should appear for "security guard position" query',
      'Security Guard opportunity (example_3)',
      results.map(r => r.title).join(', ')
    );
  }

  // Test 4: Receptionist/Front desk
  {
    const results = await retrieveOpportunities('receptionist front desk', { topK: 5, minScore: 0.05 });
    const hasReceptionist = containsTitlePattern(results, /receptionist|front desk/i);
    
    assert(
      hasReceptionist,
      'Receptionist jobs should appear for "receptionist front desk" query',
      'CORPORATE RECEPTIONIST / FRONT DESK ASSISTANT',
      results.map(r => r.title).join(', ')
    );
  }

  // ========================================
  // TEST CATEGORY 2: LOCATION-BASED SEARCHES
  // ========================================
  console.log(`\n${colors.bright}${colors.blue}[CATEGORY 2] Location-Based Searches${colors.reset}\n`);

  // Test 5: Windhoek location filter
  {
    const results = await retrieveOpportunities('jobs in windhoek', { 
      topK: 10, 
      minScore: 0.05,
      filterLocation: 'Windhoek'
    });
    const locations = getLocations(results);
    const allWindhoek = results.every(opp => opp.location === 'Windhoek' || opp.location === 'Namibia');
    
    assert(
      allWindhoek && results.length > 0,
      'Location filter should return only Windhoek opportunities',
      'All locations: Windhoek or Namibia',
      `Locations found: ${locations.join(', ')}`,
      `Found ${results.length} opportunities`
    );
  }

  // Test 6: Walvis Bay location
  {
    const results = await retrieveOpportunities('jobs in walvis bay', { 
      topK: 5, 
      minScore: 0.05 
    });
    const hasWalvisBay = results.some(opp => opp.location.toLowerCase().includes('walvis'));
    
    assert(
      hasWalvisBay || results.some(opp => opp.id === 'example_3'), // Security Guard in Walvis Bay
      'Should find opportunities in Walvis Bay',
      'Walvis Bay opportunities',
      results.map(r => `${r.title} (${r.location})`).join(', ')
    );
  }

  // ========================================
  // TEST CATEGORY 3: TYPE-BASED SEARCHES
  // ========================================
  console.log(`\n${colors.bright}${colors.blue}[CATEGORY 3] Type-Based Searches${colors.reset}\n`);

  // Test 7: Training programs
  {
    const results = await retrieveOpportunities('training programs for youth', { 
      topK: 5, 
      minScore: 0.05,
      filterTypes: ['Training']
    });
    const types = getTypes(results);
    const allTraining = results.every(opp => opp.type === 'Training');
    
    assert(
      allTraining && results.length > 0,
      'Type filter should return only Training opportunities',
      'All types: Training',
      `Types found: ${types.join(', ')}`,
      'Should include Plumbing Skills Training (example_4)'
    );
  }

  // Test 8: Scholarship/Bursary search
  {
    const results = await retrieveOpportunities('scholarship bursary funding', { 
      topK: 5, 
      minScore: 0.05 
    });
    const hasScholarship = results.some(opp => opp.type === 'Scholarship');
    
    assert(
      hasScholarship,
      'Should find scholarship/bursary opportunities',
      'Scholarship type',
      results.map(r => `${r.title} (${r.type})`).join(', '),
      'Should include BURSARY – Langer Heinrich Uranium'
    );
  }

  // Test 9: Internship search
  {
    const results = await retrieveOpportunities('internship opportunities', { 
      topK: 5, 
      minScore: 0.05,
      filterTypes: ['Internship']
    });
    const allInternships = results.every(opp => opp.type === 'Internship');
    
    assert(
      allInternships && results.length > 0,
      'Should find only internship opportunities when type filter applied',
      'All types: Internship',
      `Found ${results.length} results: ${results.map(r => r.title).join(', ')}`,
      'Should include INTERNAL AUDIT AND RISK MANAGEMENT internship'
    );
  }

  // ========================================
  // TEST CATEGORY 4: PROFILE-BASED PERSONALIZATION
  // ========================================
  console.log(`\n${colors.bright}${colors.blue}[CATEGORY 4] Profile-Based Personalization${colors.reset}\n`);

  // Test 10: IT skills profile
  {
    const profile = {
      skills: ['IT/Computer', 'Software Development'],
      interests: ['Technology', 'Programming']
    };
    const results = await retrieveOpportunities('show me jobs', { 
      topK: 5, 
      minScore: 0.05,
      userProfile: profile
    });
    const hasITJobs = containsTitlePattern(results, /IT|software|developer|technology/i);
    
    assert(
      hasITJobs,
      'Profile with IT skills should boost IT-related jobs',
      'IT/Software jobs ranked higher',
      results.map(r => `${r.title} (score: ${r.score?.toFixed(3)})`).join(', ')
    );
  }

  // Test 11: Sales skills profile
  {
    const profile = {
      skills: ['Sales', 'Customer Service'],
      interests: ['Earn Money', 'Part-time Jobs']
    };
    const results = await retrieveOpportunities('find opportunities', { 
      topK: 5, 
      minScore: 0.05,
      userProfile: profile
    });
    
    // Check if sales-related jobs are present
    const hasSalesJobs = results.some(opp => 
      opp.title.toLowerCase().includes('sales') || 
      opp.title.toLowerCase().includes('marketing')
    );
    
    assert(
      hasSalesJobs,
      'Profile with Sales skills should boost sales-related jobs',
      'Sales/Marketing jobs',
      results.map(r => r.title).join(', ')
    );
  }

  // Test 12: Location preference in profile
  {
    const profile = {
      location: 'Windhoek',
      interests: ['Part-time Jobs']
    };
    const results = await retrieveOpportunities('job opportunities', { 
      topK: 5, 
      minScore: 0.05,
      userProfile: profile
    });
    const windhoekCount = results.filter(opp => opp.location === 'Windhoek').length;
    
    assert(
      windhoekCount >= 3,
      'Profile with Windhoek location should boost Windhoek opportunities',
      'At least 3 Windhoek opportunities in top 5',
      `${windhoekCount} Windhoek opportunities found`,
      results.map(r => `${r.title} (${r.location})`).join(', ')
    );
  }

  // ========================================
  // TEST CATEGORY 5: EDGE CASES & NEGATIVE TESTS
  // ========================================
  console.log(`\n${colors.bright}${colors.blue}[CATEGORY 5] Edge Cases & Negative Tests${colors.reset}\n`);

  // Test 13: Empty query
  {
    const results = await retrieveOpportunities('', { topK: 5, minScore: 0.05 });
    
    assert(
      results.length === 0,
      'Empty query should return no results',
      '0 results',
      `${results.length} results`
    );
  }

  // Test 14: Completely irrelevant query
  {
    const results = await retrieveOpportunities('quantum physics research space exploration', { 
      topK: 5, 
      minScore: 0.15 // Higher threshold
    });
    
    assert(
      results.length === 0 || results.length < 3,
      'Irrelevant query should return few or no results',
      'Few or no results',
      `${results.length} results: ${results.map(r => r.title).join(', ')}`
    );
  }

  // Test 15: Very specific query with no matches
  {
    const results = await retrieveOpportunities('astronaut position international space station', { 
      topK: 5, 
      minScore: 0.1 
    });
    
    assert(
      results.length === 0,
      'Query for non-existent job type should return no results',
      '0 results',
      `${results.length} results`
    );
  }

  // Test 16: Case insensitivity
  {
    const results1 = await retrieveOpportunities('SOFTWARE DEVELOPER', { topK: 5, minScore: 0.05 });
    const results2 = await retrieveOpportunities('software developer', { topK: 5, minScore: 0.05 });
    const results3 = await retrieveOpportunities('SoFtWaRe DeVeLoPeR', { topK: 5, minScore: 0.05 });
    
    assert(
      results1.length === results2.length && results2.length === results3.length,
      'Query should be case-insensitive',
      'Same results for different cases',
      `UPPER: ${results1.length}, lower: ${results2.length}, MiXeD: ${results3.length}`
    );
  }

  // Test 17: Minimum score threshold
  {
    const resultsLowThreshold = await retrieveOpportunities('job', { topK: 10, minScore: 0.01 });
    const resultsHighThreshold = await retrieveOpportunities('job', { topK: 10, minScore: 0.3 });
    
    assert(
      resultsLowThreshold.length > resultsHighThreshold.length,
      'Lower minScore should return more results',
      'More results with low threshold',
      `Low (0.01): ${resultsLowThreshold.length}, High (0.3): ${resultsHighThreshold.length}`
    );
  }

  // Test 18: TopK parameter
  {
    const results3 = await retrieveOpportunities('opportunities', { topK: 3, minScore: 0.05 });
    const results10 = await retrieveOpportunities('opportunities', { topK: 10, minScore: 0.05 });
    
    assert(
      results3.length <= 3 && results10.length <= 10,
      'TopK parameter should limit results correctly',
      'results3 <= 3 and results10 <= 10',
      `topK=3: ${results3.length}, topK=10: ${results10.length}`
    );
  }

  // ========================================
  // TEST CATEGORY 6: MULTI-CRITERIA SEARCHES
  // ========================================
  console.log(`\n${colors.bright}${colors.blue}[CATEGORY 6] Multi-Criteria Searches${colors.reset}\n`);

  // Test 19: Location + Type combination
  {
    const results = await retrieveOpportunities('training in windhoek', { 
      topK: 5, 
      minScore: 0.05,
      filterTypes: ['Training'],
      filterLocation: 'Windhoek'
    });
    const allMatch = results.every(opp => 
      opp.type === 'Training' && (opp.location === 'Windhoek' || opp.location === 'Namibia')
    );
    
    assert(
      allMatch && results.length > 0,
      'Combined filters should return only matching opportunities',
      'Training in Windhoek',
      `Found ${results.length}: ${results.map(r => `${r.title} (${r.type}, ${r.location})`).join(', ')}`
    );
  }

  // Test 20: Skills + Location + Interests
  {
    const profile = {
      skills: ['IT/Computer'],
      location: 'Windhoek',
      interests: ['Technology']
    };
    const results = await retrieveOpportunities('jobs', { 
      topK: 5, 
      minScore: 0.05,
      userProfile: profile
    });
    
    const firstResult = results[0];
    const isRelevant = firstResult && (
      firstResult.title.toLowerCase().includes('it') ||
      firstResult.title.toLowerCase().includes('technology') ||
      firstResult.title.toLowerCase().includes('software') ||
      firstResult.location === 'Windhoek'
    );
    
    assert(
      isRelevant,
      'Profile with multiple criteria should boost relevant opportunities',
      'IT job in Windhoek as top result',
      firstResult ? `${firstResult.title} (${firstResult.location})` : 'No results'
    );
  }

  // ========================================
  // TEST CATEGORY 7: RANKING & SCORING
  // ========================================
  console.log(`\n${colors.bright}${colors.blue}[CATEGORY 7] Ranking & Scoring${colors.reset}\n`);

  // Test 21: Scores in descending order
  {
    const results = await retrieveOpportunities('software developer', { topK: 5, minScore: 0.05 });
    const scoresDescending = results.every((opp, i) => 
      i === 0 || results[i - 1].score >= opp.score
    );
    
    assert(
      scoresDescending,
      'Results should be sorted by score in descending order',
      'Descending scores',
      results.map(r => r.score?.toFixed(3)).join(', ')
    );
  }

  // Test 22: Recent opportunities boost
  {
    const results = await retrieveOpportunities('job opportunities', { 
      topK: 10, 
      minScore: 0.05 
    });
    
    // Check if recent opportunities (posted 2025-10-20) are present
    const hasRecentOps = results.some(opp => opp.date_posted === '2025-10-20');
    
    assert(
      hasRecentOps,
      'Recent opportunities should be included in results',
      'Some opportunities from 2025-10-20',
      results.slice(0, 5).map(r => `${r.title} (${r.date_posted})`).join(', ')
    );
  }

  // Test 23: Profile boost should increase scores
  {
    const resultsNoProfile = await retrieveOpportunities('IT jobs', { topK: 5, minScore: 0.05 });
    const resultsWithProfile = await retrieveOpportunities('IT jobs', { 
      topK: 5, 
      minScore: 0.05,
      userProfile: { skills: ['IT/Computer', 'Software Development'] }
    });
    
    const topScoreNoProfile = resultsNoProfile[0]?.score || 0;
    const topScoreWithProfile = resultsWithProfile[0]?.score || 0;
    
    assert(
      topScoreWithProfile >= topScoreNoProfile,
      'Profile with matching skills should maintain or boost top score',
      `Score >= ${topScoreNoProfile.toFixed(3)}`,
      `${topScoreWithProfile.toFixed(3)}`
    );
  }

  // ========================================
  // TEST CATEGORY 8: COMMON USER QUERIES
  // ========================================
  console.log(`\n${colors.bright}${colors.blue}[CATEGORY 8] Common User Queries${colors.reset}\n`);

  // Test 24: "part-time jobs"
  {
    const results = await retrieveOpportunities('part-time jobs', { topK: 5, minScore: 0.05 });
    
    assert(
      results.length > 0,
      'Should find opportunities for "part-time jobs" query',
      'At least 1 opportunity',
      `${results.length} opportunities found`
    );
  }

  // Test 25: "jobs near me" (should work with profile location)
  {
    const profile = { location: 'Windhoek' };
    const results = await retrieveOpportunities('jobs near me', { 
      topK: 5, 
      minScore: 0.05,
      userProfile: profile
    });
    const hasWindhoek = results.some(opp => opp.location === 'Windhoek');
    
    assert(
      hasWindhoek,
      '"jobs near me" with Windhoek profile should return Windhoek opportunities',
      'Windhoek opportunities',
      results.map(r => `${r.title} (${r.location})`).join(', ')
    );
  }

  // Test 26: "entry level jobs"
  {
    const results = await retrieveOpportunities('entry level jobs for beginners', { 
      topK: 5, 
      minScore: 0.05 
    });
    
    assert(
      results.length > 0,
      'Should find opportunities for "entry level" query',
      'At least 1 opportunity',
      `${results.length} opportunities: ${results.map(r => r.title).join(', ')}`
    );
  }

  // Test 27: "online learning"
  {
    const profile = { interests: ['Online Learning'] };
    const results = await retrieveOpportunities('training courses', { 
      topK: 5, 
      minScore: 0.05,
      userProfile: profile
    });
    const hasTraining = results.some(opp => opp.type === 'Training');
    
    assert(
      hasTraining,
      'Profile with "Online Learning" interest should boost training opportunities',
      'Training opportunities',
      results.map(r => `${r.title} (${r.type})`).join(', ')
    );
  }

  // Test 28: "urgent jobs asap"
  {
    const results = await retrieveOpportunities('urgent jobs needed asap', { 
      topK: 5, 
      minScore: 0.05 
    });
    
    assert(
      results.length > 0,
      'Urgent language should still return job opportunities',
      'At least 1 opportunity',
      `${results.length} opportunities found`
    );
  }

  // ========================================
  // TEST CATEGORY 9: SPECIAL CHARACTERS & FORMATTING
  // ========================================
  console.log(`\n${colors.bright}${colors.blue}[CATEGORY 9] Special Characters & Formatting${colors.reset}\n`);

  // Test 29: Query with special characters
  {
    const results = await retrieveOpportunities('IT jobs!!!', { topK: 5, minScore: 0.05 });
    const hasITJobs = containsTitlePattern(results, /IT|software|developer/i);
    
    assert(
      hasITJobs,
      'Query with special characters should still work',
      'IT-related jobs',
      results.map(r => r.title).join(', ')
    );
  }

  // Test 30: Query with numbers
  {
    const results = await retrieveOpportunities('jobs for age 18-25', { topK: 5, minScore: 0.05 });
    
    assert(
      results.length > 0,
      'Query with numbers should return results',
      'At least 1 opportunity',
      `${results.length} opportunities found`
    );
  }

  // ========================================
  // FINAL REPORT
  // ========================================
  console.log(`\n${colors.bright}${colors.cyan}===========================================`);
  console.log(`  TEST RESULTS`);
  console.log(`===========================================${colors.reset}\n`);
  console.log(`Total Tests:  ${colors.bright}${totalTests}${colors.reset}`);
  console.log(`Passed:       ${colors.green}${passedTests}${colors.reset}`);
  console.log(`Failed:       ${colors.red}${failedTests}${colors.reset}`);
  console.log(`Success Rate: ${colors.bright}${((passedTests / totalTests) * 100).toFixed(1)}%${colors.reset}\n`);

  if (failedTests > 0) {
    console.log(`${colors.bright}${colors.red}Failed Tests Details:${colors.reset}\n`);
    failures.forEach((failure, index) => {
      console.log(`${colors.bright}${index + 1}. ${failure.testName}${colors.reset}`);
      console.log(`   Expected: ${failure.expected}`);
      console.log(`   Actual:   ${failure.actual}`);
      if (failure.details) console.log(`   Details:  ${failure.details}`);
      console.log('');
    });
  }

  console.log(`${colors.cyan}===========================================${colors.reset}\n`);
  
  process.exit(failedTests > 0 ? 1 : 0);
}

// Run tests
runTests().catch(error => {
  console.error(`${colors.red}Error running tests:${colors.reset}`, error);
  process.exit(1);
});
