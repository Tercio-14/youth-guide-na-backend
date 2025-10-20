#!/usr/bin/env node

/**
 * Test Runner for YouthGuide NA Backend
 * 
 * Runs comprehensive tests and generates detailed reports
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🧪 YouthGuide NA Backend Test Suite');
console.log('=====================================\n');

// Check if .env file exists
const envPath = path.join(__dirname, '..', '.env');
if (!fs.existsSync(envPath)) {
  console.log('⚠️  Warning: .env file not found');
  console.log('   Some tests may fail without proper environment configuration\n');
}

// Check for test auth token
const envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf-8') : '';
const hasTestToken = envContent.includes('TEST_AUTH_TOKEN');

if (!hasTestToken) {
  console.log('⚠️  Warning: TEST_AUTH_TOKEN not found in .env');
  console.log('   Integration tests requiring authentication will be skipped');
  console.log('   To run full tests, add TEST_AUTH_TOKEN to your .env file\n');
}

// Run tests
console.log('Running tests...\n');

try {
  // Run all tests with verbose output
  execSync('npm test -- --verbose --coverage', {
    stdio: 'inherit',
    cwd: path.join(__dirname, '..')
  });
  
  console.log('\n✅ All tests passed!\n');
  process.exit(0);
} catch (error) {
  console.log('\n❌ Some tests failed\n');
  console.log('Check the output above for details');
  console.log('Common issues:');
  console.log('  - Missing TEST_AUTH_TOKEN in .env');
  console.log('  - Backend server not running');
  console.log('  - Firebase credentials not configured');
  console.log('  - OpenRouter API key not set\n');
  
  process.exit(1);
}
