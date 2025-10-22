# How the RAG System Currently Works

## Overview
When you ask the chatbot for opportunities, here's the step-by-step process:

---

## Step 1: Intent Detection
**File**: `src/routes/chat.js` (lines 264-269)

```javascript
const requestingOpportunities = await isAskingForOpportunities(trimmedMessage);
```

**What happens:**
- The system uses AI to determine if you're asking for opportunities or just chatting
- If you say "Jobs near me" → `requestingOpportunities = true`
- If you say "Hello" → `requestingOpportunities = false`

**Problem**: This doesn't distinguish between "I want jobs" vs "I want training"

---

## Step 2: Build Retrieval Query
**File**: `src/routes/chat.js` (lines 278-283)

```javascript
const retrievalQueryParts = [trimmedMessage];
if (profileSummary) {
  retrievalQueryParts.push(`Profile summary:\n${profileSummary}`);
}
const retrievalQuery = retrievalQueryParts.join('\n\n');
```

**What happens:**
- Takes your message: "Jobs near me"
- Adds your profile summary: "Profile: Skills: Cleaning, Cooking, Driving. Interests: Earn Money, Part-time Jobs"
- Combines them into one big query

**Example Combined Query:**
```
Jobs near me

Profile summary:
Skills: Cleaning, Cooking, Driving
Interests: Earn Money, Part-time Jobs
```

---

## Step 3: Call RAG Retrieval
**File**: `src/routes/chat.js` (lines 287-292)

```javascript
retrievedOpportunities = await retrieveOpportunities(retrievalQuery, {
  topK: MAX_OPPORTUNITIES,        // Usually 5
  minScore: 0.05,                 // Minimum relevance score
  userProfile: mergedProfile,     // Your full profile
});
```

**What's passed:**
- `query`: Your message + profile summary (combined)
- `topK`: 5 results
- `minScore`: 0.05 (only show results with score ≥ 0.05)
- `userProfile`: Your full profile object with skills, interests, location, etc.

---

## Step 4: RAG Scoring Process
**File**: `src/utils/rag.js`

### 4A: Tokenization
```javascript
const queryTokens = tokenize(query);
// "Jobs near me" → ["jobs", "near"]  ("me" is removed, too short)
```

**What happens:**
- Converts to lowercase
- Removes punctuation
- Splits into words
- Removes words ≤ 2 characters

### 4B: Semantic Matching (TF-IDF + Cosine Similarity)
```javascript
const semanticScore = cosineSimilarity(queryTFIDF, docTFIDF);
```

**What happens:**
- Compares query words ["jobs", "near"] with each opportunity's text
- "Digital Marketing Course" has words: ["digital", "marketing", "course", "social", "media", ...]
- Calculates similarity: 0-1 (0 = no match, 1 = perfect match)

**Example Semantic Scores:**
- "Sales Assistant" (has "sales", not "job") → 0.15
- "Digital Marketing Course" (no matching words) → 0.08
- "SALESPERSON" (has "sales") → 0.12

### 4C: Profile Boost Calculation
```javascript
const preferenceBoost = calculatePreferenceBoost(opp, userProfile);
```

**How it works:**
1. Start with boost = 1.0
2. **Location Match**: +0.3 if opportunity location matches your location
3. **Skills/Interests Match**: +0.2 for EACH skill/interest found in opportunity text
4. **Type Preference**: +0.15 if opportunity type matches your preferred types
5. **Recency**: +0.1 if posted <7 days ago, +0.05 if <30 days ago

**Example with your profile:**
```javascript
// Profile: Skills: [Cleaning, Cooking, Driving], Interests: [Earn Money, Part-time Jobs]

// Opportunity: "Sales Assistant"
boost = 1.0
+ 0.0 (location not matched)
+ 0.0 (no skills/interests in text)
+ 0.1 (posted Oct 20, recent)
= 1.1

// Opportunity: "Digital Marketing Course" 
boost = 1.0
+ 0.0 (location not matched)
+ 0.0 (no skills/interests in text)
+ 0.0 (not recent, Sept 26)
= 1.0

// Opportunity: "SALESPERSON"
boost = 1.0
+ 0.0 (location not matched)
+ 0.0 (no skills/interests in text)
+ 0.1 (posted Oct 15, recent)
= 1.1
```

**THE PROBLEM**: Your skills (Cleaning, Cooking, Driving) don't appear in opportunity text!
- "Sales Assistant" doesn't mention cleaning/cooking/driving
- "Digital Marketing" doesn't mention cleaning/cooking/driving
- So NO profile boost happens!

### 4D: Query-Type Alignment Boost
```javascript
let typeAlignmentBoost = 1.0;
if (query.includes('training') && opp.type === 'training') {
  typeAlignmentBoost = 2.0;
} else if (query.includes('job') && opp.type === 'job') {
  typeAlignmentBoost = 1.3;
}
```

**What happens:**
- If you say "training" → Training opportunities get 2x boost
- If you say "job" or "position" → Job opportunities get 1.3x boost

**Example with "Jobs near me":**
- "Sales Assistant" (Job) → 1.3x boost ✓
- "Digital Marketing Course" (Training) → 1.0x boost (no boost)
- "SALESPERSON" (Job) → 1.3x boost ✓

### 4E: Final Score Calculation
```javascript
finalScore = semanticScore * preferenceBoost * typeAlignmentBoost;
```

**Example Calculations:**
```
"Sales Assistant" (Job):
= 0.15 (semantic) × 1.1 (profile) × 1.3 (type)
= 0.2145

"Digital Marketing Course" (Training):
= 0.08 (semantic) × 1.0 (profile) × 1.0 (type)
= 0.08

"SALESPERSON" (Job):
= 0.12 (semantic) × 1.1 (profile) × 1.3 (type)
= 0.1716
```

---

## Step 5: Sort and Filter
```javascript
const rankedOpportunities = scoredOpportunities
  .filter(opp => opp.score >= minScore)  // Remove scores < 0.05
  .sort((a, b) => b.score - a.score)      // Sort highest first
  .slice(0, topK);                         // Take top 5
```

**Final Ranking:**
1. Sales Assistant (0.2145) ✓
2. SALESPERSON (0.1716) ✓
3. Digital Marketing Course (0.08) ✓

---

## Why You Got These Results

### Problem 1: Profile Skills Not Matching
**Issue**: Your skills (Cleaning, Cooking, Driving) don't appear in opportunity titles/descriptions

**Example:**
- "Sales Assistant" text: "Full-time sales position in a busy retail store..."
  - No mention of "cleaning", "cooking", or "driving"
  - NO profile boost!

**Why this happens:**
- The system searches for exact word matches
- "Cleaning" skill doesn't match "Clean Store" job (different word form)
- "Cooking" doesn't match "Chef" or "Kitchen Staff"
- "Driving" doesn't match "Driver" (singular vs plural)

### Problem 2: Training Appeared When You Asked for "Jobs"
**Issue**: "Digital Marketing Course" (Training) appeared even though you said "Jobs near me"

**Why this happened:**
- Query-type boost: Jobs get 1.3x, Training gets 1.0x
- But if Training has HIGH semantic score, it can still beat Jobs with LOW semantic scores

**Example:**
```
Job with low match:
= 0.05 × 1.1 × 1.3 = 0.0715

Training with decent match:
= 0.08 × 1.0 × 1.0 = 0.08  ← Higher score!
```

### Problem 3: Generic Results
**Issue**: Getting opportunities that don't match your profile at all

**Root causes:**
1. **Semantic matching is weak**: "Jobs near me" has only 2 useful words ["jobs", "near"]
2. **Profile boost doesn't work**: Your skills don't appear in opportunity text
3. **minScore is too low**: 0.05 threshold allows weak matches through
4. **No explicit filtering**: System doesn't filter by type (only boosts)

---

## Current Scoring Formula Summary

```
FINAL SCORE = semanticScore × preferenceBoost × typeAlignmentBoost

Where:
semanticScore = How well query words match opportunity text (0-1)
preferenceBoost = 1.0 + location(0.3) + skills/interests(0.2 each) + type(0.15) + recency(0.1)
typeAlignmentBoost = 2.0 for training/internship/scholarship, 1.3 for jobs
```

---

## Why It's Not Working Well for You

### 1. Word Mismatch Problem
- **Your Skills**: Cleaning, Cooking, Driving
- **Opportunity Text**: Rarely uses these exact words
- **Result**: No profile boost

### 2. Query Too Generic
- **Your Query**: "Jobs near me"
- **Tokens**: ["jobs", "near"]
- **Result**: Matches everything with "job" or "near"

### 3. Type Not Strictly Filtered
- **Your Request**: "Jobs"
- **System Behavior**: Boosts Jobs 1.3x, but doesn't exclude Training
- **Result**: High-scoring Training can beat low-scoring Jobs

### 4. Location Not Used
- **Your Query**: "near me"
- **System**: Doesn't know WHERE "me" is (no location in profile)
- **Result**: Returns opportunities from anywhere

---

## What We Need to Fix

### Fix 1: Better Skill Matching
- Use synonyms: "Cooking" → "Chef", "Kitchen", "Food Preparation"
- Use stemming: "Driving" → "Driver", "Drive", "Drivers"
- Expand profile terms before matching

### Fix 2: Strict Type Filtering
- When user says "jobs" → Set `filterTypes: ['Job']` to EXCLUDE Training
- When user says "training" → Set `filterTypes: ['Training']` to EXCLUDE Jobs

### Fix 3: Extract Location from Query
- "Jobs near me" → Use user's profile location if available
- "Jobs in Windhoek" → Set `filterLocation: 'Windhoek'`

### Fix 4: Boost Profile Match More Aggressively
- Increase profile boost from +0.2 to +0.5 per skill/interest match
- Or use base scoring when profile matches strongly

---

## Next Steps

Would you like me to:
1. **Fix the type filtering** so "Jobs" requests NEVER return Training?
2. **Improve skill matching** with synonyms and word variations?
3. **Extract location** from queries like "near me" or "in Windhoek"?
4. **Strengthen profile boost** so your skills matter more?

Let me know which fixes you want first!
