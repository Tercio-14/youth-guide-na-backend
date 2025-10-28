/**
 * YouthGuide NA - Browser Console Helper Functions
 * 
 * Copy and paste these functions into your browser console for easy API testing
 * Run them directly from the console without needing Postman
 * 
 * Note: This uses Firebase v9+ modular SDK
 */

// ========================================
// SETUP
// ========================================

const API_BASE = 'http://localhost:3001/api';

// Helper function to get current user's token
async function getToken() {
  // Check if firebaseAuth is exposed on window
  if (!window.firebaseAuth?.currentUser) {
    console.error('❌ Not logged in or Firebase auth not available!');
    console.error('💡 Make sure you are logged into the YouthGuide NA app');
    return null;
  }
  
  // Use Firebase v9+ modular getIdToken
  const { getIdToken } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
  return await getIdToken(window.firebaseAuth.currentUser);
}

// ========================================
// DATA SOURCE FUNCTIONS
// ========================================

/**
 * Check current data source (no auth needed)
 */
async function checkDataSource() {
  try {
    const response = await fetch(`${API_BASE}/config/data-source`);
    const data = await response.json();
    
    console.log('\n' + '='.repeat(50));
    console.log('📊 Current Data Source Status');
    console.log('='.repeat(50));
    console.log(`Source: ${data.dataSource}`);
    console.log(`Path: ${data.path}`);
    console.log(`Description: ${data.description}`);
    console.log('='.repeat(50) + '\n');
    
    return data;
  } catch (error) {
    console.error('❌ Failed to check data source:', error.message);
  }
}

/**
 * Switch to dummy test data
 */
async function useDummyData() {
  const token = await getToken();
  if (!token) return;
  
  try {
    const response = await fetch(`${API_BASE}/config/data-source`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ source: 'dummy' })
    });
    
    const data = await response.json();
    
    if (data.success) {
      if (data.changed) {
        console.log(`✅ Switched from ${data.previousSource} to ${data.currentSource}`);
        console.log(`📁 Now using: ${data.path}`);
      } else {
        console.log(`ℹ️ Already using ${data.currentSource}`);
      }
    } else {
      console.error('❌ Failed:', data.message);
    }
    
    return data;
  } catch (error) {
    console.error('❌ Failed to switch:', error.message);
  }
}

/**
 * Switch to real production data
 */
async function useRealData() {
  const token = await getToken();
  if (!token) return;
  
  try {
    const response = await fetch(`${API_BASE}/config/data-source`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ source: 'opportunities' })
    });
    
    const data = await response.json();
    
    if (data.success) {
      if (data.changed) {
        console.log(`✅ Switched from ${data.previousSource} to ${data.currentSource}`);
        console.log(`📁 Now using: ${data.path}`);
      } else {
        console.log(`ℹ️ Already using ${data.currentSource}`);
      }
    } else {
      console.error('❌ Failed:', data.message);
    }
    
    return data;
  } catch (error) {
    console.error('❌ Failed to switch:', error.message);
  }
}

/**
 * Reset to default data source
 */
async function resetDataSource() {
  const token = await getToken();
  if (!token) return;
  
  try {
    const response = await fetch(`${API_BASE}/config/reset`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    if (data.success) {
      console.log(`🔄 Reset from ${data.previousSource} to ${data.currentSource}`);
    } else {
      console.error('❌ Failed:', data.message);
    }
    
    return data;
  } catch (error) {
    console.error('❌ Failed to reset:', error.message);
  }
}

// ========================================
// TOKEN HELPER
// ========================================

/**
 * Copy your Firebase token to clipboard
 */
async function copyToken() {
  const token = await getToken();
  if (token) {
    navigator.clipboard.writeText(token);
    console.log('✅ Token copied to clipboard!');
    console.log('📋 Use it in Postman collection variables');
    return token;
  }
}

/**
 * Display your Firebase token
 */
async function showToken() {
  const token = await getToken();
  if (token) {
    console.log('🔑 Your Firebase Token:');
    console.log(token);
    console.log('\n💡 To copy to clipboard, run: copyToken()');
    return token;
  }
}

// ========================================
// WORKFLOW HELPERS
// ========================================

/**
 * Complete test workflow
 */
async function testWorkflow() {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 Running Data Source Test Workflow');
  console.log('='.repeat(60) + '\n');
  
  // Step 1: Check current state
  console.log('Step 1: Checking current data source...');
  await checkDataSource();
  await new Promise(r => setTimeout(r, 1000));
  
  // Step 2: Switch to dummy
  console.log('\nStep 2: Switching to dummy data...');
  await useDummyData();
  await new Promise(r => setTimeout(r, 1000));
  
  // Step 3: Verify switch
  console.log('\nStep 3: Verifying switch...');
  await checkDataSource();
  await new Promise(r => setTimeout(r, 1000));
  
  // Step 4: Reset to real
  console.log('\nStep 4: Resetting to real data...');
  await resetDataSource();
  await new Promise(r => setTimeout(r, 1000));
  
  // Step 5: Final verification
  console.log('\nStep 5: Final verification...');
  await checkDataSource();
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ Test workflow complete!');
  console.log('='.repeat(60) + '\n');
}

// ========================================
// HELP
// ========================================

/**
 * Show available commands
 */
function help() {
  console.log('\n' + '='.repeat(60));
  console.log('🎯 YouthGuide NA Console Helper Functions');
  console.log('='.repeat(60));
  console.log('\n📊 Data Source Management:');
  console.log('  checkDataSource()    - Check current data source');
  console.log('  useDummyData()       - Switch to dummy test data');
  console.log('  useRealData()        - Switch to real production data');
  console.log('  resetDataSource()    - Reset to default (real data)');
  console.log('\n🔑 Token Management:');
  console.log('  copyToken()          - Copy Firebase token to clipboard');
  console.log('  showToken()          - Display Firebase token');
  console.log('\n🧪 Testing:');
  console.log('  testWorkflow()       - Run complete test workflow');
  console.log('\n📖 Help:');
  console.log('  help()               - Show this help message');
  console.log('\n' + '='.repeat(60));
  console.log('💡 Quick Start:');
  console.log('  1. checkDataSource()  - See what\'s active');
  console.log('  2. useDummyData()     - Switch to test data');
  console.log('  3. useRealData()      - Switch back');
  console.log('='.repeat(60) + '\n');
}

// ========================================
// AUTO-LOAD MESSAGE
// ========================================

console.log('\n✨ YouthGuide NA Console Helpers Loaded!');
console.log('💡 Type help() to see available commands\n');

// ========================================
// EXAMPLE USAGE
// ========================================

/*

// Check current data source
await checkDataSource();

// Switch to dummy data for testing
await useDummyData();

// Test your chatbot (it will use dummy data now)
// ... your tests ...

// Switch back to real data
await useRealData();

// Or reset to default
await resetDataSource();

// Copy token for Postman
await copyToken();

// Run full test workflow
await testWorkflow();

*/
