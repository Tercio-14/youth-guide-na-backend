/**
 * Test Results Cleanup Utility
 * ============================
 * 
 * Removes old test result files, keeping only the most recent ones.
 * Useful for managing test-results directory size.
 */

const fs = require('fs').promises;
const path = require('path');

const RESULTS_DIR = path.join(__dirname, 'test-results');

async function cleanupOldResults(keepCount = 5) {
  try {
    // Ensure results directory exists
    await fs.mkdir(RESULTS_DIR, { recursive: true });

    // Get all files
    const files = await fs.readdir(RESULTS_DIR);

    // Group files by type
    const fileTypes = {
      dummy: files.filter(f => f.startsWith('dummy-opportunities-test-')).sort().reverse(),
      real: files.filter(f => f.startsWith('real-opportunities-test-')).sort().reverse(),
      summary: files.filter(f => f.startsWith('comprehensive-test-summary-')).sort().reverse()
    };

    console.log('\n📁 Test Results Cleanup\n');
    console.log('Current files:');
    console.log(`  Dummy data reports: ${fileTypes.dummy.length}`);
    console.log(`  Real data reports: ${fileTypes.real.length}`);
    console.log(`  Summary reports: ${fileTypes.summary.length}`);
    console.log(`\nKeeping ${keepCount} most recent of each type...\n`);

    let deletedCount = 0;

    // Clean up each type
    for (const [type, fileList] of Object.entries(fileTypes)) {
      if (fileList.length > keepCount) {
        const toDelete = fileList.slice(keepCount);
        
        for (const file of toDelete) {
          const filePath = path.join(RESULTS_DIR, file);
          await fs.unlink(filePath);
          console.log(`  ✅ Deleted: ${file}`);
          deletedCount++;
        }
      }
    }

    if (deletedCount === 0) {
      console.log('  ℹ️  No old files to delete\n');
    } else {
      console.log(`\n✅ Cleanup complete! Deleted ${deletedCount} old report(s)\n`);
    }

    // Show remaining files
    const remainingFiles = await fs.readdir(RESULTS_DIR);
    console.log(`Remaining files: ${remainingFiles.length}`);
    if (remainingFiles.length > 0) {
      console.log('\nMost recent reports:');
      fileTypes.dummy.slice(0, 1).forEach(f => console.log(`  📄 ${f}`));
      fileTypes.real.slice(0, 1).forEach(f => console.log(`  📄 ${f}`));
      fileTypes.summary.slice(0, 1).forEach(f => console.log(`  📄 ${f}`));
    }
    console.log('');

  } catch (error) {
    console.error('❌ Cleanup failed:', error);
  }
}

// Parse command line argument for keep count
const args = process.argv.slice(2);
const keepCount = args[0] ? parseInt(args[0], 10) : 5;

if (isNaN(keepCount) || keepCount < 1) {
  console.error('❌ Invalid keep count. Usage: node cleanup-test-results.js [keepCount]');
  console.error('   Example: node cleanup-test-results.js 3');
  process.exit(1);
}

cleanupOldResults(keepCount);
