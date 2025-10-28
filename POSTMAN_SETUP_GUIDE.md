# Postman Setup Guide for YouthGuide NA API

## Quick Setup

### Step 1: Create a New Collection

1. Open Postman
2. Click **"New"** → **"Collection"**
3. Name it: **"YouthGuide NA API"**
4. Click **"Create"**

### Step 2: Set Up Collection Variables

1. Click on your collection → **"Variables"** tab
2. Add these variables:

| Variable | Type | Initial Value | Current Value |
|----------|------|---------------|---------------|
| `base_url` | default | `http://localhost:3001/api` | `http://localhost:3001/api` |
| `firebase_token` | secret | (leave empty) | (leave empty) |

3. Click **"Save"**

### Step 3: Get Your Firebase Auth Token

**Option A: From Browser Console (Easiest)**

1. Open your YouthGuide NA app in browser
2. Log in to your account
3. Open Developer Tools (F12)
4. Go to **Console** tab
5. Run this command:
```javascript
(async function() {
  if (!window.firebaseAuth?.currentUser) {
    console.error('❌ Not logged in! Please log in first.');
    return;
  }
  const token = await window.firebaseAuth.currentUser.getIdToken();
  try {
    await navigator.clipboard.writeText(token);
    console.log('✅ Token copied to clipboard!');
  } catch (e) {
    console.log('📋 Copy manually (triple-click to select):');
    console.log(token);
  }
  console.log('👤 User:', window.firebaseAuth.currentUser.email);
})();
```
6. The token is either auto-copied or displayed below
7. If displayed, **triple-click the token** to select all, then Ctrl+C
8. Go to Postman → Your Collection → Variables
9. Paste the token into **`firebase_token`** (both Initial and Current Value)
10. Click **"Save"**

**Option B: From Network Tab**

1. Open your app in browser (logged in)
2. Open Developer Tools → **Network** tab
3. Make any authenticated request (e.g., save an opportunity)
4. Find the request in the Network tab
5. Click on it → **Headers** tab
6. Find **"Authorization: Bearer ..."**
7. Copy everything after "Bearer "
8. Paste into Postman collection variable `firebase_token`

**Option C: Manual Token Refresh Script**

Create a request to get token programmatically (see Advanced section below)

---

## Create API Requests

### 1. Check Current Data Source (No Auth)

**Request Name:** `Get Data Source Status`

- **Method:** `GET`
- **URL:** `{{base_url}}/config/data-source`
- **Headers:** (none needed)
- **Body:** (none)

**Save the request** to your collection.

---

### 2. Switch to Dummy Data (Requires Auth)

**Request Name:** `Switch to Dummy Data`

- **Method:** `POST`
- **URL:** `{{base_url}}/config/data-source`
- **Headers:**
  - Key: `Authorization`
  - Value: `Bearer {{firebase_token}}`
  - Key: `Content-Type`
  - Value: `application/json`
- **Body:** (select **raw** and **JSON**)
```json
{
  "source": "dummy"
}
```

**Save the request** to your collection.

---

### 3. Switch to Real Data (Requires Auth)

**Request Name:** `Switch to Real Data`

- **Method:** `POST`
- **URL:** `{{base_url}}/config/data-source`
- **Headers:**
  - Key: `Authorization`
  - Value: `Bearer {{firebase_token}}`
  - Key: `Content-Type`
  - Value: `application/json`
- **Body:** (select **raw** and **JSON**)
```json
{
  "source": "opportunities"
}
```

**Save the request** to your collection.

---

### 4. Reset to Default Data Source (Requires Auth)

**Request Name:** `Reset Data Source`

- **Method:** `POST`
- **URL:** `{{base_url}}/config/reset`
- **Headers:**
  - Key: `Authorization`
  - Value: `Bearer {{firebase_token}}`
  - Key: `Content-Type`
  - Value: `application/json`
- **Body:** (none)

**Save the request** to your collection.

---

## Quick Reference Images

### Adding Authorization Header

```
Headers tab:
┌────────────────┬─────────────────────────────────────┐
│ Key            │ Value                               │
├────────────────┼─────────────────────────────────────┤
│ Authorization  │ Bearer {{firebase_token}}           │
│ Content-Type   │ application/json                    │
└────────────────┴─────────────────────────────────────┘
```

### JSON Body Format

```json
{
  "source": "dummy"
}
```

or

```json
{
  "source": "opportunities"
}
```

---

## Token Management

### When to Update Token

Firebase tokens expire after **1 hour**. Update when you get:

```json
{
  "success": false,
  "error": "Unauthorized",
  "message": "Invalid or expired token"
}
```

### Quick Token Refresh

1. Go to browser console
2. Run: `(async () => { const t = await window.firebaseAuth.currentUser.getIdToken(true); await navigator.clipboard.writeText(t); console.log('✅ Token refreshed and copied!'); })();`
3. Update `firebase_token` in Postman collection variables
4. Save collection

---

## Folder Organization (Optional)

Create folders in your collection for better organization:

```
📁 YouthGuide NA API
  📁 Config
    ├─ Get Data Source Status
    ├─ Switch to Dummy Data
    ├─ Switch to Real Data
    └─ Reset Data Source
  📁 Chat
  📁 Opportunities
  📁 Feedback
  📁 Auth
```

---

## Testing Workflow in Postman

### Standard Test Flow

1. **Get Data Source Status**
   - Click "Send"
   - Should show `"dataSource": "opportunities"`

2. **Switch to Dummy Data**
   - Click "Send"
   - Should show `"currentSource": "dummy"`, `"changed": true`

3. **Verify Switch**
   - Run "Get Data Source Status" again
   - Should now show `"dataSource": "dummy"`

4. **Test Chatbot** (optional)
   - Make chat requests - they'll use dummy data

5. **Reset to Real Data**
   - Click "Send" on "Reset Data Source"
   - Or use "Switch to Real Data"

6. **Verify Reset**
   - Run "Get Data Source Status"
   - Should show `"dataSource": "opportunities"`

---

## Advanced: Collection-Level Authorization

Set authorization at collection level so you don't need to add it to each request:

1. Click on collection → **"Authorization"** tab
2. Type: **"Bearer Token"**
3. Token: `{{firebase_token}}`
4. Click **"Save"**

5. For each authenticated request:
   - Go to **"Authorization"** tab
   - Select **"Inherit auth from parent"**

6. For public requests (like Get Data Source Status):
   - Select **"No Auth"**

---

## Advanced: Pre-request Script for Token Validation

Add to collection Pre-request Script to warn about expired tokens:

```javascript
// Check if token exists
if (!pm.collectionVariables.get("firebase_token")) {
    console.warn("⚠️ No Firebase token set! Set it in collection variables.");
}

// Optional: Add timestamp check if you track token creation time
const tokenTime = pm.collectionVariables.get("token_timestamp");
if (tokenTime) {
    const elapsed = Date.now() - tokenTime;
    const hours = elapsed / (1000 * 60 * 60);
    if (hours > 0.9) { // Warn at 54 minutes
        console.warn("⚠️ Token is nearly expired! Refresh it soon.");
    }
}
```

---

## Advanced: Test Scripts

Add these to the **Tests** tab of each request for automatic validation:

### Get Data Source Status
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Response has dataSource field", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData).to.have.property('dataSource');
});

pm.test("Response has valid source", function () {
    const jsonData = pm.response.json();
    pm.expect(['opportunities', 'dummy']).to.include(jsonData.dataSource);
});

// Log current source
const jsonData = pm.response.json();
console.log(`📊 Current Data Source: ${jsonData.dataSource}`);
console.log(`📁 Path: ${jsonData.path}`);
```

### Switch Data Source
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Response indicates success", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.success).to.be.true;
});

pm.test("Source was changed", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData).to.have.property('currentSource');
});

// Log the switch
const jsonData = pm.response.json();
console.log(`✅ Switched from ${jsonData.previousSource} to ${jsonData.currentSource}`);
```

---

## Troubleshooting

### Issue: "Could not get any response"

**Solution:**
- Make sure backend server is running: `npm run dev`
- Check `base_url` is correct: `http://localhost:3001/api`

### Issue: 401 Unauthorized

**Solutions:**
1. Token expired (refresh it)
2. Token not set in collection variables
3. Authorization header format wrong (should be `Bearer {{firebase_token}}`)
4. Not logged into Firebase in browser

### Issue: "firebase is not defined"

**Solution:**
- Your app uses Firebase v9+ modular SDK
- Use this command instead:
```javascript
(async () => { 
  const token = await window.firebaseAuth.currentUser.getIdToken(); 
  await navigator.clipboard.writeText(token); 
  console.log('✅ Copied!'); 
})();
```

### Issue: 400 Bad Request

**Solution:**
- Check JSON body is valid
- Make sure `source` is either `"dummy"` or `"opportunities"` (with quotes)
- Content-Type header is `application/json`

---

## Export/Import Collection

### Export for Sharing

1. Right-click collection → **"Export"**
2. Choose **"Collection v2.1"**
3. Save as `YouthGuide-NA-API.postman_collection.json`
4. Share with team

### Import Collection

1. Click **"Import"**
2. Drag JSON file or click to browse
3. Collection appears in sidebar

---

## Environment Setup (Alternative to Collection Variables)

If you want to switch between dev/staging/prod:

1. Click **"Environments"** (eye icon)
2. Click **"Add"**
3. Name: **"Development"**
4. Variables:
   - `base_url`: `http://localhost:3001/api`
   - `firebase_token`: (your token)
5. Click **"Add"**
6. Select "Development" from dropdown

Create additional environments for staging/production with different URLs.

---

## Sample Responses

### Successful Data Source Check
```json
{
  "success": true,
  "dataSource": "opportunities",
  "path": "data/opportunities.json",
  "description": "Using real scraped opportunities data",
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

### Successful Switch
```json
{
  "success": true,
  "message": "Switched to dummy data",
  "previousSource": "opportunities",
  "currentSource": "dummy",
  "changed": true,
  "path": "test/dummy-opportunities.json",
  "note": "Cache will be cleared on next opportunity request",
  "timestamp": "2025-01-15T10:35:00.000Z"
}
```

### Already Using Source
```json
{
  "success": true,
  "message": "Already using dummy data",
  "dataSource": "dummy",
  "changed": false
}
```

---

## Quick Setup Checklist

- [ ] Create collection "YouthGuide NA API"
- [ ] Add collection variables (`base_url`, `firebase_token`)
- [ ] Get Firebase token from browser console
- [ ] Paste token into collection variables
- [ ] Create "Get Data Source Status" request (GET, no auth)
- [ ] Create "Switch to Dummy Data" request (POST, with auth)
- [ ] Create "Switch to Real Data" request (POST, with auth)
- [ ] Create "Reset Data Source" request (POST, with auth)
- [ ] Test each endpoint
- [ ] Save collection

**That's it!** You can now switch data sources anytime with one click. 🚀

---

## Bonus: Runner for Automated Testing

1. Click collection → **"Run"**
2. Select requests to run in sequence
3. Set iterations (e.g., 1)
4. Click **"Run YouthGuide NA API"**

Useful for testing the full workflow:
1. Get status
2. Switch to dummy
3. Get status (verify)
4. Reset to real
5. Get status (verify)

---

## Tips

- 💡 **Keyboard Shortcut:** `Ctrl + Enter` (Windows) or `Cmd + Enter` (Mac) to send request
- 💡 **Duplicate Request:** Right-click request → Duplicate → Modify for variations
- 💡 **History:** View past requests in sidebar **"History"** tab
- 💡 **Console:** View detailed logs in bottom **"Console"** panel (`Ctrl + Alt + C`)
- 💡 **Save Responses:** Click "Save Response" to keep examples for documentation

---

## Next Steps

After setting up config endpoints, add these common endpoints:

- `POST /api/chat` - Send chat messages
- `GET /api/opportunities` - List opportunities
- `POST /api/feedback` - Submit feedback
- `GET /api/users/profile` - Get user profile

Use the same pattern: Collection variables for auth, inherit authorization, add test scripts!
