# Smart Filtering Test Runner for PowerShell
# This script makes it easy to run the tests with your Firebase token

Write-Host "`n================================================================" -ForegroundColor Cyan
Write-Host "     Smart Filtering Test - Easy Runner                    " -ForegroundColor Cyan
Write-Host "================================================================`n" -ForegroundColor Cyan

# Check if backend is running
Write-Host "Checking backend status..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "http://localhost:3001/health" -Method Get
    Write-Host "[OK] Backend is running`n" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Backend is NOT running!" -ForegroundColor Red
    Write-Host "   Start it with: npm start`n" -ForegroundColor Red
    exit 1
}

# Instructions to get token
Write-Host "How to get your Firebase token:" -ForegroundColor Cyan
Write-Host "   1. Open http://localhost:5173 in your browser" -ForegroundColor White
Write-Host "   2. Log in if not already logged in" -ForegroundColor White
Write-Host "   3. Press F12 to open DevTools" -ForegroundColor White
Write-Host "   4. Go to Network tab" -ForegroundColor White
Write-Host "   5. Send ANY chat message" -ForegroundColor White
Write-Host "   6. Click on the /api/chat request" -ForegroundColor White
Write-Host "   7. Go to Headers tab" -ForegroundColor White
Write-Host "   8. Find 'Authorization: Bearer <token>'" -ForegroundColor White
Write-Host "   9. Copy everything AFTER 'Bearer '`n" -ForegroundColor White

# Get token from user
$token = Read-Host "[TOKEN] Paste your Firebase token here (or press Enter to see manual test guide)"

if ([string]::IsNullOrWhiteSpace($token)) {
    Write-Host "`n[GUIDE] MANUAL TESTING GUIDE:" -ForegroundColor Magenta
    Write-Host "`nIn your chat UI, try these queries:" -ForegroundColor White
    Write-Host "   1. 'what opportunities are available?' - Should show ALL types" -ForegroundColor Yellow
    Write-Host "   2. 'show me scholarships' - Should show ONLY scholarships" -ForegroundColor Yellow
    Write-Host "   3. 'any scholerships?' - Should handle typo" -ForegroundColor Yellow
    Write-Host "   4. 'I need funding for university' - Should show scholarships" -ForegroundColor Yellow
    Write-Host "   5. 'looking for internships' - Should show ONLY internships`n" -ForegroundColor Yellow
    Write-Host "Watch the backend terminal for filtering logs!`n" -ForegroundColor Cyan
    exit 0
}

# Validate token format (JWT has 3 parts)
$parts = $token.Split(".")
if ($parts.Length -ne 3) {
    Write-Host "`n[ERROR] Invalid token format!" -ForegroundColor Red
    Write-Host "   Firebase tokens should have 3 parts separated by dots" -ForegroundColor Red
    Write-Host "   Example: eyJhbGc...abc.eyJzdWI...xyz.SflKxw...def`n" -ForegroundColor Red
    exit 1
}

Write-Host "`n[OK] Token format looks good!" -ForegroundColor Green
Write-Host "Running tests with your token...`n" -ForegroundColor Cyan

# Run the interactive test with the token
$env:FIREBASE_TOKEN = $token
node test/test-smart-filtering.js

Write-Host "`n[DONE] Tests complete!`n" -ForegroundColor Green
