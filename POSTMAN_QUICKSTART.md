# Quick Start: Postman Setup (5 Minutes)

## Step 1: Import Collection (1 min)

1. Open Postman
2. Click **"Import"** button (top left)
3. Drag and drop `YouthGuide-NA-Config-API.postman_collection.json` into the import dialog
4. Click **"Import"**
5. ✅ Collection "YouthGuide NA - Data Source Config" appears in sidebar

## Step 2: Get Firebase Token (2 min)

1. Open your YouthGuide NA app in browser: http://localhost:5173
2. **Log in** to your account
3. Press **F12** to open Developer Tools
4. Click **Console** tab
5. **Copy and paste** this command:

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
    console.log('� Copy manually (triple-click to select all):');
    console.log(token);
  }
  console.log('�👤 User:', window.firebaseAuth.currentUser.email);
})();
```

6. Press **Enter**
7. **Copy the token** (it will either auto-copy or be displayed - triple-click the token to select all)
8. ✅ Token is ready to paste into Postman

## Step 3: Set Token in Postman (1 min)

1. In Postman, click on your collection name: **"YouthGuide NA - Data Source Config"**
2. Click the **"Variables"** tab
3. Find the row with `firebase_token`
4. Click in the **"Current value"** column
5. **Paste** your token (Ctrl+V)
6. Click **"Save"** (top right)
7. ✅ Token is now set

## Step 4: Test It! (1 min)

1. Click on **"Get Data Source Status"** request
2. Click the blue **"Send"** button
3. You should see:
```json
{
  "success": true,
  "dataSource": "opportunities",
  "path": "data/opportunities.json",
  ...
}
```
4. ✅ It works!

## Step 5: Try Switching (30 sec)

1. Click **"Switch to Dummy Data"**
2. Click **"Send"**
3. You should see `"currentSource": "dummy"`, `"changed": true`
4. Click **"Get Data Source Status"** again
5. Should now show `"dataSource": "dummy"`
6. ✅ Switching works!

---

## You're Done! 🎉

Now you can switch data sources anytime with one click:

- **Get Data Source Status** - Check which data is active
- **Switch to Dummy Data** - Use test data (25 opportunities)
- **Switch to Real Data** - Use production data (108 opportunities)
- **Reset to Default** - Quick reset to real data

---

## When Token Expires (After 1 Hour)

If you get **401 Unauthorized**:

1. Go back to browser console
2. Run the token command again
3. Update `firebase_token` in collection variables
4. Save and retry

---

## Keyboard Shortcuts

- **Send Request**: `Ctrl + Enter` (Windows) or `Cmd + Enter` (Mac)
- **Open Console**: `Ctrl + Alt + C` (see detailed logs)
- **Save Request**: `Ctrl + S`

---

## Quick Test Workflow

```
1. Send "Get Data Source Status" → See "opportunities"
2. Send "Switch to Dummy Data" → Changed to "dummy"
3. Send "Get Data Source Status" → Verify "dummy"
4. Test chatbot (uses dummy data now)
5. Send "Reset to Default" → Back to "opportunities"
6. Send "Get Data Source Status" → Verify "opportunities"
```

---

## Need Help?

See `POSTMAN_SETUP_GUIDE.md` for:
- Troubleshooting
- Advanced features
- Collection organization
- Test scripts
- Environment setup
- More endpoints

**That's it!** You're ready to test! 🚀
