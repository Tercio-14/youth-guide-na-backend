# Quick Test Guide - Offline Mode Control

## Prerequisites

1. Backend running: `npm run dev` (from youth-guide-na-backend)
2. Frontend running: `npm run dev` (from youth-guide-na)
3. Browser console open (F12)

## Test 1: Default Behavior (2 minutes)

**Goal:** Verify auto-detection works like before

```bash
# 1. Check settings (should be auto-detection ON by default)
curl http://localhost:3001/api/offline/mode/settings
```

**Expected:**
```json
{
  "success": true,
  "settings": {
    "autoDetection": true,
    "manualOverride": false,
    "lastUpdated": "..."
  }
}
```

**In Browser:**
- App should work normally
- Turn WiFi off → should show "📴 You're offline" toast
- Turn WiFi on → should show "🌐 Back online!" toast

**Result:** ✅ Default behavior works

---

## Test 2: Disable Auto-Detection (3 minutes)

**Goal:** Stop automatic connectivity checks

```bash
# Disable auto-detection
curl -X POST http://localhost:3001/api/offline/mode/toggle \
  -H "Content-Type: application/json" \
  -d '{"autoDetection": false}'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Auto-detection disabled",
  "settings": {
    "autoDetection": false,
    "manualOverride": false,
    "lastUpdated": "..."
  }
}
```

**In Browser Console:**
- Look for: "⚙️ [OfflineContext] Loaded offline settings: { autoDetection: false, ... }"
- Look for: "⏸️ [OfflineContext] Periodic check skipped (auto-detection disabled)"

**Test WiFi Toggle:**
- Turn WiFi off → NO toast should appear
- Turn WiFi on → NO toast should appear
- App stays in current mode

**Result:** ✅ Auto-detection disabled

---

## Test 3: Force Offline Mode (2 minutes)

**Goal:** Manually enter offline mode

```bash
# Force offline
curl -X POST http://localhost:3001/api/offline/mode/force \
  -H "Content-Type: application/json" \
  -d '{"forceOffline": true}'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Offline mode forced ON",
  "settings": {
    "autoDetection": false,
    "manualOverride": true,
    "lastUpdated": "..."
  }
}
```

**In Browser:**
- Should see: "✅ [OfflineContext] Offline mode forced: Offline mode forced ON"
- Should see: "🎛️ [OfflineContext] Applying manual override: OFFLINE"
- UI should switch to offline mode (gray banner, offline features)

**Result:** ✅ Forced offline successfully

---

## Test 4: Force Online Mode (2 minutes)

**Goal:** Manually exit offline mode

```bash
# Force online
curl -X POST http://localhost:3001/api/offline/mode/force \
  -H "Content-Type: application/json" \
  -d '{"forceOffline": false}'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Offline mode forced OFF",
  "settings": {
    "autoDetection": false,
    "manualOverride": false,
    "lastUpdated": "..."
  }
}
```

**In Browser:**
- Should see: "✅ [OfflineContext] Offline mode forced: Offline mode forced OFF"
- Should see: "🎛️ [OfflineContext] Applying manual override: ONLINE"
- UI should switch to online mode (normal UI)

**Result:** ✅ Forced online successfully

---

## Test 5: Validation Error (2 minutes)

**Goal:** Verify force endpoint rejects when auto-detection is on

```bash
# 1. Re-enable auto-detection
curl -X POST http://localhost:3001/api/offline/mode/toggle \
  -H "Content-Type: application/json" \
  -d '{"autoDetection": true}'

# 2. Try to force offline (should fail)
curl -X POST http://localhost:3001/api/offline/mode/force \
  -H "Content-Type: application/json" \
  -d '{"forceOffline": true}'
```

**Expected Response (Error):**
```json
{
  "error": "Cannot force while auto-detection enabled",
  "message": "Disable auto-detection first using /api/offline/mode/toggle"
}
```

**Result:** ✅ Validation works correctly

---

## Test 6: Console API (3 minutes)

**Goal:** Test console commands

Open browser console and run:

```javascript
// 1. Check current settings
await YGOfflineControls.getSettings();
// Should show: { autoDetection: true, manualOverride: false, ... }

// 2. Use quick helper to go offline
await YGOfflineControls.goOffline();
// Should see: Auto-detection disabled + forced offline
// UI should switch to offline mode

// 3. View connectivity history
YGOfflineControls.showHistory();
// Should show: Table with recent connectivity events

// 4. Force online
await YGOfflineControls.forceOffline(false);
// UI should switch to online mode

// 5. Re-enable auto-detection
await YGOfflineControls.goAuto();
// Should see: Auto-detection enabled
```

**Result:** ✅ Console API works

---

## Test 7: Settings Persistence (2 minutes)

**Goal:** Verify settings survive server restart

```bash
# 1. Disable auto-detection and force offline
curl -X POST http://localhost:3001/api/offline/mode/toggle \
  -H "Content-Type: application/json" \
  -d '{"autoDetection": false}'

curl -X POST http://localhost:3001/api/offline/mode/force \
  -H "Content-Type: application/json" \
  -d '{"forceOffline": true}'

# 2. Check settings
curl http://localhost:3001/api/offline/mode/settings
# Note the values
```

**Restart Backend:**
- Press Ctrl+C in backend terminal
- Run: `npm run dev`
- Wait for server to start

```bash
# 3. Check settings again
curl http://localhost:3001/api/offline/mode/settings
```

**Expected:**
- Settings should be the same as before restart
- `autoDetection: false`, `manualOverride: true`

**Result:** ✅ Settings persisted

---

## Test 8: Localhost Workflow (5 minutes)

**Goal:** Verify localhost backend works with WiFi off

```bash
# 1. Disable auto-detection
curl -X POST http://localhost:3001/api/offline/mode/toggle \
  -H "Content-Type: application/json" \
  -d '{"autoDetection": false}'
```

**Workflow:**
1. Turn WiFi OFF
2. Wait a few seconds
3. Try to use the app (search, chat, etc.)
4. Backend should still be reachable on localhost
5. App should work normally (no offline mode unless forced)

**Test API:**
```bash
# With WiFi OFF, this should still work:
curl http://localhost:3001/api/offline/mode/settings
```

**Result:** ✅ Localhost workflow works

---

## Test 9: Connectivity History (2 minutes)

**Goal:** Verify history tracking works

In browser console:

```javascript
// 1. View history
YGOfflineControls.showHistory();

// 2. Toggle WiFi on/off a few times
// (Wait 5 seconds between each toggle)

// 3. View history again
YGOfflineControls.showHistory();
```

**Expected:**
- Table shows all connectivity events
- Timestamps, sources, connected status, reasons
- Events are in reverse chronological order (newest first)

**Result:** ✅ History tracking works

---

## Test 10: Complete Flow (5 minutes)

**Goal:** Test entire workflow end-to-end

```bash
# 1. Start with auto-detection ON (default)
curl -X POST http://localhost:3001/api/offline/mode/toggle \
  -H "Content-Type: application/json" \
  -d '{"autoDetection": true}'

# 2. Verify auto-detection works
# Toggle WiFi → should see toasts

# 3. Disable auto-detection
curl -X POST http://localhost:3001/api/offline/mode/toggle \
  -H "Content-Type: application/json" \
  -d '{"autoDetection": false}'

# 4. Verify no auto-switching
# Toggle WiFi → no toasts

# 5. Force offline
curl -X POST http://localhost:3001/api/offline/mode/force \
  -H "Content-Type: application/json" \
  -d '{"forceOffline": true}'
# UI should show offline mode

# 6. Test offline features
# - Check saved opportunities
# - View chat history
# - Try to send message (should queue)

# 7. Force online
curl -X POST http://localhost:3001/api/offline/mode/force \
  -H "Content-Type: application/json" \
  -d '{"forceOffline": false}'
# UI should show online mode

# 8. Re-enable auto-detection
curl -X POST http://localhost:3001/api/offline/mode/toggle \
  -H "Content-Type: application/json" \
  -d '{"autoDetection": true}'
```

**Result:** ✅ Complete flow works

---

## Summary Checklist

After running all tests, check off:

- [ ] Default behavior works (auto-detection on)
- [ ] Can disable auto-detection
- [ ] Can force offline mode
- [ ] Can force online mode
- [ ] Validation prevents force when auto-detection on
- [ ] Console API works (YGOfflineControls)
- [ ] Settings persist across server restarts
- [ ] Localhost backend reachable with WiFi off
- [ ] Connectivity history tracks all events
- [ ] Complete flow works end-to-end

## If Something Fails

1. **Check console logs** for error messages (emoji prefixes help)
2. **Check backend logs** for errors
3. **Verify settings file** exists: `data/offline/offlineSettings.json`
4. **Check network tab** for API call failures
5. **View connectivity history**: `YGOfflineControls.showHistory()`
6. **Refer to troubleshooting guide** in `OFFLINE_MODE_CONTROL.md`

## Time Estimate

- All 10 tests: ~30 minutes
- Quick smoke test (Tests 1-4): ~10 minutes
- Production validation (Tests 1, 5, 7, 8): ~15 minutes

## Next Steps After Testing

1. ✅ All tests pass → **System ready for production**
2. ⚠️ Some tests fail → **Review logs and troubleshoot**
3. 📝 Document any issues found → **Update troubleshooting guide**
4. 🚀 Deploy to production → **Disable auto-detection for dev, enable for prod**
