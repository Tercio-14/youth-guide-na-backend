/**
 * Quick Test: RAG Offline Mode
 * 
 * This script tests that the RAG system correctly supports offline mode:
 * 1. Forces dummy-opportunities.json
 * 2. Skips AI reranking
 * 3. Returns proper metadata
 * 4. Preserves online mode
 */

const { hybridRetrieveOpportunities } = require('./src/utils/rag');

async function testRAGOfflineMode() {
  console.log('🧪 Testing RAG Offline Mode Support\n');
  
  try {
    // Test 1: Online mode (default)
    console.log('Test 1: Online Mode (AI Reranking)');
    console.log('─'.repeat(50));
    const onlineResult = await hybridRetrieveOpportunities(
      'software developer jobs in windhoek',
      { topK: 3 }
      // isOfflineMode not provided = defaults to false
    );
    
    console.log('✅ Online mode result:');
    console.log(`  - Opportunities: ${onlineResult.opportunities.length}`);
    console.log(`  - Is Offline: ${onlineResult.isOffline}`);
    console.log(`  - Used AI: ${onlineResult.usedAI}`);
    console.log(`  - Data Source: ${onlineResult.dataSource}`);
    console.log(`  - First opportunity: ${onlineResult.opportunities[0]?.title || 'N/A'}`);
    console.log();
    
    // Test 2: Offline mode (no AI, dummy data)
    console.log('Test 2: Offline Mode (No AI, Dummy Data)');
    console.log('─'.repeat(50));
    const offlineResult = await hybridRetrieveOpportunities(
      'software developer jobs in windhoek',
      { topK: 3 },
      true // isOfflineMode = true
    );
    
    console.log('✅ Offline mode result:');
    console.log(`  - Opportunities: ${offlineResult.opportunities.length}`);
    console.log(`  - Is Offline: ${offlineResult.isOffline}`);
    console.log(`  - Used AI: ${offlineResult.usedAI}`);
    console.log(`  - Data Source: ${offlineResult.dataSource}`);
    console.log(`  - First opportunity: ${offlineResult.opportunities[0]?.title || 'N/A'}`);
    console.log();
    
    // Verify expectations
    console.log('Verification:');
    console.log('─'.repeat(50));
    
    const checks = [
      {
        name: 'Online mode uses AI',
        pass: onlineResult.usedAI === true,
        expected: 'usedAI = true',
        actual: `usedAI = ${onlineResult.usedAI}`
      },
      {
        name: 'Online mode not marked offline',
        pass: onlineResult.isOffline === false,
        expected: 'isOffline = false',
        actual: `isOffline = ${onlineResult.isOffline}`
      },
      {
        name: 'Offline mode skips AI',
        pass: offlineResult.usedAI === false,
        expected: 'usedAI = false',
        actual: `usedAI = ${offlineResult.usedAI}`
      },
      {
        name: 'Offline mode marked offline',
        pass: offlineResult.isOffline === true,
        expected: 'isOffline = true',
        actual: `isOffline = ${offlineResult.isOffline}`
      },
      {
        name: 'Offline mode uses dummy data',
        pass: offlineResult.dataSource === 'dummy',
        expected: 'dataSource = dummy',
        actual: `dataSource = ${offlineResult.dataSource}`
      },
      {
        name: 'Both return results',
        pass: onlineResult.opportunities.length > 0 && offlineResult.opportunities.length > 0,
        expected: 'both > 0',
        actual: `online: ${onlineResult.opportunities.length}, offline: ${offlineResult.opportunities.length}`
      }
    ];
    
    let passed = 0;
    let failed = 0;
    
    checks.forEach(check => {
      if (check.pass) {
        console.log(`✅ ${check.name}`);
        console.log(`   Expected: ${check.expected}`);
        console.log(`   Actual: ${check.actual}`);
        passed++;
      } else {
        console.log(`❌ ${check.name}`);
        console.log(`   Expected: ${check.expected}`);
        console.log(`   Actual: ${check.actual}`);
        failed++;
      }
      console.log();
    });
    
    // Summary
    console.log('Summary:');
    console.log('─'.repeat(50));
    console.log(`✅ Passed: ${passed}/${checks.length}`);
    console.log(`❌ Failed: ${failed}/${checks.length}`);
    console.log();
    
    if (failed === 0) {
      console.log('🎉 All tests passed! RAG offline mode is working correctly.');
    } else {
      console.log('⚠️ Some tests failed. Please review the RAG implementation.');
    }
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Run test
testRAGOfflineMode()
  .then(() => {
    console.log('\n✅ Test completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });
