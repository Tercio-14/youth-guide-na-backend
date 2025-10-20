/**
 * RAG System Test Script
 * ======================
 * 
 * Tests the RAG retrieval system with various queries
 */

const { retrieveOpportunities, loadOpportunities } = require('../src/utils/rag');

async function testRAG() {
  console.log('🧪 Testing RAG System\n');
  console.log('=' .repeat(70));

  // Test 1: Load opportunities
  console.log('\n📊 Test 1: Loading opportunities...');
  const allOpps = await loadOpportunities();
  console.log(`✅ Loaded ${allOpps.length} opportunities`);
  console.log(`   Sources: ${[...new Set(allOpps.map(o => o.source))].join(', ')}`);
  console.log(`   Types: ${[...new Set(allOpps.map(o => o.type))].join(', ')}`);

  // Test 2: Basic query
  console.log('\n🔍 Test 2: Basic query - "jobs in Windhoek"');
  const results1 = await retrieveOpportunities("jobs in Windhoek", {
    topK: 3,
    minScore: 0.1
  });
  console.log(`✅ Found ${results1.length} results`);
  results1.forEach((opp, i) => {
    console.log(`   ${i + 1}. ${opp.title} (${opp.type}) - Score: ${opp.score.toFixed(4)}`);
    console.log(`      Location: ${opp.location}, Org: ${opp.organization}`);
  });

  // Test 3: With user profile
  console.log('\n👤 Test 3: Query with user profile');
  const userProfile = {
    skills: ['construction', 'plumbing'],
    interests: ['training', 'apprenticeship'],
    location: 'Windhoek'
  };
  const results2 = await retrieveOpportunities("training opportunities", {
    topK: 3,
    minScore: 0.05,
    userProfile
  });
  console.log(`✅ Found ${results2.length} results (with preference boost)`);
  results2.forEach((opp, i) => {
    console.log(`   ${i + 1}. ${opp.title} (${opp.type}) - Score: ${opp.score.toFixed(4)}`);
    console.log(`      Semantic: ${opp._debug?.semanticScore.toFixed(4)}, Boost: ${opp._debug?.preferenceBoost.toFixed(2)}x`);
  });

  // Test 4: Type filter
  console.log('\n🎓 Test 4: Filter by type - Training only');
  const results3 = await retrieveOpportunities("opportunities", {
    topK: 5,
    filterTypes: ['Training', 'Scholarship']
  });
  console.log(`✅ Found ${results3.length} training/scholarship opportunities`);
  results3.forEach((opp, i) => {
    console.log(`   ${i + 1}. ${opp.title} (${opp.type})`);
  });

  // Test 5: Location filter
  console.log('\n📍 Test 5: Filter by location - Swakopmund');
  const results4 = await retrieveOpportunities("jobs", {
    topK: 5,
    filterLocation: 'Swakopmund'
  });
  console.log(`✅ Found ${results4.length} opportunities in Swakopmund`);
  results4.forEach((opp, i) => {
    console.log(`   ${i + 1}. ${opp.title} - ${opp.location}`);
  });

  // Test 6: Empty query (should return random sample)
  console.log('\n🎲 Test 6: Empty query');
  const results5 = await retrieveOpportunities("", {
    topK: 3
  });
  console.log(`✅ Found ${results5.length} random opportunities`);
  results5.forEach((opp, i) => {
    console.log(`   ${i + 1}. ${opp.title}`);
  });

  // Test 7: Very specific query
  console.log('\n🎯 Test 7: Specific query - "executive bank windhoek"');
  const results6 = await retrieveOpportunities("executive bank windhoek", {
    topK: 3,
    minScore: 0.1
  });
  console.log(`✅ Found ${results6.length} highly relevant results`);
  results6.forEach((opp, i) => {
    console.log(`   ${i + 1}. ${opp.title} - Score: ${opp.score.toFixed(4)}`);
  });

  // Statistics
  console.log('\n' + '='.repeat(70));
  console.log('📈 Statistics');
  console.log('='.repeat(70));
  
  const typeCounts = {};
  const locationCounts = {};
  const sourceCounts = {};
  
  allOpps.forEach(opp => {
    typeCounts[opp.type] = (typeCounts[opp.type] || 0) + 1;
    locationCounts[opp.location] = (locationCounts[opp.location] || 0) + 1;
    sourceCounts[opp.source] = (sourceCounts[opp.source] || 0) + 1;
  });
  
  console.log('\nBy Type:');
  Object.entries(typeCounts).sort((a, b) => b[1] - a[1]).forEach(([type, count]) => {
    console.log(`   ${type}: ${count}`);
  });
  
  console.log('\nTop Locations:');
  Object.entries(locationCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).forEach(([loc, count]) => {
    console.log(`   ${loc}: ${count}`);
  });
  
  console.log('\nBy Source:');
  Object.entries(sourceCounts).forEach(([source, count]) => {
    console.log(`   ${source}: ${count}`);
  });

  console.log('\n✅ All tests completed successfully!\n');
}

// Run tests
testRAG().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
