# 🚀 Quick Reference - Chatbot Testing

## Run Tests

```bash
# Full test suite (recommended)
node test/run-all-tests.js

# Individual passes
node test/run-dummy-data-tests.js   # Controlled test data
node test/run-real-data-tests.js    # Production data

# Cleanup old reports
node test/cleanup-test-results.js 5  # Keep 5 most recent
```

## Prerequisites

✅ Backend server running with auth disabled:
   ```bash
   # Windows (PowerShell)
   $env:DISABLE_AUTH_FOR_TESTING="true"; npm run dev
   
   # Unix/Mac
   DISABLE_AUTH_FOR_TESTING=true npm run dev
   ```
✅ API accessible: `http://localhost:3001`  
✅ Firebase configured  
✅ Opportunity data present: `data/opportunities.json`

⚠️ **Note**: `DISABLE_AUTH_FOR_TESTING=true` is required for tests to bypass authentication. Never use in production!

## Test Duration

⏱️ Dummy Data Pass: ~10-15 minutes  
⏱️ Real Data Pass: ~10-15 minutes  
⏱️ **Total: ~20-30 minutes**

## What Gets Tested

👥 **8 Personas**: Skilled worker, IT grad, school leaver, rural youth, hospitality pro, dropout, career changer, student  
📝 **6 Query Types**: General, specific, skill-based, location-based, casual, off-topic  
🧪 **~384 Tests**: 192 per pass

## Scoring

- **80-100**: ✅ Excellent
- **60-79**: ✅ Good (Pass)
- **40-59**: ⚠️ Needs Improvement
- **0-39**: ❌ Poor

**Pass Threshold**: 60/100

## Output Files

```
test-results/
├── dummy-opportunities-test-[timestamp].md
├── real-opportunities-test-[timestamp].md
└── comprehensive-test-summary-[timestamp].md
```

## Interpreting Results

### ✅ Good Performance
- Pass rate > 70%
- Similar results dummy vs real
- Few issues reported

### ⚠️ Needs Attention
- Pass rate 60-70%
- Moderate dummy vs real gap
- Some data gaps identified

### ❌ Critical Issues
- Pass rate < 60%
- Large dummy vs real gap
- Many "no results" tests

## Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Low dummy pass rate | Logic problems | Fix RAG pipeline/prompts |
| Low real pass rate | Data gaps | Add more opportunities |
| Dummy >> Real | Coverage issues | Expand database |
| Generic responses | Profile unused | Fix prompt template |
| Wrong types | Filtering issues | Fix smart filter logic |
| No results | Missing data | Add opportunities |

## Quick Actions

**If pass rate < 60%:**
1. Review detailed report
2. Identify top 3 issues
3. Implement fixes
4. Re-run tests

**If data gaps found:**
1. Check which personas have no results
2. Add opportunities for those profiles
3. Verify opportunity metadata
4. Re-run real data tests

**Before deployment:**
1. Run full test suite
2. Verify pass rate ≥ 70% (dummy) and ≥ 60% (real)
3. Check no critical failures
4. Review performance metrics

## When to Run

🔄 After RAG pipeline changes  
🔄 After prompt modifications  
🔄 After database updates  
🔄 Before production deployments  
🔄 Weekly regression testing

## Support

📖 Full docs: `test/README.md`  
📄 Implementation details: `test/IMPLEMENTATION_SUMMARY.md`  
🐛 Issues: Check server logs + test reports  
💬 Questions: Review generated recommendations in reports

---

**Quick Test**: `node test/run-all-tests.js`  
**Reports Location**: `test-results/`  
**Expected Duration**: 20-30 minutes
