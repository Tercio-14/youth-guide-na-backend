# RAG System Fix: Example Opportunities Bias

## Problem Identified

User reported getting the same opportunities repeatedly. Investigation revealed:

### Root Cause
**Example opportunities were dominating search results** due to:

1. **Generic, keyword-rich content**: Example opportunities had simple descriptions like "Junior Software Developer - We are looking for a junior developer..." which matched common search terms perfectly

2. **TF-IDF scoring bias**: Generic words like "job", "looking", "developer", "training" scored very high in example opportunities but didn't appear in real opportunities

3. **Real opportunity descriptions are sparse**: Real opportunities from JobsInNamibia have minimal descriptions:
   - Example: `"Category: officer. Closing date: 2025-10-20."`
   - Searchable text is mostly just the title

4. **Percentage in database**:
   - Example opportunities: 7/108 (6.5%)
   - Real opportunities: 101/108 (93.5%)
   - But example opportunities were appearing in 50-100% of search results

## Debug Results (Before Fix)

| Query | Example% | Real% |
|-------|----------|-------|
| "looking for a job" | 100% | 0% |
| "software developer programming IT" | 100% | 0% |
| "security guard job" | 100% | 0% |
| "I want training programs" | 57% | 43% |
| "bank jobs finance accounting" | 0% | 100% |
| "sales retail assistant" | 17% | 83% |

**Average**: Example opportunities appeared in 62% of results despite being only 6.5% of database!

## Solution Applied

### 1. Filter Out Example Opportunities
**File**: `src/utils/rag.js` - `loadOpportunities()` function

```javascript
// Filter out example/test opportunities
// Example opportunities have generic descriptions that score too high
const allOpportunities = parsed.opportunities || [];
opportunitiesCache = allOpportunities.filter(opp => 
  opp.source !== 'Example Website'
);
```

**Impact**: Example opportunities are now completely excluded from search results.

### 2. Handle Generic Queries Better
**File**: `src/utils/rag.js` - `retrieveOpportunities()` function

Added logic to detect generic queries like "looking for a job" or "find me opportunities":

```javascript
const genericQueryTerms = ['looking', 'find', 'want', 'need', 'search', 'searching'];
const typeTerms = ['job', 'jobs', 'training', 'internship', 'scholarship', 'opportunity', 'opportunities'];

const isVeryGenericQuery = hasGenericTerm && hasTypeTerm && queryTokens.length <= 5;
```

For generic queries:
- Returns diverse sample based on **recency** and **user profile**
- Prevents returning 0 results when user just says "find me jobs"
- Scores based on:
  - Posted < 7 days ago: score = 0.20
  - Posted < 30 days ago: score = 0.15
  - Posted < 90 days ago: score = 0.10
  - Older: score = 0.05
- Applies profile boost if available

## Results After Fix

| Query | Example% | Real% | Results |
|-------|----------|-------|---------|
| "looking for a job" | 0% | 100% | 10 ✅ |
| "software developer programming IT" | 0% | 100% | 0 ⚠️ |
| "I want training programs" | 0% | 100% | 10 ✅ |
| "security guard job" | 0% | 100% | 0 ⚠️ |
| "find me opportunities" | 0% | 100% | 10 ✅ |
| "bank jobs finance accounting" | 0% | 100% | 9 ✅ |
| "sales retail assistant" | 0% | 100% | 5 ✅ |

**Success**: 0% example opportunities in all results!

## Remaining Issues

### Zero Results for Specific Queries

Queries like "software developer" and "security guard" return 0 results because:

1. **No exact matches in database**:
   - Database has "IT PROJECT MANAGER" but not "software developer"
   - Database has no "security guard" positions

2. **Minimal word overlap**:
   - "software developer programming IT" vs "IT PROJECT MANAGER – DRA Projects"
   - Only shared word: "IT" (too minimal for cosine similarity threshold)

### Possible Solutions

**Option A: Query Expansion** (Recommended)
- Expand "software developer" → "software, developer, IT, tech, programming, computer"
- Expand "security guard" → "security, guard, protection, safety, watchman"
- Use synonyms and related terms

**Option B: Semantic Embeddings**
- Replace TF-IDF with sentence embeddings (e.g., all-MiniLM-L6-v2)
- Would understand "software developer" ≈ "IT Project Manager"
- More computational cost

**Option C: Hybrid RAG with lower Stage 1 threshold**
- Let AI reranker in Stage 2 find semantic matches
- Stage 1 just needs to pass through candidates
- Already partially implemented

**Option D: Fallback to Generic Search**
- If specific query returns 0 results, fallback to returning recent opportunities of that type
- E.g., "software developer" → return recent "Job" type opportunities

## Recommendations

### Immediate (Done ✅)
1. ✅ Filter out example opportunities
2. ✅ Handle generic queries with recency-based sampling
3. ✅ Add debug logging for low result counts

### Short-term (To Do)
1. ❌ Implement query expansion for common job titles
2. ❌ Add fallback logic: if results < 3, broaden search
3. ❌ Improve opportunity descriptions during scraping

### Long-term (Future)
1. ❌ Migrate from TF-IDF to semantic embeddings
2. ❌ Add user feedback loop to improve ranking
3. ❌ Implement opportunity categorization/tagging

## Testing

Run debug tests:
```bash
node test/debug-rag-results.js
```

Expected output:
- **No example opportunities** in any results
- **Generic queries** return 5-10 results
- **Specific queries** may return fewer results but should be relevant
- **User sees variety** instead of same 7 examples repeatedly

## Deployment Notes

- ✅ No database migration needed (filter happens at load time)
- ✅ Backend server will automatically reload updated code
- ✅ Cache TTL is 5 minutes, so changes take effect quickly
- ✅ Backward compatible (no API changes)
- ⚠️ Users may notice different results (this is the fix!)

## Monitoring

Watch for:
- Queries returning 0 results (check logs for warnings)
- User feedback about result quality
- Performance impact of generic query handling

Log messages to look for:
```
[RAG] Loaded opportunities from file
  total: 108
  count: 101
  filtered: 7  # Example opportunities filtered out
```

```
[RAG] Detected generic query, using random sampling approach
  query: "looking for a job"
```

```
[RAG] Low result count, consider lowering minScore
  results: 0
  minScore: 0.01
```

## Success Metrics

Before Fix:
- Example opportunities in 62% of results
- Users seeing same 7 opportunities repeatedly
- Low diversity in recommendations

After Fix:
- Example opportunities in 0% of results ✅
- 101 real opportunities available
- Higher diversity in recommendations ✅
- Generic queries return recent opportunities ✅

## Edge Cases

1. **Brand new database** (all opportunities recent)
   - Generic query will return 10 most recent
   - Works as expected

2. **Very specific query with no matches**
   - Returns 0 results
   - Future fix: fallback to broader search

3. **User profile with skills not in database**
   - Profile boost won't help
   - Still returns recency-based results for generic queries

4. **Multiple users querying simultaneously**
   - Cache shared across requests (by design)
   - 5-minute TTL ensures fresh data

## Conclusion

**Problem solved**: Example opportunities no longer dominate search results.

**User experience improved**: Real, diverse opportunities from JobsInNamibia and NIEIS are now shown.

**Remaining work**: Improve handling of specific queries that match no opportunities (query expansion or fallback logic).
