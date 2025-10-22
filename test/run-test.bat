@echo off
REM Quick Test Runner for Windows

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║     Smart Filtering Test - Quick Runner                   ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

REM Check if backend is running
echo 🔍 Checking backend...
curl -s http://localhost:3001/health > nul 2>&1
if errorlevel 1 (
    echo ❌ Backend is NOT running!
    echo    Start it with: npm start
    echo.
    pause
    exit /b 1
)
echo ✅ Backend is running
echo.

echo 📋 HOW TO GET YOUR TOKEN:
echo    1. Open http://localhost:5173 in browser
echo    2. Login if needed
echo    3. Press F12 (DevTools)
echo    4. Network tab
echo    5. Send a chat message
echo    6. Find /api/chat request
echo    7. Headers → Authorization: Bearer ^<TOKEN^>
echo    8. Copy the token (everything after "Bearer ")
echo.

set /p TOKEN="🔑 Paste token here (or press Enter to skip): "

if "%TOKEN%"=="" (
    echo.
    echo ⚠️  No token provided - showing manual test guide
    echo.
    echo Try these in your chat UI:
    echo    • "what opportunities are available?" → ALL types
    echo    • "show me scholarships" → ONLY scholarships
    echo    • "any scholerships?" → Handles typo
    echo    • "I need funding" → Understands synonym
    echo.
    pause
    exit /b 0
)

echo.
echo ✅ Running tests with your token...
echo.

set FIREBASE_TOKEN=%TOKEN%
node test/test-smart-filtering.js

echo.
echo ✅ Tests complete!
echo.
pause
