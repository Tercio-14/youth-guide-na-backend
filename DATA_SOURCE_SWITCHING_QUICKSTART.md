# Data Source Switching Feature - Quick Start

## What's New?
You can now easily switch between real and dummy data sources for testing without modifying code or restarting the server!

## Quick Commands

### Check Current Data Source
```bash
curl http://localhost:3001/api/config/data-source
```

### Switch to Dummy Data (requires auth token)
```bash
curl -X POST http://localhost:3001/api/config/data-source \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"source": "dummy"}'
```

### Switch to Real Data
```bash
curl -X POST http://localhost:3001/api/config/data-source \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"source": "opportunities"}'
```

### Reset to Default (Real Data)
```bash
curl -X POST http://localhost:3001/api/config/reset \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Frontend Usage (Browser Console)

```javascript
// Check current source
const status = await apiClient.getDataSource();
console.log('Current source:', status.dataSource);

// Get your auth token
const token = await firebase.auth().currentUser.getIdToken();

// Switch to dummy data
await apiClient.switchDataSource('dummy', token);

// Switch back to real data
await apiClient.switchDataSource('opportunities', token);

// Or reset to default
await apiClient.resetDataSource(token);
```

## How It Works
1. **Default**: Uses `data/opportunities.json` (108 real opportunities)
2. **Dummy Mode**: Uses `test/dummy-opportunities.json` (25 test opportunities)
3. **Cache**: Automatically invalidates when source changes
4. **No Restart**: Changes apply immediately on next request

## Testing Workflow
```bash
# 1. Check what's currently active
curl http://localhost:3001/api/config/data-source

# 2. Switch to dummy for testing
curl -X POST http://localhost:3001/api/config/data-source \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"source": "dummy"}'

# 3. Run your tests (chatbot uses dummy data)
npm run test

# 4. Switch back to real data
curl -X POST http://localhost:3001/api/config/reset \
  -H "Authorization: Bearer $TOKEN"
```

## Files Modified
- ✅ `src/routes/config.js` - New config API routes
- ✅ `src/utils/rag.js` - Dynamic data source loading
- ✅ `src/app.js` - Route registration
- ✅ `src/utils/api.js` (frontend) - API client methods

## Benefits
- ✨ No code changes needed for testing
- ✨ No server restart required
- ✨ Works with existing test framework
- ✨ Instant switching via API
- ✨ Authentication protected
- ✨ Clear status checking

See `DATA_SOURCE_CONFIG_API.md` for complete documentation.
