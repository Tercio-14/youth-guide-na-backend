/**
 * Debug RAG Results
 * Test what opportunities are being returned for various queries
 */

require('dotenv').config();
const { retrieveOpportunities } = require('../src/utils/rag');

async function testQuery(query, userProfile = null) {
  console.log('\n===========================================');
  console.log(`QUERY: "${query}"`);
  if (userProfile) {
    console.log('PROFILE:', JSON.stringify(userProfile, null, 2));
  }
  console.log('===========================================\n');
  
  const results = await retrieveOpportunities(query, {
    topK: 10,
    minScore: 0.01,
    userProfile
  });
  
  console.log(`Found ${results.length} results:\n`);
  
  results.forEach((opp, idx) => {
    const isExample = opp.source === 'Example Website' ? ' [EXAMPLE]' : '';
    console.log(`${idx + 1}. ${opp.title}${isExample}`);
    console.log(`   Type: ${opp.type} | Source: ${opp.source}`);
    console.log(`   Score: ${opp.score.toFixed(4)}`);
    if (opp._debug) {
      console.log(`   Debug: semantic=${opp._debug.semanticScore.toFixed(4)}, boost=${opp._debug.preferenceBoost.toFixed(2)}, typeAlign=${opp._debug.typeAlignmentBoost.toFixed(2)}`);
    }
    console.log('');
  });
  
  // Count example vs real opportunities
  const exampleCount = results.filter(r => r.source === 'Example Website').length;
  const realCount = results.length - exampleCount;
  
  console.log('-------------------------------------------');
  console.log(`Example opportunities: ${exampleCount}/${results.length} (${((exampleCount/results.length)*100).toFixed(1)}%)`);
  console.log(`Real opportunities: ${realCount}/${results.length} (${((realCount/results.length)*100).toFixed(1)}%)`);
  console.log('-------------------------------------------');
}

async function runTests() {
  console.log('\n');
  console.log('╔════════════════════════════════════════════╗');
  console.log('║   RAG RESULTS DEBUG TESTS                  ║');
  console.log('╔════════════════════════════════════════════╗');
  
  // Test 1: Generic job search
  await testQuery('looking for a job');
  
  // Test 2: IT/Tech job search
  await testQuery('software developer programming IT');
  
  // Test 3: Training search
  await testQuery('I want training programs');
  
  // Test 4: Security jobs
  await testQuery('security guard job');
  
  // Test 5: With user profile
  await testQuery('find me opportunities', {
    skills: ['Cooking', 'Food Preparation'],
    interests: ['Hospitality'],
    location: 'Windhoek'
  });
  
  // Test 6: Banking/Finance
  await testQuery('bank jobs finance accounting');
  
  // Test 7: Retail/Sales
  await testQuery('sales retail assistant');
  
  console.log('\n✅ Debug tests complete!\n');
}

runTests().catch(console.error);
