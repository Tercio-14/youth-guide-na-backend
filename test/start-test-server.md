# Starting Backend Server for Testing

The test suite requires the backend server to run with authentication disabled. This allows automated tests to run without Firebase tokens.

## Quick Start

### Windows (PowerShell)

```powershell
cd youth-guide-na-backend
$env:DISABLE_AUTH_FOR_TESTING="true"; npm run dev
```

### Unix/Mac/Linux (Bash/Zsh)

```bash
cd youth-guide-na-backend
DISABLE_AUTH_FOR_TESTING=true npm run dev
```

## Alternative: Using .env file

1. Open or create `.env` file in `youth-guide-na-backend` directory

2. Add this line:
   ```
   DISABLE_AUTH_FOR_TESTING=true
   ```

3. Start server normally:
   ```bash
   npm run dev
   ```

## Verification

After starting the server, verify it's running correctly:

```bash
# Test health endpoint
curl http://localhost:3001/health

# Expected: {"status":"ok"}
```

If authentication bypass is working, you should see this message in the server logs:
```
[AUTH] Test mode enabled - authentication bypassed
```

## Running Tests

Once the server is running with auth disabled:

```bash
# In a new terminal
cd youth-guide-na-backend/test
node run-all-tests.js
```

## Security Warning

⚠️ **CRITICAL**: Never deploy or use `DISABLE_AUTH_FOR_TESTING=true` in production!

This setting completely bypasses Firebase authentication and should ONLY be used:
- In local development
- For automated testing
- Never on deployed servers

Before deploying:
1. Remove `DISABLE_AUTH_FOR_TESTING=true` from .env
2. Restart server without the environment variable
3. Verify authentication is required by testing an endpoint

## Troubleshooting

### Tests fail with 401 errors

**Problem**: Server doesn't have authentication disabled

**Solution**: 
- Check server logs for "Test mode enabled" message
- Restart server with `DISABLE_AUTH_FOR_TESTING=true`
- Verify .env file has the setting if using that method

### Server won't start

**Problem**: Port already in use

**Solution**:
```bash
# Windows
netstat -ano | findstr :3001
# Kill the process using that port

# Unix/Mac
lsof -ti:3001 | xargs kill
```

### Environment variable not being recognized

**Problem**: Shell not loading variable correctly

**Solution**:
```bash
# Windows PowerShell - Try this format
$env:DISABLE_AUTH_FOR_TESTING = "true"
npm run dev

# Or use .env file method instead
```

## What Happens When Auth is Disabled

When `DISABLE_AUTH_FOR_TESTING=true` is set:

1. All authenticated endpoints work without tokens
2. A mock user is injected: `test-user-id` / `test@youthguide.na`
3. Server logs show "[AUTH] Test mode enabled - authentication bypassed"
4. Tests can run without Firebase token generation

This is implemented in `src/middleware/auth.js` and only affects the `verifyToken` middleware.
