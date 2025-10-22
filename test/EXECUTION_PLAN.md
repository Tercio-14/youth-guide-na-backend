# Test Execution Plan

## Pre-Execution Checklist

### 1. Environment Setup ✓
- [x] Backend code is ready
- [x] Test framework implemented
- [x] Test data created
- [ ] Backend server is running
- [ ] Firebase is configured
- [ ] API endpoint is accessible

### 2. Server Status Check

```bash
# IMPORTANT: Start backend server with authentication disabled
cd youth-guide-na-backend

# Windows (PowerShell)
$env:DISABLE_AUTH_FOR_TESTING="true"; npm run dev

# Unix/Mac/Linux
DISABLE_AUTH_FOR_TESTING=true npm run dev

# Or add DISABLE_AUTH_FOR_TESTING=true to .env file and run:
npm run dev
```

**Verify server is running** (in another terminal):
```bash
curl http://localhost:3001/health
curl http://localhost:3001/api
```

Expected responses:
- `/health`: `{"status":"ok"}`
- `/api`: Should return API info

⚠️ **Important**: The `DISABLE_AUTH_FOR_TESTING=true` environment variable bypasses authentication for testing purposes. Never use this in production!

### 3. Verify Test Files

```bash
cd youth-guide-na-backend/test

# Verify all test files exist
ls -la
# Should see:
# - chatbot-test-framework.js
# - dummy-opportunities.json
# - run-dummy-data-tests.js
# - run-real-data-tests.js
# - run-all-tests.js
# - cleanup-test-results.js
# - README.md
# - IMPLEMENTATION_SUMMARY.md
# - QUICK_REFERENCE.md
```

## Execution Steps

### Step 1: Initial Test Run

```bash
# Navigate to test directory
cd youth-guide-na-backend/test

# Run comprehensive test suite
node run-all-tests.js
```

**What to Expect:**
- Console output showing progress
- "PASS 1: DUMMY DATA TESTS" section (~10-15 min)
- "PASS 2: REAL DATA TESTS" section (~10-15 min)
- Final summary with report locations
- Total time: ~20-30 minutes

**Monitor Progress:**
- Watch for test completion messages
- Note any errors or failures
- Check that data swap/restore happens correctly

### Step 2: Review Reports

```bash
# Navigate to results directory
cd test-results

# List generated reports (Windows)
dir /o-d

# List generated reports (Unix/Mac)
ls -lt

# View latest summary report
# Look for: comprehensive-test-summary-[timestamp].md
```

**What to Look For:**
1. **Pass Rates**
   - Dummy data pass rate
   - Real data pass rate
   - Difference between them

2. **Key Metrics**
   - Total tests passed/failed
   - Pass rate by persona
   - Pass rate by query category

3. **Issues Identified**
   - Data gaps
   - Logic problems
   - Performance issues

### Step 3: Analyze Results

#### If Pass Rate ≥ 70% (Both Passes)
✅ **EXCELLENT** - Chatbot is performing well

**Actions:**
- Document baseline metrics
- Set up weekly regression tests
- Monitor performance trends

#### If Pass Rate 60-70%
⚠️ **ACCEPTABLE** - Room for improvement

**Actions:**
1. Review detailed reports for patterns
2. Identify top 3-5 issues
3. Create improvement plan
4. Schedule fixes
5. Re-test after fixes

#### If Pass Rate < 60%
❌ **CRITICAL** - Immediate action required

**Actions:**
1. **STOP** - Do not deploy to production
2. Review all failed tests
3. Categorize issues:
   - Data gaps (missing opportunities)
   - Logic problems (RAG pipeline)
   - Quality issues (prompts, filtering)
4. Prioritize critical fixes
5. Implement fixes
6. Re-run tests
7. Repeat until pass rate ≥ 60%

### Step 4: Address Issues

#### For Data Gaps

```bash
# Check current opportunity count
cd youth-guide-na-backend
node -e "console.log(require('./data/opportunities.json').length)"

# Review opportunities by type/sector
# Add missing opportunities
# Re-run real data tests
node test/run-real-data-tests.js
```

**Focus Areas:**
- Service sector (childcare, cleaning, domestic)
- Entry-level positions
- Rural opportunities
- Training programs
- Opportunities for school leavers

#### For Logic Problems

**Files to Review:**
- `src/routes/chat.js` - Main chat endpoint
- `src/utils/rag-pipeline.js` - RAG logic
- `src/utils/intent-detection.js` - Intent classifier
- `src/utils/smart-filter.js` - Opportunity filtering

**Common Fixes:**
- Adjust intent detection thresholds
- Improve AI reranking prompt
- Enhance smart filtering logic
- Update poor match detection threshold

#### For Quality Issues

**Files to Review:**
- Chat generation prompts
- Response templates
- System instructions

**Common Fixes:**
- Make responses more concise
- Better profile integration
- Improve tone for different query types
- Add more context to prompts

### Step 5: Re-Test After Fixes

```bash
# Run full test suite again
node test/run-all-tests.js

# Or run specific pass if only one area fixed
node test/run-dummy-data-tests.js  # If logic fixed
node test/run-real-data-tests.js   # If data added
```

**Compare Results:**
- Check if pass rate improved
- Verify specific issues were resolved
- Look for any new issues introduced

### Step 6: Document Results

Create a summary document:

```markdown
# Test Results - [Date]

## Initial Test
- Dummy Pass Rate: X%
- Real Pass Rate: Y%
- Key Issues: [list]

## Fixes Implemented
1. [Fix 1]
2. [Fix 2]
3. [Fix 3]

## After Fixes
- Dummy Pass Rate: X%
- Real Pass Rate: Y%
- Improvement: +Z%

## Remaining Issues
- [Issue 1]
- [Issue 2]

## Next Steps
- [Action 1]
- [Action 2]
```

## Ongoing Maintenance

### Weekly Regression Tests

```bash
# Schedule: Every Monday morning
cd youth-guide-na-backend/test
node run-all-tests.js

# Review results
# Document any degradation
# Investigate root causes
```

### Before Deployments

```bash
# Always run tests before deploying
node test/run-all-tests.js

# Verify:
# - Pass rate hasn't degraded
# - No new critical failures
# - Performance is acceptable

# Only deploy if:
# - Dummy pass rate ≥ 70%
# - Real pass rate ≥ 60%
# - No critical failures
```

### After Database Updates

```bash
# After adding/modifying opportunities
node test/run-real-data-tests.js

# Verify:
# - New opportunities are findable
# - Pass rate improved or maintained
# - No regressions
```

### After Code Changes

```bash
# After modifying RAG pipeline, prompts, or filters
node test/run-all-tests.js

# Verify:
# - Changes improved performance
# - No regressions in other areas
# - Pass rate increased or maintained
```

## Troubleshooting

### Tests Won't Start
**Error**: "Cannot connect to server"

**Solution**:
```bash
# Check if server is running
curl http://localhost:3000/health

# If not, start it
cd youth-guide-na-backend
node server.js
```

### All Tests Timeout
**Error**: "Request timeout"

**Possible Causes**:
- Server overloaded
- Database issues
- API rate limiting

**Solutions**:
- Check server logs
- Verify Firebase connection
- Check API rate limits
- Increase delay between tests

### Data Swap Fails
**Error**: "Cannot read/write opportunities.json"

**Solution**:
```bash
# Check file permissions
ls -la data/opportunities.json

# Verify file exists
cat data/opportunities.json | head

# If corrupted, restore from backup
```

### Tests Pass But Results Seem Wrong
**Action**: Manual validation

```bash
# Start server
node server.js

# Test manually with curl
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "find me IT jobs",
    "profile": {
      "skills": ["Programming", "JavaScript"],
      "location": "Windhoek"
    }
  }'

# Compare manual result with test result
```

## Success Metrics

### Target Metrics (3 months)
- Dummy Data Pass Rate: ≥85%
- Real Data Pass Rate: ≥75%
- Average Response Time: <3s
- Variance Between Passes: <10%

### Tracking Template

| Date | Dummy Pass | Real Pass | Issues | Actions Taken |
|------|------------|-----------|--------|---------------|
| 2024-01-01 | 75% | 58% | Data gaps | Added 50 opps |
| 2024-01-08 | 78% | 65% | Filtering | Fixed logic |
| 2024-01-15 | 82% | 72% | - | - |

## Conclusion

This execution plan ensures:
- ✅ Systematic testing approach
- ✅ Clear success criteria
- ✅ Actionable results
- ✅ Continuous improvement
- ✅ Production readiness

**Next Step**: Run `node test/run-all-tests.js` and follow this plan!
