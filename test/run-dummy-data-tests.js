/**
 * Comprehensive Chatbot Test - DUMMY DATA PASS
 * =============================================
 * 
 * Tests chatbot with controlled dummy opportunity data
 * to ensure it handles various scenarios correctly.
 */

const fs = require('fs').promises;
const path = require('path');
const {
  USER_PERSONAS,
  QUERY_TYPES,
  initializeTests,
  sendChatMessage,
  analyzeResponse,
  delay,
  RESULTS_DIR
} = require('./chatbot-test-framework');

// Swap in dummy data
const DUMMY_DATA_PATH = path.join(__dirname, 'dummy-opportunities.json');
const REAL_DATA_PATH = path.join(__dirname, '../data/opportunities.json');
const BACKUP_PATH = path.join(__dirname, '../data/opportunities.backup.json');

async function swapToDummyData() {
  console.log('📦 Backing up real opportunity data...');
  const realData = await fs.readFile(REAL_DATA_PATH, 'utf8');
  await fs.writeFile(BACKUP_PATH, realData);
  
  console.log('🔄 Loading dummy opportunity data...');
  const dummyData = await fs.readFile(DUMMY_DATA_PATH, 'utf8');
  await fs.writeFile(REAL_DATA_PATH, dummyData);
  
  console.log('✅ Dummy data loaded');
}

async function restoreRealData() {
  console.log('🔙 Restoring real opportunity data...');
  const backupData = await fs.readFile(BACKUP_PATH, 'utf8');
  await fs.writeFile(REAL_DATA_PATH, backupData);
  await fs.unlink(BACKUP_PATH); // Delete backup
  console.log('✅ Real data restored');
}

async function runDummyDataTests() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportPath = path.join(RESULTS_DIR, `dummy-opportunities-test-${timestamp}.md`);
  
  let report = `# Chatbot Test Report - DUMMY DATA PASS
  
**Test Date**: ${new Date().toLocaleString()}  
**Environment**: Development  
**Data Source**: Dummy Opportunities (Controlled Test Data)  

---

## Test Summary

`;

  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;
  const allResults = [];

  try {
    // Initialize
    await initializeTests();
    await swapToDummyData();
    
    console.log('\n🧪 Starting Dummy Data Tests...\n');
    console.log(`Testing ${USER_PERSONAS.length} personas across ${QUERY_TYPES.length} query types`);
    console.log(`Total tests: ${USER_PERSONAS.length * QUERY_TYPES.reduce((sum, qt) => sum + qt.queries.length, 0)}\n`);

    // Test each persona
    for (const persona of USER_PERSONAS) {
      console.log(`\n👤 Testing Persona: ${persona.name}`);
      report += `\n## Persona: ${persona.name}\n\n`;
      report += `**Description**: ${persona.description}\n\n`;
      report += `**Profile**:\n`;
      report += `- Age: ${persona.profile.ageBracket}\n`;
      report += `- Location: ${persona.profile.location}\n`;
      report += `- Education: ${persona.profile.education}\n`;
      report += `- Employment: ${persona.profile.employmentStatus}\n`;
      report += `- Skills: ${persona.profile.skills.join(', ')}\n`;
      report += `- Interests: ${persona.profile.interests.join(', ')}\n\n`;

      // Test each query type
      for (const queryType of QUERY_TYPES) {
        report += `\n### ${queryType.category.replace(/_/g, ' ').toUpperCase()}\n\n`;
        report += `**Expected Behavior**: ${queryType.expected}\n\n`;

        // Test each query in this category
        for (const query of queryType.queries) {
          totalTests++;
          
          // Template the query if needed
          let templatedQuery = query;
          if (query.includes('[skill]')) {
            templatedQuery = query.replace('[skill]', persona.profile.skills[0]);
          }
          if (query.includes('[location]')) {
            templatedQuery = query.replace('[location]', persona.profile.location);
          }

          console.log(`  📤 Testing: "${templatedQuery}"`);
          
          const result = await sendChatMessage(templatedQuery, persona.profile);
          const analysis = analyzeResponse(result, queryType, persona, templatedQuery);

          // Record result
          allResults.push({
            persona: persona.name,
            queryType: queryType.category,
            query: templatedQuery,
            result,
            analysis
          });

          // Determine pass/fail
          const passed = analysis.appropriateness.score >= 60;
          if (passed) {
            passedTests++;
          } else {
            failedTests++;
          }

          // Write to report
          report += `#### Query: "${templatedQuery}"\n\n`;
          report += `**Status**: ${passed ? '✅ PASS' : '❌ FAIL'} (Score: ${analysis.appropriateness.score}/100)\n\n`;
          
          if (result.success) {
            report += `**Response**:\n> ${result.response}\n\n`;
            report += `**Opportunities Returned**: ${result.opportunities.length}\n\n`;
            
            if (result.opportunities.length > 0) {
              report += `**Opportunities**:\n`;
              result.opportunities.forEach((opp, idx) => {
                report += `${idx + 1}. **${opp.title}** (${opp.type}) - ${opp.location}\n`;
              });
              report += `\n`;
            }

            report += `**Analysis**:\n`;
            report += `- Latency: ${result.latency || 'N/A'}ms\n`;
            report += `- Response Length: ${analysis.responseLength} characters\n`;
            
            if (analysis.appropriateness.reasons.length > 0) {
              report += `- ✅ **Strengths**: ${analysis.appropriateness.reasons.join(', ')}\n`;
            }
            
            if (analysis.appropriateness.issues.length > 0) {
              report += `- ⚠️  **Issues**: ${analysis.appropriateness.issues.join(', ')}\n`;
            }
          } else {
            report += `**Error**: ${result.error}\n`;
          }
          
          report += `\n---\n\n`;

          // Delay between tests
          await delay(2000);
        }
      }
    }

    // Summary statistics
    const passRate = ((passedTests / totalTests) * 100).toFixed(1);
    
    report = report.replace('## Test Summary', `## Test Summary

**Total Tests**: ${totalTests}  
**Passed**: ${passedTests} (${passRate}%)  
**Failed**: ${failedTests}  

### Pass Rate by Category

${generateCategoryStats(allResults)}

`);

    // Add recommendations
    report += `\n## Recommendations\n\n`;
    report += generateRecommendations(allResults);

    // Write report
    await fs.writeFile(reportPath, report);
    
    console.log(`\n\n✅ Dummy Data Tests Complete!`);
    console.log(`📊 Results: ${passedTests}/${totalTests} passed (${passRate}%)`);
    console.log(`📄 Report saved: ${reportPath}\n`);

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    report += `\n## ERROR\n\nTest suite failed with error: ${error.message}\n`;
    await fs.writeFile(reportPath, report);
  } finally {
    // Always restore real data
    await restoreRealData();
  }
}

function generateCategoryStats(results) {
  const categories = {};
  
  results.forEach(r => {
    if (!categories[r.queryType]) {
      categories[r.queryType] = { total: 0, passed: 0 };
    }
    categories[r.queryType].total++;
    if (r.analysis.appropriateness.score >= 60) {
      categories[r.queryType].passed++;
    }
  });

  let stats = '';
  Object.keys(categories).forEach(cat => {
    const data = categories[cat];
    const rate = ((data.passed / data.total) * 100).toFixed(1);
    stats += `- **${cat.replace(/_/g, ' ')}**: ${data.passed}/${data.total} (${rate}%)\n`;
  });

  return stats;
}

function generateRecommendations(results) {
  const issues = [];
  const strengths = [];

  results.forEach(r => {
    issues.push(...r.analysis.appropriateness.issues);
    strengths.push(...r.analysis.appropriateness.reasons);
  });

  const uniqueIssues = [...new Set(issues)];
  const uniqueStrengths = [...new Set(strengths)];

  let recs = '### Strengths\n\n';
  uniqueStrengths.slice(0, 5).forEach(s => {
    recs += `- ✅ ${s}\n`;
  });

  recs += '\n### Areas for Improvement\n\n';
  uniqueIssues.slice(0, 5).forEach(i => {
    recs += `- ⚠️  ${i}\n`;
  });

  recs += '\n### Action Items\n\n';
  
  if (uniqueIssues.includes('No opportunities returned for general search')) {
    recs += `1. **Improve TF-IDF retrieval**: Broaden search criteria for general queries\n`;
  }
  
  if (uniqueIssues.some(i => i.includes("don't match requested type"))) {
    recs += `2. **Enhance filtering**: Improve smart filtering to match user intent better\n`;
  }
  
  if (uniqueIssues.includes('Response too long')) {
    recs += `3. **Optimize response length**: Keep responses under 500 characters for better readability\n`;
  }

  return recs;
}

// Run tests
if (require.main === module) {
  runDummyDataTests().catch(console.error);
}

module.exports = { runDummyDataTests };
