/**
 * ⚡ QUICK TOKEN GETTER - Copy/Paste into Browser Console
 * 
 * This script works with Firebase v9+ modular SDK
 * Just copy and paste this into your browser console while logged into YouthGuide NA
 */

// Simple token getter - works immediately
(async function getFirebaseToken() {
  try {
    // Check if auth is available
    if (!window.firebaseAuth) {
      console.error('❌ Firebase auth not found!');
      console.error('💡 Make sure you are on the YouthGuide NA app (http://localhost:5173)');
      console.error('💡 Refresh the page and wait for it to fully load, then try again');
      return;
    }

    // Check if user is logged in
    if (!window.firebaseAuth.currentUser) {
      console.error('❌ No user logged in!');
      console.error('💡 Please log in first, then run this command again');
      return;
    }

    console.log('🔄 Getting token...');
    
    // Get token using Firebase v9+ method
    const token = await window.firebaseAuth.currentUser.getIdToken();
    
    if (token) {
      // Copy to clipboard
      await navigator.clipboard.writeText(token);
      
      console.log('✅ Token copied to clipboard!');
      console.log('📋 Token length:', token.length, 'characters');
      console.log('👤 User:', window.firebaseAuth.currentUser.email);
      console.log('\n💡 Paste this token into Postman collection variables as "firebase_token"');
      console.log('💡 Token expires in 1 hour\n');
      
      // Show first and last few characters for verification
      console.log('🔑 Token preview:', token.substring(0, 20) + '...' + token.substring(token.length - 20));
      
      return token;
    }
  } catch (error) {
    console.error('❌ Error getting token:', error.message);
    console.error('💡 Try refreshing the page and logging in again');
  }
})();
