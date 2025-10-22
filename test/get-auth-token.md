# How to Get Firebase Auth Token for Testing

## Quick Method (Browser DevTools)

### Step 1: Open Frontend & Login
1. Open your frontend: http://localhost:5173
2. Log in with your account
3. Open Browser DevTools (F12)

### Step 2: Get Token from Console
Paste this code in the Console tab:

```javascript
// Get Firebase auth token
firebase.auth().currentUser.getIdToken().then(token => {
  console.log('='.repeat(60));
  console.log('YOUR FIREBASE TOKEN:');
  console.log('='.repeat(60));
  console.log(token);
  console.log('='.repeat(60));
  console.log('\nCopy the token above and use it to run the test:');
  console.log('SET FIREBASE_TOKEN=' + token + ' && node test/test-smart-filtering.js');
  
  // Also copy to clipboard
  navigator.clipboard.writeText(token).then(() => {
    console.log('\n✅ Token copied to clipboard!');
  });
});
```

### Step 3: Copy Token
The token will be:
- Printed in console
- Automatically copied to clipboard

### Step 4: Run Test
```bash
# Windows PowerShell
$env:FIREBASE_TOKEN="<paste-token-here>"
node test/test-smart-filtering.js

# Or one-liner:
$env:FIREBASE_TOKEN="<paste-token-here>"; node test/test-smart-filtering.js
```

## Alternative: Get Token from Application Tab

1. Open DevTools (F12)
2. Go to **Application** tab
3. Click **Local Storage** → Your domain
4. Look for key containing "firebase" or "auth"
5. Copy the token value

## Alternative: Get Token from Network Tab

1. Open DevTools (F12)
2. Go to **Network** tab
3. Send a chat message
4. Find the request to `/api/chat`
5. Click on it → **Headers** tab
6. Look for `Authorization: Bearer <token>`
7. Copy everything after "Bearer "

## Token Expires After 1 Hour

If you get authentication errors, get a fresh token using the steps above.
