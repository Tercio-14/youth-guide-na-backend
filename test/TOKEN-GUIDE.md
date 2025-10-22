# Visual Guide: Getting Your Firebase Token

## Step-by-Step with Screenshots Guide

### Step 1: Open Your Frontend
```
Open: http://localhost:5173
```
Make sure you're logged in!

### Step 2: Open DevTools
```
Press: F12
Or: Right-click → Inspect
```

### Step 3: Go to Network Tab
```
┌─────────────────────────────────────────────────────┐
│ Elements  Console  Sources  [Network]  Application │
└─────────────────────────────────────────────────────┘
                              ^^^^^^^^
                           Click here!
```

### Step 4: Send a Chat Message
In your chat UI, send ANY message, for example:
```
You: "hello"
```

### Step 5: Find the Request
In the Network tab, look for:
```
┌──────────────────────────────────────────────┐
│ Name          Method  Status  Type           │
├──────────────────────────────────────────────┤
│ chat          POST    200     xhr            │  ← Click this!
│                                              │
└──────────────────────────────────────────────┘
```

### Step 6: Click on Headers Tab
```
┌──────────────────────────────────────────────┐
│ [Headers]  Preview  Response  Timing         │
└──────────────────────────────────────────────┘
   ^^^^^^^^
   Click here!
```

### Step 7: Find Authorization Header
Scroll down in Headers to find:
```
Request Headers:
  Accept: application/json
  Authorization: Bearer eyJhbGciOiJSUzI1NiIsImtpZCI6Ij...
  Content-Type: application/json
```

### Step 8: Copy the Token
Copy ONLY the part after "Bearer " (the long string):
```
❌ DON'T copy: Bearer eyJhbGciOiJSUzI1NiIsImtpZCI6Ij...
✅ DO copy:           eyJhbGciOiJSUzI1NiIsImtpZCI6Ij...
```

The token looks like:
```
eyJhbGciOiJSUzI1NiIsImtpZCI6IjFjYWY4...  (very long)
```

## Quick Copy Method (Chrome/Edge)

1. Find the Authorization header
2. Click on the token value
3. It will be highlighted
4. Press Ctrl+C to copy

## Alternative: Get from Console

Paste this in the Console tab:
```javascript
// For Firebase Auth
firebase.auth().currentUser.getIdToken().then(token => {
  console.log('TOKEN:', token);
  navigator.clipboard.writeText(token);
  console.log('✅ Copied to clipboard!');
});
```

## What the Token Looks Like

Valid Firebase token format (JWT):
```
eyJhbGciOiJSUzI1NiIsImtpZCI6IjFjYWY4...abc123
.eyJpc3MiOiJodHRwczovL3NlY3VyZXRva2...xyz789  
.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV...def456
```

Three parts separated by dots (.)

## Troubleshooting

### ❌ "Token is invalid"
- Make sure you copied the ENTIRE token
- Don't include "Bearer " at the start
- Token should have 3 parts (two dots)

### ❌ "401 Unauthorized"
- Token has expired (they expire after 1 hour)
- Get a fresh token using the steps above

### ❌ "Can't find Authorization header"
- Make sure you're logged in
- Make sure you sent a chat message
- Look in the right request (/api/chat)

## Ready to Test!

Once you have your token, run:
```powershell
./test/run-test.ps1
```

And paste the token when prompted!
