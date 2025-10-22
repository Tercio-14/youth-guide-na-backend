/**
 * Master Test Orchestrator
 * =========================
 * 
 * Runs comprehensive chatbot tests in two passes:
 * 1. DUMMY DATA PASS - Controlled test with custom opportunities
 * 2. REAL DATA PASS - Production data test
 * 
 * Generates combined analysis report comparing both passes.
 */

const fs = require('fs').promises;
const path = require('path');
const { runDummyDataTests } = require('./run-dummy-data-tests');
const { runRealDataTests } = require('./run-real-data-tests');
const { RESULTS_DIR } = require('./chatbot-test-framework');

async function runAllTests() {
  const startTime = Date.now();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const summaryPath = path.join(RESULTS_DIR, `comprehensive-test-summary-${timestamp}.md`);

  console.log('═══════════════════════════════════════════════════════════');
  console.log('    🧪 COMPREHENSIVE CHATBOT TEST SUITE');
  console.log('═══════════════════════════════════════════════════════════\n');

  let summary = `# Comprehensive Chatbot Test Summary

**Test Date**: ${new Date().toLocaleString()}  
**Environment**: Development  

---

`;

  try {
    // PASS 1: DUMMY DATA
    console.log('📋 PASS 1: DUMMY DATA TESTS');
    console.log('─────────────────────────────────────────────────────────\n');
    console.log('This pass validates chatbot logic with controlled test data\n');
    
    const dummyStartTime = Date.now();
    await runDummyDataTests();
    const dummyDuration = Date.now() - dummyStartTime;
    
    console.log(`\n⏱️  Dummy data pass completed in ${(dummyDuration / 1000).toFixed(1)}s\n`);
    
    // Delay between passes
    console.log('⏳ Waiting 5 seconds before next pass...\n');
    await delay(5000);

    // PASS 2: REAL DATA
    console.log('\n📋 PASS 2: REAL DATA TESTS');
    console.log('─────────────────────────────────────────────────────────\n');
    console.log('This pass validates chatbot with production opportunity data\n');
    
    const realStartTime = Date.now();
    await runRealDataTests();
    const realDuration = Date.now() - realStartTime;
    
    console.log(`\n⏱️  Real data pass completed in ${(realDuration / 1000).toFixed(1)}s\n`);

    // Generate combined summary
    const totalDuration = Date.now() - startTime;
    
    summary += `## Test Execution Summary\n\n`;
    summary += `**Total Duration**: ${(totalDuration / 1000 / 60).toFixed(1)} minutes\n\n`;
    summary += `### Pass 1: Dummy Data\n`;
    summary += `- **Duration**: ${(dummyDuration / 1000).toFixed(1)}s\n`;
    summary += `- **Purpose**: Validate chatbot logic with controlled test opportunities\n`;
    summary += `- **Data**: 20 custom opportunities covering all sectors\n\n`;
    summary += `### Pass 2: Real Data\n`;
    summary += `- **Duration**: ${(realDuration / 1000).toFixed(1)}s\n`;
    summary += `- **Purpose**: Validate real-world performance with production data\n`;
    summary += `- **Data**: Current opportunities.json from production\n\n`;

    // Find and analyze the latest test reports
    const files = await fs.readdir(RESULTS_DIR);
    const latestDummyReport = files
      .filter(f => f.startsWith('dummy-opportunities-test-'))
      .sort()
      .pop();
    const latestRealReport = files
      .filter(f => f.startsWith('real-opportunities-test-'))
      .sort()
      .pop();

    summary += `---\n\n## Detailed Reports\n\n`;
    summary += `📄 **Dummy Data Report**: \`${latestDummyReport}\`\n\n`;
    summary += `📄 **Real Data Report**: \`${latestRealReport}\`\n\n`;

    // Extract key metrics if possible
    if (latestDummyReport && latestRealReport) {
      summary += `---\n\n## Comparative Analysis\n\n`;
      
      try {
        const dummyContent = await fs.readFile(path.join(RESULTS_DIR, latestDummyReport), 'utf8');
        const realContent = await fs.readFile(path.join(RESULTS_DIR, latestRealReport), 'utf8');

        // Extract pass rates
        const dummyPassRate = extractPassRate(dummyContent);
        const realPassRate = extractPassRate(realContent);

        summary += `### Pass Rate Comparison\n\n`;
        summary += `| Test Pass | Pass Rate | Status |\n`;
        summary += `|-----------|-----------|--------|\n`;
        summary += `| Dummy Data | ${dummyPassRate}% | ${dummyPassRate >= 70 ? '✅ Good' : dummyPassRate >= 60 ? '⚠️  Acceptable' : '❌ Needs Improvement'} |\n`;
        summary += `| Real Data | ${realPassRate}% | ${realPassRate >= 70 ? '✅ Good' : realPassRate >= 60 ? '⚠️  Acceptable' : '❌ Needs Improvement'} |\n\n`;

        // Analysis
        summary += `### Key Findings\n\n`;
        
        const difference = Math.abs(dummyPassRate - realPassRate);
        if (difference > 20) {
          summary += `⚠️  **Significant Performance Gap**: ${difference.toFixed(1)}% difference between dummy and real data\n\n`;
          
          if (dummyPassRate > realPassRate) {
            summary += `The chatbot logic performs well with ideal data but struggles with real opportunities. This suggests:\n`;
            summary += `- **Data Quality Issues**: Real opportunities may be poorly structured or incomplete\n`;
            summary += `- **Data Coverage Gaps**: Missing opportunities for certain user profiles\n`;
            summary += `- **Recommendation**: Expand and improve the opportunity database\n\n`;
          } else {
            summary += `The chatbot performs better with real data than test data. This suggests:\n`;
            summary += `- **Test Data Issues**: Dummy data may not reflect real-world scenarios well\n`;
            summary += `- **Recommendation**: Review and improve test opportunity design\n\n`;
          }
        } else {
          summary += `✅ **Consistent Performance**: Similar results across both data sets (${difference.toFixed(1)}% difference)\n\n`;
        }

        if (realPassRate < 60) {
          summary += `🔴 **Critical**: Real data pass rate below 60% - immediate action required\n\n`;
        } else if (realPassRate < 70) {
          summary += `⚠️  **Warning**: Real data pass rate below 70% - improvements recommended\n\n`;
        } else {
          summary += `✅ **Success**: Real data pass rate meets quality standards\n\n`;
        }

      } catch (error) {
        summary += `*Could not extract detailed metrics: ${error.message}*\n\n`;
      }
    }

    summary += `---\n\n## Next Steps\n\n`;
    summary += `1. Review detailed reports in the \`test-results/\` directory\n`;
    summary += `2. Identify patterns in failed tests\n`;
    summary += `3. Prioritize fixes based on recommendations\n`;
    summary += `4. If real data pass rate < 70%, consider:\n`;
    summary += `   - Adding more diverse opportunities to the database\n`;
    summary += `   - Improving opportunity descriptions and metadata\n`;
    summary += `   - Enhancing the RAG pipeline's matching algorithms\n`;
    summary += `5. Re-run tests after implementing fixes\n\n`;

    summary += `---\n\n## Test Configuration\n\n`;
    summary += `- **Personas Tested**: 8 (Skilled Worker, IT Graduate, School Leaver, Rural Youth, Hospitality Professional, Dropout, Career Changer, Student)\n`;
    summary += `- **Query Categories**: 6 (General Search, Specific Type, Skill-Based, Location-Based, Casual Conversation, Off-Topic)\n`;
    summary += `- **Total Tests per Pass**: ~192 queries\n`;
    summary += `- **Pass Threshold**: 60% appropriateness score\n`;
    summary += `- **API Endpoint**: http://localhost:3000/api/chat\n\n`;

    // Write summary
    await fs.writeFile(summaryPath, summary);

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('    ✅ ALL TESTS COMPLETE!');
    console.log('═══════════════════════════════════════════════════════════\n');
    console.log(`⏱️  Total Time: ${(totalDuration / 1000 / 60).toFixed(1)} minutes\n`);
    console.log(`📊 Summary Report: ${summaryPath}\n`);
    console.log(`📁 All reports saved in: ${RESULTS_DIR}\n`);
    console.log('Next: Review the reports and implement recommended improvements\n');

  } catch (error) {
    console.error('\n❌ Test suite failed:', error);
    summary += `\n## ERROR\n\nTest suite failed with error: ${error.message}\n\n`;
    summary += `\`\`\`\n${error.stack}\n\`\`\`\n`;
    await fs.writeFile(summaryPath, summary);
  }
}

function extractPassRate(reportContent) {
  // Try to extract pass rate from "Passed: X (Y%)" pattern
  const match = reportContent.match(/\*\*Passed\*\*:\s*\d+\s*\((\d+\.?\d*)%\)/);
  if (match) {
    return parseFloat(match[1]);
  }
  return 0;
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Run all tests
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = { runAllTests };
