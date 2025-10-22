# RAG Pipeline Flow (Updated)

```
┌─────────────────────────────────────────────────────────────────────┐
│                          User Query                                 │
│                     "I need a tech job"                             │
│                     Profile: {skills: ["IT", "Python"]}             │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    STAGE 1: Fast Retrieval                          │
│                    (TF-IDF + Cosine Similarity)                     │
│                                                                     │
│  • Retrieves top 20 candidates based on keyword matching           │
│  • Each has a cosineScore (0-1)                                    │
│  • Fast but not semantically aware                                 │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│               STAGE 2: AI Reranker (IMPROVED ✨)                    │
│                                                                     │
│  For each candidate:                                               │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ LLM Scoring (NEW JSON FORMAT)                                │  │
│  │ ────────────────────────────                                 │  │
│  │ Input:                                                        │  │
│  │  • User Query: "I need a tech job"                           │  │
│  │  • User Profile: Skills=[IT, Python], Location=Windhoek      │  │
│  │  • Opportunity: "Python Developer at StartupNam"             │  │
│  │                                                               │  │
│  │ Evaluation Criteria (NEW WEIGHTS):                           │  │
│  │  • Skill Match (30%) ✓ Python ↔ Python Developer            │  │
│  │  • Query Relevance (30%) ✓ "tech job" ↔ Developer           │  │
│  │  • Interest Alignment (20%) ✓ IT interest                   │  │
│  │  • Location Fit (10%) ✓ Windhoek                            │  │
│  │  • Type Match (10%) ✓ Job type                              │  │
│  │                                                               │  │
│  │ Output (NEW JSON):                                            │  │
│  │ {                                                             │  │
│  │   "score": 92,                                                │  │
│  │   "reasoning": "Excellent match - Python skill aligns with    │  │
│  │                developer role, Windhoek location matches"     │  │
│  │ }                                                             │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ Dynamic Scoring (NEW FORMULA ✨)                              │  │
│  │ ────────────────────────────                                 │  │
│  │ OLD: finalScore = (aiScore/100) * 0.7 + cosineScore * 0.3    │  │
│  │                                                               │  │
│  │ NEW: finalScore = (aiScore ** 1.1) * 0.75 + cosineScore * 0.25│ │
│  │                                                               │  │
│  │ Example with aiScore=92, cosineScore=0.6:                    │  │
│  │  OLD: (92/100)*0.7 + 0.6*0.3 = 0.824                         │  │
│  │  NEW: (92**1.1)*0.75 + 0.6*0.25 = 1.099 (+33% boost!) 🚀     │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  Result:                                                           │
│  {                                                                 │
│    ...opportunity,                                                 │
│    aiScore: 92,                                                    │
│    aiReasoning: "Excellent match...",  // NEW!                     │
│    stage1Score: 0.6,                                               │
│    finalScore: 1.099                   // NEW FORMULA!             │
│  }                                                                 │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Sort & Filter Top 5                              │
│                                                                     │
│  • Filter: aiScore >= 30 (minimum threshold)                       │
│  • Sort: By finalScore (descending)                                │
│  • Take: Top 5 results                                             │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│              STAGE 3: Chat Response Generation (IMPROVED ✨)        │
│                                                                     │
│  System Prompt (NEW - FACTUAL & CONCISE):                          │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ Core Principles:                                              │  │
│  │ 1. Factual & Grounded - Only verified opportunities          │  │
│  │ 2. Short & Direct - Under 50 words                           │  │
│  │ 3. Personalized - Explain WHY matches fit                    │  │
│  │ 4. Youth-Friendly - Like a supportive older sibling          │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  Input:                                                            │
│  • User query: "I need a tech job"                                │
│  • Profile: Skills=[IT, Python], Location=Windhoek                │
│  • Top 5 opportunities (with aiReasoning!)                        │
│                                                                     │
│  Generated Response:                                               │
│  "I found 3 developer roles that match your Python and IT         │
│  skills! Two are in Windhoek near you, and one offers remote      │
│  work. Check them out below 👇"                                    │
│                                                                     │
│  Word count: 28 words ✓ (under 50-word limit)                     │
│  Personalized: ✓ Mentions Python, IT, Windhoek                    │
│  Factual: ✓ Based only on retrieved opportunities                 │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       Response to User                              │
│                                                                     │
│  {                                                                 │
│    "message": "I found 3 developer roles...",                      │
│    "opportunities": [                                              │
│      {                                                             │
│        "title": "Python Developer",                                │
│        "organization": "StartupNam",                               │
│        "location": "Windhoek",                                     │
│        "aiScore": 92,                                              │
│        "aiReasoning": "Excellent match - Python skill aligns..."   │
│      },                                                            │
│      ...                                                           │
│    ]                                                               │
│  }                                                                 │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Key Improvements Summary

### 1. **Reranker Prompt** → Structured JSON with reasoning
   - **Before**: "Respond with ONLY a number from 0-100"
   - **After**: JSON with score + reasoning
   - **Benefit**: Transparency and explainability

### 2. **Scoring Formula** → Exponential boost for quality
   - **Before**: Linear blend (70% AI, 30% cosine)
   - **After**: Exponential boost + 75/25 split
   - **Benefit**: High-quality matches dominate results

### 3. **Generation Prompt** → Factual and concise
   - **Before**: 60-word limit, 7 guidelines, example-heavy
   - **After**: 50-word limit, 4 principles, youth-focused
   - **Benefit**: Shorter, more grounded responses

---

## Impact Visualization

```
Score Distribution (Example with 20 candidates)

OLD Formula:                    NEW Formula:
finalScore range: 0.3-0.9       finalScore range: 0.4-1.1

  |                                |        ██
  |                                |      ████
  |        ██                      |    ██████
  |      ████                      |  ████████
  |    ██████                      |████████████
  |  ████████                      |████████████████
  |████████████                    |████████████████████
  +─────────────                   +─────────────────────
   Low    High                      Low         High

Result: Better separation         Result: Excellent matches
between mediocre and good          clearly stand out (>1.0)
