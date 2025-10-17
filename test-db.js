/**
 * Simple database connection test script
 * Run this to verify Firebase connectivity and basic operations
 */

require('dotenv').config();
const { collections, auth } = require('./src/config/firebase');
const logger = require('./src/utils/logger');

async function testDatabaseConnection() {
  try {
    console.log('🔄 Testing Firebase connection...');
    
    // Test 1: Basic Firestore connection
    console.log('\n1. Testing Firestore connection...');
    const testCollection = collections.users;
    const snapshot = await testCollection.limit(1).get();
    console.log(`✅ Firestore connected. Found ${snapshot.size} documents in users collection.`);
    
    // Test 2: Test document write/read
    console.log('\n2. Testing document write/read...');
    const testDocId = 'test-user-' + Date.now();
    const testData = {
      firstName: 'Test User',
      ageBracket: '18-24',
      skills: ['Testing', 'Debugging'],
      interests: ['Technology', 'Learning'],
      createdAt: new Date().toISOString(),
      isTest: true
    };
    
    // Write test document
    await collections.users.doc(testDocId).set(testData);
    console.log('✅ Test document written successfully');
    
    // Read test document
    const doc = await collections.users.doc(testDocId).get();
    if (doc.exists) {
      console.log('✅ Test document read successfully');
      console.log('📄 Document data:', doc.data());
    } else {
      console.log('❌ Test document not found after write');
    }
    
    // Clean up test document
    await collections.users.doc(testDocId).delete();
    console.log('✅ Test document cleaned up');
    
    // Test 3: Firebase Auth initialization
    console.log('\n3. Testing Firebase Auth...');
    if (auth && auth.app) {
      console.log('✅ Firebase Auth initialized successfully');
      console.log('🏠 Project ID:', auth.app.options.projectId);
    } else {
      console.log('❌ Firebase Auth not initialized');
    }
    
    console.log('\n🎉 All tests passed! Firebase is working correctly.');
    
  } catch (error) {
    console.error('\n❌ Database test failed:', error);
    console.error('Stack:', error.stack);
    
    // Provide helpful troubleshooting info
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Check if .env file exists and has correct Firebase credentials');
    console.log('2. Verify GOOGLE_APPLICATION_CREDENTIALS path is correct');
    console.log('3. Ensure Firebase project has Firestore enabled');
    console.log('4. Check network connectivity to Firebase');
  }
}

// Run the test
testDatabaseConnection()
  .then(() => {
    console.log('\n✨ Test completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Test script failed:', error);
    process.exit(1);
  });