/**
 * Quick Test for RAG Pipeline Improvements
 * ========================================
 * 
 * This test verifies:
 * 1. JSON parsing in scoreOpportunityRelevance()
 * 2. New dynamic scoring formula
 * 3. aiReasoning field is included in results
 */

const { rerankOpportunities } = require('../src/utils/ai-reranker');
const logger = require('../src/utils/logger');

async function testRagImprovements() {
  console.log('\n🧪 Testing RAG Pipeline Improvements...\n');
  
  // Mock user query and profile
  const userQuery = "I need a tech job in Windhoek";
  const userProfile = {
    skills: ['IT', 'Python', 'JavaScript'],
    interests: ['software development', 'web development'],
    location: 'Windhoek',
    preferredTypes: ['Job', 'Internship']
  };
  
  // Mock candidate opportunities (from Stage 1 retrieval)
  const candidates = [
    {
      id: '1',
      title: 'Python Developer',
      type: 'Job',
      organization: 'StartupNam',
      location: 'Windhoek',
      description: 'We are looking for a Python developer with experience in web frameworks.',
      score: 0.75 // High cosine similarity
    },
    {
      id: '2',
      title: 'Marketing Assistant',
      type: 'Job',
      organization: 'MarketCo',
      location: 'Windhoek',
      description: 'Help with social media and marketing campaigns.',
      score: 0.45 // Low cosine similarity
    },
    {
      id: '3',
      title: 'Software Engineer Intern',
      type: 'Internship',
      organization: 'TechHub Namibia',
      location: 'Windhoek',
      description: 'Internship opportunity for aspiring software engineers. JavaScript and Python required.',
      score: 0.68
    },
    {
      id: '4',
      title: 'Data Entry Clerk',
      type: 'Job',
      organization: 'DataCorp',
      location: 'Walvis Bay',
      description: 'Basic computer skills required for data entry work.',
      score: 0.35
    },
    {
      id: '5',
      title: 'Full Stack Developer',
      type: 'Job',
      organization: 'WebAgency',
      location: 'Windhoek',
      description: 'Full stack developer needed. React, Node.js, and database experience.',
      score: 0.82
    }
  ];
  
  console.log(`📋 Input: ${candidates.length} candidates`);
  console.log(`🔍 Query: "${userQuery}"`);
  console.log(`👤 Profile: Skills=[${userProfile.skills.join(', ')}], Location=${userProfile.location}\n`);
  
  try {
    const startTime = Date.now();
    
    // Call the reranker with new improvements
    const results = await rerankOpportunities(userQuery, userProfile, candidates, {
      topK: 5,
      minScore: 30
    });
    
    const latency = Date.now() - startTime;
    
    console.log(`✅ Reranking complete in ${latency}ms\n`);
    console.log(`📊 Results (${results.length} opportunities):\n`);
    console.log('─'.repeat(100));
    
    results.forEach((opp, idx) => {
      console.log(`\n${idx + 1}. ${opp.title} (${opp.type})`);
      console.log(`   Organization: ${opp.organization}`);
      console.log(`   Location: ${opp.location}`);
      console.log(`   \n   📈 Scores:`);
      console.log(`      • AI Score:      ${opp.aiScore}/100`);
      console.log(`      • Stage1 Score:  ${opp.stage1Score.toFixed(4)}`);
      console.log(`      • Final Score:   ${opp.finalScore.toFixed(4)}`);
      
      // NEW: Check for aiReasoning field
      if (opp.aiReasoning) {
        console.log(`   \n   💡 AI Reasoning:`);
        console.log(`      "${opp.aiReasoning}"`);
      } else {
        console.log(`   \n   ⚠️  WARNING: Missing aiReasoning field!`);
      }
      
      console.log('\n' + '─'.repeat(100));
    });
    
    // Validation checks
    console.log('\n✅ Validation Checks:\n');
    
    const checks = [
      {
        name: 'All results have aiScore',
        passed: results.every(r => typeof r.aiScore === 'number'),
        message: results.every(r => typeof r.aiScore === 'number') ? 'PASS' : 'FAIL'
      },
      {
        name: 'All results have aiReasoning',
        passed: results.every(r => typeof r.aiReasoning === 'string' && r.aiReasoning.length > 0),
        message: results.every(r => typeof r.aiReasoning === 'string' && r.aiReasoning.length > 0) ? 'PASS' : 'FAIL'
      },
      {
        name: 'All results have finalScore',
        passed: results.every(r => typeof r.finalScore === 'number'),
        message: results.every(r => typeof r.finalScore === 'number') ? 'PASS' : 'FAIL'
      },
      {
        name: 'Results sorted by finalScore (descending)',
        passed: results.every((r, i) => i === 0 || r.finalScore <= results[i - 1].finalScore),
        message: results.every((r, i) => i === 0 || r.finalScore <= results[i - 1].finalScore) ? 'PASS' : 'FAIL'
      },
      {
        name: 'Top result has high AI score (>=70)',
        passed: results.length > 0 && results[0].aiScore >= 70,
        message: results.length > 0 && results[0].aiScore >= 70 ? 'PASS' : 'FAIL - Top result may not be relevant'
      },
      {
        name: 'Dynamic formula applied (finalScore > 1.0 possible)',
        passed: results.some(r => r.finalScore > 1.0),
        message: results.some(r => r.finalScore > 1.0) 
          ? 'PASS - Exponential boost working!' 
          : 'INFO - No scores exceeded 1.0 (might be OK depending on AI scores)'
      }
    ];
    
    checks.forEach(check => {
      const icon = check.passed ? '✅' : '❌';
      console.log(`${icon} ${check.name}: ${check.message}`);
    });
    
    // Calculate average improvement from old formula
    console.log('\n📊 Formula Comparison:\n');
    results.forEach(opp => {
      const oldFormula = (opp.aiScore / 100) * 0.7 + opp.stage1Score * 0.3;
      const improvement = ((opp.finalScore - oldFormula) / oldFormula) * 100;
      
      console.log(`${opp.title}:`);
      console.log(`  Old formula: ${oldFormula.toFixed(4)}`);
      console.log(`  New formula: ${opp.finalScore.toFixed(4)}`);
      console.log(`  Improvement: ${improvement > 0 ? '+' : ''}${improvement.toFixed(1)}%\n`);
    });
    
    const allPassed = checks.filter(c => c.name !== 'Dynamic formula applied').every(c => c.passed);
    
    if (allPassed) {
      console.log('\n🎉 All critical tests passed! RAG improvements working correctly.\n');
    } else {
      console.log('\n⚠️  Some tests failed. Check the output above.\n');
    }
    
  } catch (error) {
    console.error('\n❌ Test failed with error:');
    console.error(error);
    console.log('\nStack trace:');
    console.error(error.stack);
  }
}

// Run the test
if (require.main === module) {
  testRagImprovements()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Unhandled error:', error);
      process.exit(1);
    });
}

module.exports = { testRagImprovements };
