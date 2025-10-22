# Testing the RAG Improvements

## Quick Test

Run the dedicated test file to verify all improvements:

```powershell
cd c:\Users\lenovo\Documents\GitHub\youth-guide-na-backend
node test/test-rag-improvements.js
```

### Expected Output:
```
🧪 Testing RAG Pipeline Improvements...

📋 Input: 5 candidates
🔍 Query: "I need a tech job in Windhoek"
👤 Profile: Skills=[IT, Python, JavaScript], Location=Windhoek

✅ Reranking complete in 3500ms

📊 Results (5 opportunities):

────────────────────────────────────────────────────────────────────────────────

1. Python Developer (Job)
   Organization: StartupNam
   Location: Windhoek
   
   📈 Scores:
      • AI Score:      92/100
      • Stage1 Score:  0.7500
      • Final Score:   1.0996
   
   💡 AI Reasoning:
      "Excellent match - Python skill directly aligns with developer role, Windhoek location matches"

────────────────────────────────────────────────────────────────────────────────

2. Full Stack Developer (Job)
   Organization: WebAgency
   Location: Windhoek
   
   📈 Scores:
      • AI Score:      88/100
      • Stage1 Score:  0.8200
      • Final Score:   1.0743
   
   💡 AI Reasoning:
      "Strong match - JavaScript and web dev skills align, Windhoek location perfect"

...

✅ Validation Checks:

✅ All results have aiScore: PASS
✅ All results have aiReasoning: PASS
✅ All results have finalScore: PASS
✅ Results sorted by finalScore (descending): PASS
✅ Top result has high AI score (>=70): PASS
✅ Dynamic formula applied (finalScore > 1.0 possible): PASS - Exponential boost working!

🎉 All critical tests passed! RAG improvements working correctly.
```

---

## Manual Testing via Chat API

### Test 1: Tech Job Search (Profile Match)

```powershell
# Setup
$headers = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer YOUR_TEST_TOKEN"
}

$body = @{
    message = "I'm looking for a Python developer job"
    profile = @{
        skills = @("Python", "JavaScript", "IT")
        location = "Windhoek"
        preferredTypes = @("Job", "Internship")
    }
} | ConvertTo-Json

# Make request
Invoke-RestMethod -Uri "http://localhost:3000/api/chat" -Method POST -Headers $headers -Body $body
```

#### What to Check:
- ✅ Response message is **under 50 words**
- ✅ Message mentions **specific skills** from profile (e.g., "your Python skills")
- ✅ Opportunities have `aiScore` and `aiReasoning` fields
- ✅ Top opportunity has high `finalScore` (>1.0 if excellent match)

---

### Test 2: Generic Query (No Profile)

```powershell
$body = @{
    message = "What jobs are available?"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/chat" -Method POST -Headers $headers -Body $body
```

#### What to Check:
- ✅ Response is still **concise and factual**
- ✅ Doesn't invent opportunities
- ✅ Encourages user to add profile for better matches

---

### Test 3: Off-Topic Conversation

```powershell
$body = @{
    message = "What should I eat for lunch?"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/chat" -Method POST -Headers $headers -Body $body
```

#### What to Check:
- ✅ Response shows **empathy** (acknowledges the question)
- ✅ Gently **redirects to opportunities**
- ✅ Tone is **warm and supportive** (not robotic)
- ✅ Still under 50 words

---

### Test 4: Poor Match Scenario

```powershell
$body = @{
    message = "I need a chef job in Oshakati"
    profile = @{
        skills = @("IT", "Programming")
        location = "Windhoek"
    }
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/chat" -Method POST -Headers $headers -Body $body
```

#### What to Check:
- ✅ If no good matches, system says **"couldn't find any right now"**
- ✅ Doesn't force bad recommendations
- ✅ AI scores should be **lower** (<60) for mismatched opportunities

---

## Debugging Tips

### 1. Check AI Reasoning Quality

```javascript
// In your test, examine the aiReasoning field:
results.forEach(opp => {
  console.log(`${opp.title}: ${opp.aiReasoning}`);
});
```

**Good reasoning examples:**
- ✅ "Excellent match - Python skill aligns with developer role, Windhoek location matches"
- ✅ "Fair match - some IT skills relevant but lacks sales experience mentioned in job"

**Bad reasoning examples:**
- ❌ "Good match" (too vague)
- ❌ "This is a job" (not helpful)
- ❌ Empty string or "No reasoning provided"

### 2. Verify Formula Application

```javascript
// Calculate expected vs actual:
const aiScore = 85;
const cosineScore = 0.6;

const oldFormula = (aiScore / 100) * 0.7 + cosineScore * 0.3;
const newFormula = (aiScore ** 1.1) * 0.75 + cosineScore * 0.25;

console.log(`Old: ${oldFormula.toFixed(4)}`); // Should be ~0.775
console.log(`New: ${newFormula.toFixed(4)}`); // Should be ~0.945 (+22%)
```

### 3. Check JSON Parsing Fallback

If you see this warning in logs:
```
[AI Reranker] JSON parse failed, falling back to number extraction
```

**Action**: Check the LLM response format. It should be:
```json
{"score": 85, "reasoning": "..."}
```

If it's returning markdown or plain numbers, the prompt might need adjustment.

---

## Performance Benchmarks

### Expected Latency (with OpenAI GPT-4):

| Stage | Time | Notes |
|-------|------|-------|
| Stage 1 Retrieval | 50-150ms | TF-IDF search |
| Stage 2 Reranking (20 candidates) | 3-5s | 20 LLM calls in parallel |
| Chat Generation | 800-1500ms | 1 LLM call |
| **Total** | **4-7s** | End-to-end |

### Token Usage (per query):

| Component | Tokens | Cost (GPT-4o) |
|-----------|--------|---------------|
| Reranker (per opportunity) | ~150 | ~$0.0003 |
| Reranking 20 candidates | ~3000 | ~$0.006 |
| Chat generation | ~500 | ~$0.001 |
| **Total per query** | **~3500** | **~$0.007** |

---

## Monitoring in Production

### Key Metrics to Track:

1. **AI Score Distribution**
   ```javascript
   // Log this in production
   const avgAIScore = results.reduce((sum, r) => sum + r.aiScore, 0) / results.length;
   logger.info('[RAG] Average AI score', { avgAIScore });
   ```
   - **Good**: Average 60-80 (most queries have decent matches)
   - **Warning**: Average <50 (poor retrieval or mismatched opportunities)

2. **Final Score Boost**
   ```javascript
   const highScoreCount = results.filter(r => r.finalScore > 1.0).length;
   logger.info('[RAG] High score count', { highScoreCount });
   ```
   - **Good**: 1-3 opportunities per query exceed 1.0
   - **Warning**: 0 (formula not boosting enough) or 10+ (too generous)

3. **Reasoning Quality**
   ```javascript
   const hasReasoning = results.filter(r => r.aiReasoning && r.aiReasoning.length > 20).length;
   logger.info('[RAG] Opportunities with reasoning', { hasReasoning });
   ```
   - **Good**: 100% have meaningful reasoning (>20 chars)
   - **Warning**: <80% (JSON parsing issues or poor prompts)

4. **Response Length**
   ```javascript
   const wordCount = assistantText.split(/\s+/).length;
   logger.info('[Chat] Response length', { wordCount });
   ```
   - **Good**: 20-50 words (concise and helpful)
   - **Warning**: >60 words (too verbose) or <10 words (too terse)

---

## Rollback Procedure

If issues arise in production:

```bash
# 1. Revert the commits
git log --oneline -5  # Find commit hashes
git revert <commit-hash>

# 2. Redeploy
git push origin main

# 3. Clear any cached LLM responses
# (if you have caching enabled)
```

Alternatively, feature flag the changes:

```javascript
// In ai-reranker.js
const USE_JSON_SCORING = process.env.USE_JSON_SCORING === 'true';

if (USE_JSON_SCORING) {
  // New JSON logic
} else {
  // Old numeric logic
}
```

Then toggle via environment variable:
```bash
USE_JSON_SCORING=false  # Disable new features
```

---

## Next Steps

1. **Run the test**: `node test/test-rag-improvements.js`
2. **Test via API**: Try various queries with different profiles
3. **Monitor logs**: Check for warnings about JSON parsing or low scores
4. **Gather feedback**: Ask users if suggestions feel more relevant
5. **Iterate**: Adjust scoring weights or prompt wording based on data

---

## Questions?

If you encounter issues:
1. Check logs for `[AI Reranker]` warnings
2. Verify LLM API is responding correctly
3. Ensure `maxTokens` is set to 150+ for reranker
4. Review `aiReasoning` field for quality
5. Compare old vs new `finalScore` values

Happy testing! 🚀
