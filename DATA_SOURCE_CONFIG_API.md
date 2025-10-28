# Data Source Configuration API

## Overview
This API allows you to switch between using the real `opportunities.json` and the test `dummy-opportunities.json` data sources. This makes testing much easier without having to modify code or restart the server.

## Endpoints

### 1. Check Current Data Source
**GET** `/api/config/data-source`

Check which data source is currently being used.

**Authentication:** Not required (public endpoint)

**Response:**
```json
{
  "success": true,
  "dataSource": "opportunities",
  "path": "data/opportunities.json",
  "description": "Using real scraped opportunities data",
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

**Example (cURL):**
```bash
curl http://localhost:3001/api/config/data-source
```

**Example (JavaScript/Fetch):**
```javascript
const response = await fetch('http://localhost:3001/api/config/data-source');
const data = await response.json();
console.log('Current source:', data.dataSource);
```

---

### 2. Switch Data Source
**POST** `/api/config/data-source`

Switch between `opportunities` (real data) and `dummy` (test data).

**Authentication:** Required (Bearer token)

**Request Body:**
```json
{
  "source": "dummy"  // or "opportunities"
}
```

**Response (Success):**
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

**Response (Already Using Requested Source):**
```json
{
  "success": true,
  "message": "Already using dummy data",
  "dataSource": "dummy",
  "changed": false
}
```

**Example (cURL with Auth):**
```bash
curl -X POST http://localhost:3001/api/config/data-source \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"source": "dummy"}'
```

**Example (JavaScript/Fetch with Auth):**
```javascript
const token = await firebase.auth().currentUser.getIdToken();

const response = await fetch('http://localhost:3001/api/config/data-source', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ source: 'dummy' })
});

const data = await response.json();
console.log('Switched to:', data.currentSource);
```

---

### 3. Reset to Default
**POST** `/api/config/reset`

Reset to the default data source (`opportunities.json`).

**Authentication:** Required (Bearer token)

**Response:**
```json
{
  "success": true,
  "message": "Reset to default data source (opportunities.json)",
  "previousSource": "dummy",
  "currentSource": "opportunities",
  "timestamp": "2025-01-15T10:40:00.000Z"
}
```

**Example (cURL):**
```bash
curl -X POST http://localhost:3001/api/config/reset \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN"
```

---

## Usage Workflow

### Testing Workflow
```bash
# 1. Check current source
curl http://localhost:3001/api/config/data-source

# 2. Switch to dummy data for testing
curl -X POST http://localhost:3001/api/config/data-source \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"source": "dummy"}'

# 3. Run your tests
# (chatbot will now use dummy-opportunities.json)

# 4. Switch back to real data
curl -X POST http://localhost:3001/api/config/data-source \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"source": "opportunities"}'

# Or use reset endpoint
curl -X POST http://localhost:3001/api/config/reset \
  -H "Authorization: Bearer $TOKEN"
```

---

## How It Works

### Caching Behavior
- The RAG system caches opportunities for 5 minutes
- When you switch data sources, the cache is **invalidated on the next request**
- This means the first chat request after switching will load the new data
- Subsequent requests use the cached data until TTL expires

### Data Sources

**`opportunities` (Default)**
- Path: `data/opportunities.json`
- Contains: ~108 real scraped opportunities
- Filters out: Example Website opportunities
- Use for: Production, real testing, development

**`dummy`**
- Path: `test/dummy-opportunities.json`
- Contains: 25 test opportunities
- Filters out: Nothing (keeps all test data)
- Use for: Unit tests, automated tests, quick testing

### Thread Safety
- Data source configuration is stored in-memory (single instance)
- Changes apply immediately to all requests
- Cache invalidation ensures consistency
- No restart required

---

## Error Responses

### 400 Bad Request (Invalid Source)
```json
{
  "success": false,
  "error": "Invalid source parameter",
  "message": "Source must be either \"opportunities\" or \"dummy\"",
  "currentSource": "opportunities"
}
```

### 401 Unauthorized (Missing/Invalid Token)
```json
{
  "success": false,
  "error": "Unauthorized",
  "message": "No token provided"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "error": "Failed to switch data source",
  "message": "Detailed error message here"
}
```

---

## Testing Integration

### In Test Scripts
```javascript
// test/setup.js
const { apiClient } = require('./utils/api');

async function switchToDummyData(token) {
  const response = await apiClient.post(
    '/config/data-source',
    { source: 'dummy' },
    token
  );
  console.log('✅ Switched to dummy data');
  return response;
}

async function resetToRealData(token) {
  const response = await apiClient.post('/config/reset', {}, token);
  console.log('✅ Reset to real data');
  return response;
}

// Use in tests
before(async () => {
  await switchToDummyData(testToken);
});

after(async () => {
  await resetToRealData(testToken);
});
```

### In Frontend Dev Tools
```javascript
// Browser console helper
async function switchDataSource(source) {
  const token = await firebase.auth().currentUser.getIdToken();
  const response = await fetch('http://localhost:3001/api/config/data-source', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ source })
  });
  const data = await response.json();
  console.log(data);
  return data;
}

// Usage
await switchDataSource('dummy');  // Switch to test data
await switchDataSource('opportunities');  // Switch back
```

---

## Best Practices

### 1. Always Reset After Testing
Always switch back to real data after your tests complete:
```javascript
afterAll(async () => {
  await resetToRealData(token);
});
```

### 2. Check Current Source Before Tests
Verify the data source before running tests:
```javascript
const status = await apiClient.get('/config/data-source');
if (status.dataSource !== 'dummy') {
  await switchToDummyData(token);
}
```

### 3. Use in Development Only
These endpoints should be protected or disabled in production:
- Require authentication (already implemented)
- Consider adding admin-only restriction
- Log all data source switches for audit trail

### 4. Clear Cache When Needed
After switching, the first request loads new data:
```javascript
await switchDataSource('dummy');
// Next chat request will load dummy data
await chatApi.sendMessage('Show me internships');
```

---

## Implementation Details

### Files Modified
1. **`src/routes/config.js`** (NEW)
   - Config route handlers
   - Data source state management
   - Export `getCurrentDataSource()` function

2. **`src/utils/rag.js`**
   - Added `setDataSourceConfigGetter()` function
   - Updated `loadOpportunities()` to check current source
   - Cache invalidation when source changes
   - Support for both data paths

3. **`src/app.js`**
   - Import config routes and data source getter
   - Connect RAG system to config
   - Register `/api/config` routes
   - Update API documentation

### Architecture
```
┌─────────────────┐
│  Config Route   │  Stores: currentDataSource ('opportunities' | 'dummy')
│  (config.js)    │  Exports: getCurrentDataSource()
└────────┬────────┘
         │
         │ getCurrentDataSource()
         │
         ▼
┌─────────────────┐
│   RAG System    │  Calls: getCurrentDataSource() on each load
│   (rag.js)      │  Loads: Appropriate JSON file
│                 │  Cache: Invalidates on source change
└─────────────────┘
         │
         │ Returns opportunities
         ▼
┌─────────────────┐
│  Chat Endpoint  │  Uses: Opportunities from current source
│  (chat.js)      │  Works: Transparently with any source
└─────────────────┘
```

---

## Quick Reference

| Action | Endpoint | Method | Auth | Body |
|--------|----------|--------|------|------|
| Check source | `/api/config/data-source` | GET | ❌ | - |
| Switch source | `/api/config/data-source` | POST | ✅ | `{"source": "dummy"}` |
| Reset to default | `/api/config/reset` | POST | ✅ | - |

---

## Troubleshooting

### Issue: Changes not reflecting
**Solution:** Wait for cache to expire (5 min) or send a chat request to trigger reload

### Issue: 401 Unauthorized
**Solution:** Ensure you're sending a valid Firebase auth token in the Authorization header

### Issue: Wrong data source
**Solution:** Check current source with GET endpoint before switching

### Issue: File not found
**Solution:** Ensure `test/dummy-opportunities.json` exists in the backend directory
