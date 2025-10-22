/**
 * Comprehensive Chatbot Test - REAL DATA PASS
 * ============================================
 * 
 * Tests chatbot with actual production opportunity data
 * to validate real-world performance.
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

async function runRealDataTests() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportPath = path.join(RESULTS_DIR, `real-opportunities-test-${timestamp}.md`);
  
  let report = `# Chatbot Test Report - REAL DATA PASS
  
**Test Date**: ${new Date().toLocaleString()}  
**Environment**: Development  
**Data Source**: Production Opportunities (Real Data)  

---

## Test Summary

`;

  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;
  const allResults = [];

  try {
    await initializeTests();
    
    console.log('\n🧪 Starting Real Data Tests...\n');
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

### Pass Rate by Persona

${generatePersonaStats(allResults)}

`);

    // Add real-world insights
    report += `\n## Real-World Performance Insights\n\n`;
    report += generateRealWorldInsights(allResults);

    // Add recommendations
    report += `\n## Recommendations\n\n`;
    report += generateRecommendations(allResults);

    // Write report
    await fs.writeFile(reportPath, report);
    
    console.log(`\n\n✅ Real Data Tests Complete!`);
    console.log(`📊 Results: ${passedTests}/${totalTests} passed (${passRate}%)`);
    console.log(`📄 Report saved: ${reportPath}\n`);

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    report += `\n## ERROR\n\nTest suite failed with error: ${error.message}\n`;
    await fs.writeFile(reportPath, report);
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

function generatePersonaStats(results) {
  const personas = {};
  
  results.forEach(r => {
    if (!personas[r.persona]) {
      personas[r.persona] = { total: 0, passed: 0 };
    }
    personas[r.persona].total++;
    if (r.analysis.appropriateness.score >= 60) {
      personas[r.persona].passed++;
    }
  });

  let stats = '';
  Object.keys(personas).forEach(persona => {
    const data = personas[persona];
    const rate = ((data.passed / data.total) * 100).toFixed(1);
    stats += `- **${persona}**: ${data.passed}/${data.total} (${rate}%)\n`;
  });

  return stats;
}

function generateRealWorldInsights(results) {
  let insights = '';

  // Analyze opportunity availability
  const resultsWithOpps = results.filter(r => r.result.opportunities && r.result.opportunities.length > 0);
  const avgOpportunities = resultsWithOpps.length > 0 
    ? (resultsWithOpps.reduce((sum, r) => sum + r.result.opportunities.length, 0) / resultsWithOpps.length).toFixed(1)
    : 0;

  insights += `### Opportunity Availability\n\n`;
  insights += `- **Queries with results**: ${resultsWithOpps.length}/${results.length} (${((resultsWithOpps.length/results.length)*100).toFixed(1)}%)\n`;
  insights += `- **Average opportunities per successful query**: ${avgOpportunities}\n\n`;

  // Identify data gaps
  const noResultsPersonas = {};
  results.filter(r => !r.result.opportunities || r.result.opportunities.length === 0).forEach(r => {
    if (!noResultsPersonas[r.persona]) {
      noResultsPersonas[r.persona] = 0;
    }
    noResultsPersonas[r.persona]++;
  });

  if (Object.keys(noResultsPersonas).length > 0) {
    insights += `### Personas with Limited Opportunities\n\n`;
    Object.keys(noResultsPersonas).forEach(persona => {
      const count = noResultsPersonas[persona];
      insights += `- **${persona}**: ${count} queries returned no results\n`;
    });
    insights += `\n⚠️  **Action Required**: These user profiles may not have suitable opportunities in the current database.\n\n`;
  }

  // Performance insights
  const latencies = results.filter(r => r.result.latency).map(r => r.result.latency);
  if (latencies.length > 0) {
    const avgLatency = (latencies.reduce((sum, l) => sum + l, 0) / latencies.length).toFixed(0);
    const maxLatency = Math.max(...latencies);
    
    insights += `### Performance\n\n`;
    insights += `- **Average Response Time**: ${avgLatency}ms\n`;
    insights += `- **Slowest Response**: ${maxLatency}ms\n`;
    
    if (avgLatency > 5000) {
      insights += `- ⚠️  **Warning**: Average response time exceeds 5 seconds\n`;
    }
  }

  return insights;
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

  recs += '\n### Priority Action Items\n\n';
  
  const noResultsCount = issues.filter(i => i.includes('No opportunities')).length;
  if (noResultsCount > 5) {
    recs += `1. **🔴 CRITICAL: Expand Opportunity Database** - ${noResultsCount} queries returned no results. Add more diverse opportunities, especially in:\n`;
    recs += `   - Service sector (cleaning, childcare, domestic work)\n   - Entry-level positions\n   - Rural opportunities\n   - Training programs\n\n`;
  }
  
  if (uniqueIssues.some(i => i.includes("don't match requested type"))) {
    recs += `2. **Improve Filtering Accuracy**: Smart filtering is sometimes returning wrong opportunity types\n\n`;
  }
  
  if (uniqueIssues.includes('Response too long')) {
    recs += `3. **Optimize Response Length**: Keep responses concise (under 500 characters)\n\n`;
  }

  const avgScore = results.reduce((sum, r) => sum + r.analysis.appropriateness.score, 0) / results.length;
  if (avgScore < 70) {
    recs += `4. **Overall Quality**: Average appropriateness score is ${avgScore.toFixed(1)}/100. Target: 80+\n\n`;
  }

  return recs;
}

// Run tests
if (require.main === module) {
  runRealDataTests().catch(console.error);
}

module.exports = { runRealDataTests };
