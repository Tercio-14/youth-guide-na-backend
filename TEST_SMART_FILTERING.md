# Testing Smart LLM Filtering - Quick Guide

## 🚀 Quick Start (5 minutes)

### Step 1: Start Backend
```bash
cd youth-guide-na-backend
npm start
```

Wait for: `Server running on port 3001`

### Step 2: Test in Chat UI

Open your chat interface and try these queries:

#### Test A: General Query ✅
```
You: "what opportunities are available?"
Bot: [Shows mix of jobs, scholarships, internships]
Result: ✅ PASS if diverse types shown
```

#### Test B: Specific - Scholarships ✅
```
You: "show me scholarships"
Bot: [Shows ONLY scholarships/bursaries]
Result: ✅ PASS if NO jobs/internships shown
```

#### Test C: Misspelling ✅
```
You: "any scholerships?"
Bot: [Shows ONLY scholarships]
Result: ✅ PASS if typo handled correctly
```

#### Test D: Synonym ✅
```
You: "I need funding for university"
Bot: [Shows ONLY scholarships/bursaries]
Result: ✅ PASS if understands "funding"
```

## 📊 Check Backend Logs

### What Good Logs Look Like:

**Filtering to specific type:**
```
[Chat] LLM filtering response { llmResponse: '1,2' }
[Chat] Successfully filtered opportunities
  { originalCount: 5, filteredCount: 2 }
```

**General query (no filtering):**
```
[Chat] LLM filtering response { llmResponse: 'ALL' }
[Chat] User wants general opportunities { count: 5 }
```

**No matches:**
```
[Chat] LLM filtering response { llmResponse: 'NONE' }
[Chat] No opportunities match specific request
```

## 🐛 Quick Troubleshooting

### Problem: Still getting jobs for "scholarships"

**Solution:**
1. Check backend logs - Look for filtering decision
2. Restart backend if needed
3. Verify OpenRouter API is working

### Problem: Test user doesn't exist

**Solution:**
```bash
# Create test user manually in Firebase console
Email: test@example.com
Password: Test123!@#
```

## ✅ Success Checklist

```
□ Backend starts without errors
□ General query shows all types
□ "scholarships" shows ONLY scholarships
□ "scholerships" (typo) still works
□ "funding" understood as scholarship
□ Logs show correct filtering decisions
□ No crashes or timeouts
```

## 🎉 Done!

If all tests pass, the smart filtering is working perfectly! 🚀

**Next:** Deploy to production with confidence!
