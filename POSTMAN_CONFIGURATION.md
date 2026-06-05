# Postman Configuration Guide - Offline Mode Control API

## Quick Fix for Your Issue

Your error shows Postman sent an **empty body**. Here's how to fix it:

### Step-by-Step Postman Setup

#### 1. Open Your Request in Postman

#### 2. Configure the Request
- **Method**: `POST`
- **URL**: `http://localhost:3001/api/offline/mode/toggle`

#### 3. Set Headers
Click on the **Headers** tab and add:
```
Key: Content-Type
Value: application/json
```

#### 4. Set Body (THIS IS THE IMPORTANT PART)
1. Click on the **Body** tab
2. Select the **raw** radio button (not form-data, not x-www-form-urlencoded)
3. From the dropdown on the right, select **JSON** (not Text!)
4. Enter the JSON body:
   ```json
   {
     "autoDetection": false
   }
   ```

#### 5. Send the Request

You should see:
```json
{
  "success": true,
  "message": "Automatic offline detection disabled",
  "settings": {
    "autoDetection": false,
    "manualOverride": false,
    "lastUpdated": "2025-10-28T..."
  }
}
```

---

## Common Mistakes

### ❌ Mistake 1: Using "Text" instead of "JSON"
If you select "Text" from the dropdown, Postman won't set the `Content-Type` header correctly.

**Fix:** Select **JSON** from the dropdown (right side of the body text area)

### ❌ Mistake 2: Not selecting "raw"
If you select "form-data" or "x-www-form-urlencoded", the JSON won't be sent correctly.

**Fix:** Select the **raw** radio button

### ❌ Mistake 3: Missing Content-Type header
Even with "raw" + "JSON", sometimes Postman doesn't auto-add the header.

**Fix:** Manually add `Content-Type: application/json` in the Headers tab

### ❌ Mistake 4: Typo in JSON
JSON is case-sensitive and strict about syntax.

**Fix:** Copy-paste the exact JSON from this guide

---

## Import Postman Collection (Easiest Method)

I've created a ready-to-use Postman collection for you:

### Import Steps:
1. Open Postman
2. Click **Import** button (top left)
3. Select **File** tab
4. Choose: `Offline_Mode_Control.postman_collection.json`
5. Click **Import**

### Collection Includes:
1. ✅ Get Current Settings
2. ✅ Disable Auto-Detection
3. ✅ Enable Auto-Detection
4. ✅ Force Offline Mode ON
5. ✅ Force Offline Mode OFF
6. ✅ Test Validation Error

All requests are pre-configured with correct headers and body!

---

## Testing with curl (Alternative)

If Postman is giving you trouble, use curl in PowerShell:

### Disable Auto-Detection
```powershell
$body = @{autoDetection = $false} | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:3001/api/offline/mode/toggle" -Method POST -Body $body -ContentType "application/json"
```

### Enable Auto-Detection
```powershell
$body = @{autoDetection = $true} | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:3001/api/offline/mode/toggle" -Method POST -Body $body -ContentType "application/json"
```

### Force Offline
```powershell
$body = @{forceOffline = $true} | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:3001/api/offline/mode/force" -Method POST -Body $body -ContentType "application/json"
```

### Force Online
```powershell
$body = @{forceOffline = $false} | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:3001/api/offline/mode/force" -Method POST -Body $body -ContentType "application/json"
```

### Get Settings
```powershell
Invoke-RestMethod -Uri "http://localhost:3001/api/offline/mode/settings" -Method GET
```

---

## Testing with Browser Console (Easiest!)

Open browser console (F12) on `http://localhost:8080`:

```javascript
// Disable auto-detection
await YGOfflineControls.toggleAutoDetection(false);

// Force offline
await YGOfflineControls.forceOffline(true);

// Force online
await YGOfflineControls.forceOffline(false);

// Re-enable auto-detection
await YGOfflineControls.toggleAutoDetection(true);

// View current settings
await YGOfflineControls.getSettings();
```

This is the **recommended method** for testing!

---

## Verify Your Postman Configuration

### Check the Request Preview

Before sending, look at the **Code** button (right side) and select **curl**. You should see:

```bash
curl --location 'http://localhost:3001/api/offline/mode/toggle' \
--header 'Content-Type: application/json' \
--data '{
    "autoDetection": false
}'
```

If you see `--data ''` (empty), your body isn't configured correctly!

---

## Debugging Empty Body Issue

If you're still getting empty body, check:

1. **Postman Version**: Update to latest version (some old versions have bugs)
2. **Request Type**: Make sure it's POST, not GET
3. **Body Mode**: Must be "raw" + "JSON"
4. **JSON Syntax**: Must be valid JSON (use a JSON validator)
5. **Spaces**: No extra spaces or tabs before/after the JSON

---

## Expected Log Output (Success)

When configured correctly, backend logs should show:

```
[BODY-PARSER] Before parsing - Method: POST, URL: /api/offline/mode/toggle, Content-Type: application/json, Content-Length: 29
[BODY-PARSER] After parsing - Body exists: true, Body type: object, Body keys: [ 'autoDetection' ], Body empty: false
[BODY-PARSER] Raw body content: { autoDetection: false }
🔄 [Offline API] POST /api/offline/mode/toggle - Setting autoDetection to false
```

Your current logs show:
```
❌ Content-Type: undefined          <- Missing header!
❌ Content-Length: 0                <- Empty body!
❌ Body keys: []                    <- No properties!
❌ Body empty: true                 <- Body wasn't sent!
```

---

## Quick Test Sequence

Once configured correctly, run this sequence:

### 1. Get initial settings
```
GET /api/offline/mode/settings
```
Expected: `{ autoDetection: true, manualOverride: false }`

### 2. Disable auto-detection
```
POST /api/offline/mode/toggle
Body: { "autoDetection": false }
```
Expected: `{ success: true, message: "Automatic offline detection disabled" }`

### 3. Force offline
```
POST /api/offline/mode/force
Body: { "forceOffline": true }
```
Expected: `{ success: true, message: "Offline mode forced ON" }`

### 4. Verify settings
```
GET /api/offline/mode/settings
```
Expected: `{ autoDetection: false, manualOverride: true }`

---

## Still Having Issues?

### Use the Browser Console Method
It's the easiest and most reliable:

1. Open frontend: `http://localhost:8080`
2. Open console: Press F12
3. Run commands:
   ```javascript
   // Quick test
   await YGOfflineControls.goOffline();
   // Should see toast: "Auto-detection disabled" and "Offline mode forced ON"
   
   await YGOfflineControls.getSettings();
   // Should show: { autoDetection: false, manualOverride: true }
   ```

### Check Backend is Running
```powershell
Invoke-RestMethod -Uri "http://localhost:3001/health" -Method GET
```

Should return:
```json
{
  "status": "ok",
  "timestamp": "...",
  "uptime": "..."
}
```

---

## Summary

**The issue:** Postman didn't send the request body

**The fix:** 
1. Use **Body** tab → **raw** → **JSON** dropdown
2. Add `Content-Type: application/json` header
3. Or use the imported Postman collection
4. Or use browser console (recommended!)

**Recommended approach:** Use `YGOfflineControls` in browser console for testing. It's easier and more reliable!
