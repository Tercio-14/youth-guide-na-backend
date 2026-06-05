# Offline Mode Control System

## Overview

The offline mode control system provides manual control over offline detection behavior. This is particularly useful during development when using localhost backend (reachable even when WiFi is off).

## Features

- **Toggle Auto-Detection**: Enable/disable automatic offline detection
- **Manual Override**: Force offline mode on/off (only when auto-detection is disabled)
- **Persistent Settings**: Settings survive server restarts
- **Smart Validation**: Prevents conflicting states

## Settings

Settings are stored in `data/offline/offlineSettings.json`:

```json
{
  "autoDetection": true,
  "manualOverride": false,
  "lastUpdated": "2025-10-28T00:00:00.000Z"
}
```

- `autoDetection` (boolean): When `true`, automatic connectivity checks run. When `false`, all auto-detection is disabled.
- `manualOverride` (boolean): When auto-detection is off, this forces offline mode on (`true`) or off (`false`).
- `lastUpdated` (timestamp): Last time settings were modified.

## API Endpoints

### Get Current Settings

```bash
GET /api/offline/mode/settings
```

**Response:**
```json
{
  "success": true,
  "settings": {
    "autoDetection": true,
    "manualOverride": false,
    "lastUpdated": "2025-10-28T10:30:00.000Z"
  },
  "description": {
    "autoDetection": "Auto-detect offline via connectivity checks",
    "manualOverride": "Force offline mode manually (only when autoDetection=false)"
  }
}
```

### Toggle Auto-Detection

```bash
POST /api/offline/mode/toggle
Content-Type: application/json

{
  "autoDetection": false
}
```

**Response:**
```json
{
  "success": true,
  "message": "Auto-detection disabled",
  "settings": {
    "autoDetection": false,
    "manualOverride": false,
    "lastUpdated": "2025-10-28T10:31:00.000Z"
  }
}
```

**Behavior:**
- Enabling auto-detection (`true`) automatically clears `manualOverride`
- Returns 400 if `autoDetection` is not a boolean

### Force Offline Mode

```bash
POST /api/offline/mode/force
Content-Type: application/json

{
  "forceOffline": true
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Offline mode forced ON",
  "settings": {
    "autoDetection": false,
    "manualOverride": true,
    "lastUpdated": "2025-10-28T10:32:00.000Z"
  }
}
```

**Response (Error - Auto-Detection Enabled):**
```json
{
  "error": "Cannot force while auto-detection enabled",
  "message": "Disable auto-detection first using /api/offline/mode/toggle"
}
```

**Validation:**
- Only works when `autoDetection` is `false`
- Returns 400 if `autoDetection` is `true`
- Returns 400 if `forceOffline` is not a boolean

## Frontend Integration

The frontend automatically:
1. Fetches settings on app mount
2. Respects `autoDetection` flag in connectivity checks
3. Applies `manualOverride` to `isOffline` state
4. Skips periodic checks when auto-detection is disabled

## Console API

The frontend exposes `window.YGOfflineControls` for easy console access:

### Toggle Auto-Detection

```javascript
// Disable auto-detection
await YGOfflineControls.toggleAutoDetection(false);

// Re-enable auto-detection
await YGOfflineControls.toggleAutoDetection(true);
```

### Force Offline Mode

```javascript
// Force offline (only works when auto-detection is off)
await YGOfflineControls.forceOffline(true);

// Force online
await YGOfflineControls.forceOffline(false);
```

### Get Current Settings

```javascript
await YGOfflineControls.getSettings();
// Returns: { autoDetection: true, manualOverride: false, lastUpdated: "..." }
```

### Helper Functions

```javascript
// Quick: Disable auto-detection + force offline
await YGOfflineControls.goOffline();

// Quick: Re-enable auto-detection
await YGOfflineControls.goAuto();

// View connectivity history (last 20 events)
YGOfflineControls.showHistory();
```

## Testing Scenarios

### Scenario 1: Default Behavior (Auto-Detection ON)

**Setup:**
```bash
# Ensure auto-detection is enabled
curl -X POST http://localhost:3001/api/offline/mode/toggle \
  -H "Content-Type: application/json" \
  -d '{"autoDetection": true}'
```

**Expected Behavior:**
- App runs automatic connectivity checks
- Detects WiFi on/off events
- Shows online/offline toasts automatically

### Scenario 2: Localhost Development (Auto-Detection OFF)

**Setup:**
```bash
# Disable auto-detection
curl -X POST http://localhost:3001/api/offline/mode/toggle \
  -H "Content-Type: application/json" \
  -d '{"autoDetection": false}'
```

**Expected Behavior:**
- App stops running connectivity checks
- No automatic mode switching
- Backend on localhost remains reachable even when WiFi is off

**Force Offline:**
```bash
# Manually enter offline mode
curl -X POST http://localhost:3001/api/offline/mode/force \
  -H "Content-Type: application/json" \
  -d '{"forceOffline": true}'
```

**Force Online:**
```bash
# Manually exit offline mode
curl -X POST http://localhost:3001/api/offline/mode/force \
  -H "Content-Type: application/json" \
  -d '{"forceOffline": false}'
```

### Scenario 3: Validation Error

**Setup:**
```bash
# Enable auto-detection
curl -X POST http://localhost:3001/api/offline/mode/toggle \
  -H "Content-Type: application/json" \
  -d '{"autoDetection": true}'

# Try to force offline (should fail)
curl -X POST http://localhost:3001/api/offline/mode/force \
  -H "Content-Type: application/json" \
  -d '{"forceOffline": true}'
```

**Expected Response:**
```json
{
  "error": "Cannot force while auto-detection enabled",
  "message": "Disable auto-detection first using /api/offline/mode/toggle"
}
```

### Scenario 4: Settings Persistence

**Steps:**
```bash
# 1. Disable auto-detection and force offline
curl -X POST http://localhost:3001/api/offline/mode/toggle \
  -H "Content-Type: application/json" \
  -d '{"autoDetection": false}'

curl -X POST http://localhost:3001/api/offline/mode/force \
  -H "Content-Type: application/json" \
  -d '{"forceOffline": true}'

# 2. Restart backend server
# Stop with Ctrl+C, then: npm start

# 3. Verify settings persist
curl http://localhost:3001/api/offline/mode/settings
```

**Expected Response:**
```json
{
  "success": true,
  "settings": {
    "autoDetection": false,
    "manualOverride": true,
    "lastUpdated": "..."
  }
}
```

## Console Testing

Open browser console and test the control functions:

```javascript
// 1. Check current settings
await YGOfflineControls.getSettings();

// 2. Enter manual mode (disable auto-detection)
await YGOfflineControls.toggleAutoDetection(false);

// 3. Force offline mode
await YGOfflineControls.forceOffline(true);
// Should see: App switches to offline mode, offline UI appears

// 4. Force online mode
await YGOfflineControls.forceOffline(false);
// Should see: App switches to online mode, normal UI appears

// 5. Re-enable auto-detection
await YGOfflineControls.toggleAutoDetection(true);
// Should see: Auto-detection re-enabled, manual override cleared

// 6. Quick helper: Go offline
await YGOfflineControls.goOffline();
// Does: toggleAutoDetection(false) + forceOffline(true)

// 7. Quick helper: Go back to auto
await YGOfflineControls.goAuto();
// Does: toggleAutoDetection(true)

// 8. View connectivity history
YGOfflineControls.showHistory();
// Shows: Last 20 connectivity events in table format
```

## Localhost Development Workflow

When developing with localhost backend:

1. **Disable Auto-Detection:**
   ```bash
   curl -X POST http://localhost:3001/api/offline/mode/toggle \
     -H "Content-Type: application/json" \
     -d '{"autoDetection": false}'
   ```

2. **Work Normally:**
   - Turn WiFi on/off as needed
   - Backend on localhost remains reachable
   - No unwanted offline mode switching

3. **Test Offline Features:**
   ```bash
   # Force offline when needed
   curl -X POST http://localhost:3001/api/offline/mode/force \
     -H "Content-Type: application/json" \
     -d '{"forceOffline": true}'
   
   # Force online when done testing
   curl -X POST http://localhost:3001/api/offline/mode/force \
     -H "Content-Type: application/json" \
     -d '{"forceOffline": false}'
   ```

4. **Re-enable Before Deployment:**
   ```bash
   curl -X POST http://localhost:3001/api/offline/mode/toggle \
     -H "Content-Type: application/json" \
     -d '{"autoDetection": true}'
   ```

## Troubleshooting

### Issue: Force endpoint returns 400

**Cause:** Auto-detection is enabled

**Solution:**
```bash
# Disable auto-detection first
curl -X POST http://localhost:3001/api/offline/mode/toggle \
  -H "Content-Type: application/json" \
  -d '{"autoDetection": false}'

# Then force offline
curl -X POST http://localhost:3001/api/offline/mode/force \
  -H "Content-Type: application/json" \
  -d '{"forceOffline": true}'
```

### Issue: Settings not persisting

**Check:** Ensure backend has write permissions to `data/offline/` directory

**Solution:**
```bash
# Check if directory exists
ls data/offline/

# Create if missing
mkdir -p data/offline/

# Check permissions
ls -la data/offline/
```

### Issue: Frontend not respecting settings

**Check:** Ensure frontend fetched latest settings

**Solution:**
```javascript
// Force settings refresh in console
await YGOfflineControls.getSettings();
```

### Issue: Auto-detection still running after disabling

**Check:** Look for console logs like "⏸️ Periodic check skipped (auto-detection disabled)"

**Solution:**
```bash
# Verify backend settings
curl http://localhost:3001/api/offline/mode/settings

# If autoDetection is true, disable it
curl -X POST http://localhost:3001/api/offline/mode/toggle \
  -H "Content-Type: application/json" \
  -d '{"autoDetection": false}'

# Reload frontend page
```

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      Frontend                            │
│  ┌──────────────────────────────────────────────────┐   │
│  │         OfflineContext.jsx                       │   │
│  │  - Fetches settings on mount                     │   │
│  │  - Respects autoDetection in checks              │   │
│  │  - Applies manualOverride to isOffline           │   │
│  │  - Exposes window.YGOfflineControls              │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                           │
                           │ HTTP requests
                           ▼
┌─────────────────────────────────────────────────────────┐
│                      Backend                             │
│  ┌──────────────────────────────────────────────────┐   │
│  │         /routes/offline.js                       │   │
│  │  GET  /api/offline/mode/settings                 │   │
│  │  POST /api/offline/mode/toggle                   │   │
│  │  POST /api/offline/mode/force                    │   │
│  └──────────────────────────────────────────────────┘   │
│                           │                              │
│                           ▼                              │
│  ┌──────────────────────────────────────────────────┐   │
│  │     /utils/offline-storage.js                    │   │
│  │  - getOfflineSettings()                          │   │
│  │  - updateOfflineSettings(updates)                │   │
│  └──────────────────────────────────────────────────┘   │
│                           │                              │
│                           ▼                              │
│  ┌──────────────────────────────────────────────────┐   │
│  │     data/offline/offlineSettings.json            │   │
│  │  {                                               │   │
│  │    autoDetection: boolean,                       │   │
│  │    manualOverride: boolean,                      │   │
│  │    lastUpdated: timestamp                        │   │
│  │  }                                               │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

## Key Design Decisions

1. **Two Separate Controls**: `autoDetection` and `manualOverride` are independent
2. **Smart Validation**: Force endpoint validates auto-detection is off
3. **Automatic Cleanup**: Enabling auto-detection clears manual override
4. **Persistent State**: Settings survive server restarts via JSON file
5. **Console Access**: Easy testing via `window.YGOfflineControls`
6. **Clear Logging**: All actions logged with emoji prefixes for easy debugging
