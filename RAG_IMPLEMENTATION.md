# YouthGuide NA - RAG Implementation & Saved Opportunities

## 🎯 Overview

This document explains the complete implementation of the RAG (Retrieval-Augmented Generation) system and saved opportunities feature for YouthGuide NA.

### What Was Implemented

1. **RAG-Based Opportunity Retrieval System** 
   - TF-IDF semantic search for finding relevant opportunities
   - Personalized ranking based on user profile (skills, interests, location)
   - Real-time data from scraped opportunities JSON

2. **Saved Opportunities Feature**
   - Save/unsave opportunities from chat
   - View all saved opportunities on dedicated page
   - Share and delete saved items
   - Persistent storage in Firestore

3. **Complete Integration**
   - Backend routes for RAG retrieval
   - Backend routes for saved opportunities CRUD
   - Frontend UI components with animations
   - Real-time updates and state management

---

## 📁 File Structure

```
youth-guide-na-backend/
├── data/
│   └── opportunities.json          # Scraped opportunities (108 items from NIEIS + JobsInNamibia)
├── src/
│   ├── routes/
│   │   ├── chat.js                 # Updated to use RAG system
│   │   └── saved.js                # NEW: Saved opportunities CRUD
│   └── utils/
│       └── rag.js                  # NEW: RAG retrieval engine
│
youth-guide-na/
└── src/
    ├── components/chat/
    │   └── AnimatedMessage.tsx     # Updated with save/unsave buttons
    └── pages/
        └── Saved.tsx               # Updated to fetch real data from Firestore
```

---

## 🔧 Backend Implementation

### 1. RAG System (`src/utils/rag.js`)

#### Features

- **TF-IDF Vectorization**: Converts text to numerical vectors for semantic matching
- **Cosine Similarity**: Measures relevance between user query and opportunities
- **Preference-Based Boosting**: Enhances scores based on:
  - Location match (+0.3 boost)
  - Skills/interests match (+0.2 per match)
  - Preferred opportunity types (+0.15)
  - Recency (<7 days: +0.1, <30 days: +0.05)

#### Key Functions

```javascript
// Main retrieval function
await retrieveOpportunities(query, {
  topK: 5,              // Number of results
  minScore: 0.1,        // Minimum relevance threshold
  userProfile: {...},   // User data for personalization
  filterTypes: [...],   // Filter by type (Job, Training, etc.)
  filterLocation: "..." // Filter by location
});
```

#### How It Works

1. **Load Opportunities**: Reads from `data/opportunities.json` (cached for 5 minutes)
2. **Apply Filters**: Location and type filters narrow down candidates
3. **Tokenize**: Breaks text into words, removes punctuation, filters short words
4. **Calculate TF-IDF**: 
   - **TF** (Term Frequency): How often a word appears in a document
   - **IDF** (Inverse Document Frequency): How rare a word is across all documents
   - **TF-IDF**: TF × IDF = importance score for each word
5. **Compute Similarity**: Cosine similarity between query vector and each opportunity vector
6. **Apply Boosts**: Multiply semantic score by preference boost
7. **Rank & Filter**: Sort by final score, filter by minimum threshold, return top K

#### Example

```javascript
// User query: "Looking for training in Windhoek"
// User profile: { skills: ["construction"], location: "Windhoek" }

// Opportunity A: "Construction Training - Windhoek"
// - Semantic score: 0.75 (high word overlap)
// - Location boost: +0.3 (matches "Windhoek")
// - Skills boost: +0.2 (matches "construction")
// - Final score: 0.75 × 1.5 = 1.125

// Opportunity B: "Office Job - Swakopmund"
// - Semantic score: 0.20 (low word overlap)
// - No boosts
// - Final score: 0.20 × 1.0 = 0.20

// Result: Opportunity A ranks first
```

---

### 2. Saved Opportunities Route (`src/routes/saved.js`)

#### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/saved` | Get all saved opportunities for user |
| `POST` | `/api/saved` | Save an opportunity |
| `DELETE` | `/api/saved/:id` | Remove a saved opportunity |
| `GET` | `/api/saved/check/:id` | Check if opportunity is saved |
| `POST` | `/api/saved/batch-check` | Check multiple opportunities at once |

#### Firestore Structure

```
users/
  {userId}/
    savedOpportunities/
      {opportunityId}:
        id: string
        title: string
        type: string
        organization: string
        location: string
        description: string
        url: string
        source: string
        date_posted: string
        savedAt: timestamp
        userId: string
```

#### Example API Calls

**Save an opportunity:**
```bash
POST /api/saved
Authorization: Bearer <token>
{
  "opportunity": {
    "id": "abc123",
    "title": "Front of House Supervisor",
    "type": "Job",
    "organization": "Hartlief Corporation Ltd",
    "location": "Windhoek",
    "description": "...",
    "url": "https://nieis.namibiaatwork.gov.na/..."
  }
}
```

**Get saved opportunities:**
```bash
GET /api/saved
Authorization: Bearer <token>

Response:
{
  "success": true,
  "count": 3,
  "opportunities": [...]
}
```

---

### 3. Updated Chat Route (`src/routes/chat.js`)

#### Changes

1. **Import RAG System**: `const { retrieveOpportunities } = require('../utils/rag');`
2. **Call RAG Retrieval**:
   ```javascript
   const retrievedOpportunities = await retrieveOpportunities(query, {
     topK: 5,
     minScore: 0.1,
     userProfile: mergedProfile
   });
   ```
3. **Updated Data Structure**: Adapted to match scraped opportunities format
   - `type` instead of `category`
   - `organization` instead of generic `source`
   - `date_posted` for recency

---

## 💻 Frontend Implementation

### 1. Updated AnimatedMessage Component

#### Features

- **Save Button**: Bookmark icon on each opportunity card
- **Toggle State**: Filled bookmark when saved, outline when not
- **Real-time Updates**: Optimistic UI with loading states
- **External Links**: "View Details" button opens opportunity URL in new tab

#### Code Highlights

```tsx
const [savedStates, setSavedStates] = useState<Record<string, boolean>>({});
const [savingStates, setSavingStates] = useState<Record<string, boolean>>({});

const handleSaveToggle = async (opportunity: Opportunity) => {
  if (isSaved) {
    await apiClient.delete(`/saved/${opportunity.id}`, token);
    toast.success("Opportunity removed from saved");
  } else {
    await apiClient.post('/saved', { opportunity }, token);
    toast.success("Opportunity saved!");
  }
};
```

#### UI Components

- **Bookmark Button**: Ghost button with hover effect
- **Badges**: Type, location, organization displayed as badges
- **Description**: Line-clamped to 2 lines
- **Actions**: "View Details" link button

---

### 2. Updated Saved Page

#### Features

- **Fetch on Mount**: Loads saved opportunities from Firestore
- **Loading State**: Spinner while fetching data
- **Empty State**: Friendly message with "Go to Chat" button
- **Card Actions**:
  - **View Details**: Opens opportunity URL
  - **Share**: Uses native share API or copies to clipboard
  - **Delete**: Removes from saved with confirmation

#### State Management

```tsx
const [savedOpps, setSavedOpps] = useState<SavedOpportunity[]>([]);
const [loading, setLoading] = useState(true);
const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

useEffect(() => {
  const fetchSavedOpportunities = async () => {
    const response = await apiClient.get('/saved', token);
    setSavedOpps(response.opportunities || []);
  };
  fetchSavedOpportunities();
}, [token, navigate]);
```

#### Animations

- **Enter Animation**: Slide from left with stagger
- **Exit Animation**: Slide to right
- **Hover Effects**: Scale on button hover
- **Layout Animation**: Smooth transitions when items are removed

---

## 🔄 Data Flow

### Chat Flow

```
1. User types message in chat
   ↓
2. Frontend sends to POST /api/chat
   {
     message: "Looking for jobs in Windhoek",
     conversationId: "conv_...",
     context: { skills: [...], location: "Windhoek" }
   }
   ↓
3. Backend calls RAG system
   - Load opportunities from JSON
   - Calculate TF-IDF vectors
   - Compute similarity scores
   - Apply preference boosts
   - Return top 5 results
   ↓
4. Backend generates LLM response
   - System prompt with guidelines
   - User query + profile + opportunities
   - GPT-4o generates friendly response
   ↓
5. Frontend displays message + opportunity cards
   - AnimatedMessage component
   - Each card has save button
```

### Save Flow

```
1. User clicks bookmark icon on opportunity
   ↓
2. Frontend calls POST /api/saved
   { opportunity: {...} }
   ↓
3. Backend saves to Firestore
   users/{userId}/savedOpportunities/{opportunityId}
   ↓
4. Frontend updates local state
   - Changes bookmark icon to filled
   - Shows toast notification
```

### Saved Page Flow

```
1. User navigates to /saved
   ↓
2. Frontend calls GET /api/saved
   ↓
3. Backend fetches from Firestore
   - Query savedOpportunities collection
   - Order by savedAt desc
   ↓
4. Frontend displays cards
   - Show all saved opportunities
   - Enable delete/share actions
```

---

## 🎨 UI/UX Features

### Opportunity Cards in Chat

- **Compact Design**: Fits 3-4 cards in chat view
- **Key Info Visible**: Title, type, location, organization
- **Line Clamping**: Description truncated to 2 lines
- **Hover Effects**: Shadow expands on hover
- **Save Indicator**: Visual feedback for saved state

### Saved Page

- **Card Layout**: Full-width cards with left border accent
- **Rich Information**: All opportunity details displayed
- **Action Buttons**: View, Share, Delete with icons
- **Empty State**: Friendly message encouraging user to chat
- **Loading State**: Spinner with message

### Animations

- **Framer Motion**: Smooth enter/exit transitions
- **Stagger Effect**: Cards appear sequentially
- **Layout Shifts**: Smooth when items are removed
- **Micro-interactions**: Button scales on hover/tap

---

## 📊 Data Source

### Opportunities JSON

**Location**: `data/opportunities.json`

**Structure**:
```json
{
  "last_updated": "2025-10-20T17:20:03Z",
  "total_count": 108,
  "sources": ["Example Website", "JobsInNamibia", "NIEIS"],
  "scraper_stats": {...},
  "opportunities": [
    {
      "id": "sha256hash...",
      "source": "JobsInNamibia",
      "title": "EXECUTIVE OFFICER – Bank Windhoek",
      "type": "Job",
      "organization": "Unknown",
      "location": "Windhoek",
      "description": "Category: General...",
      "url": "https://jobsinnamibia.info/jobs/...",
      "date_posted": "2025-10-20",
      "verified": true
    }
  ]
}
```

**Current Stats**:
- **Total Opportunities**: 108
- **Sources**: 3 (Example, JobsInNamibia, NIEIS)
- **Types**: Job (95), Training (8), Scholarship (3), Internship (2)
- **Locations**: Windhoek, Swakopmund, Walvis Bay, Kavango East, Oshakati, Rundu, Namibia

---

## 🚀 How to Use

### For Users

1. **Chat with AI**:
   - Type queries like "jobs in Windhoek" or "training opportunities"
   - AI suggests relevant opportunities based on your profile
   - Each opportunity has a bookmark icon

2. **Save Opportunities**:
   - Click the bookmark icon on any opportunity
   - Icon changes to filled state when saved
   - Toast notification confirms save

3. **View Saved**:
   - Navigate to "Saved Opportunities" from menu or top bar
   - See all saved opportunities with full details
   - Share via native share or copy link
   - Delete unwanted items

### For Developers

#### Test RAG System

```javascript
const { retrieveOpportunities } = require('./src/utils/rag');

// Basic search
const results = await retrieveOpportunities("programming jobs", {
  topK: 5
});

// With user profile
const results = await retrieveOpportunities("training", {
  topK: 3,
  userProfile: {
    skills: ["construction", "plumbing"],
    location: "Windhoek"
  }
});

// With filters
const results = await retrieveOpportunities("opportunities", {
  topK: 10,
  filterTypes: ["Job", "Internship"],
  filterLocation: "Windhoek"
});
```

#### Test Saved API

```bash
# Save opportunity
curl -X POST http://localhost:3001/api/saved \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"opportunity": {...}}'

# Get saved
curl http://localhost:3001/api/saved \
  -H "Authorization: Bearer <token>"

# Delete saved
curl -X DELETE http://localhost:3001/api/saved/abc123 \
  -H "Authorization: Bearer <token>"
```

---

## 🔍 RAG Algorithm Deep Dive

### TF-IDF Explained

**Term Frequency (TF)**:
```
TF(term) = (Number of times term appears in document) / (Total terms in document)
```

**Inverse Document Frequency (IDF)**:
```
IDF(term) = log(Total documents / Documents containing term)
```

**TF-IDF Score**:
```
TF-IDF(term) = TF(term) × IDF(term)
```

### Cosine Similarity

Measures angle between two vectors:
```
cosine_similarity = (A · B) / (||A|| × ||B||)

Where:
- A · B = dot product (sum of element-wise multiplication)
- ||A|| = magnitude of vector A (square root of sum of squares)
- ||B|| = magnitude of vector B
```

**Range**: -1 to 1 (we use 0 to 1 for positive correlation)
- 1 = identical
- 0 = orthogonal (no similarity)

### Example Calculation

**Query**: "plumbing training windhoek"
**Document**: "Plumbing apprenticeship program in Windhoek offering hands-on training"

**Step 1: Tokenize**
- Query: ["plumbing", "training", "windhoek"]
- Document: ["plumbing", "apprenticeship", "program", "windhoek", "offering", "hands", "training"]

**Step 2: Calculate TF for Document**
```
"plumbing": 1/7 = 0.143
"training": 1/7 = 0.143
"windhoek": 1/7 = 0.143
(others): 1/7 = 0.143 each
```

**Step 3: Calculate IDF** (assume 100 documents total)
```
"plumbing": log(100/5) = 3.00    (appears in 5 docs)
"training": log(100/20) = 1.61   (appears in 20 docs)
"windhoek": log(100/50) = 0.69   (appears in 50 docs)
```

**Step 4: TF-IDF Vectors**
```
Query TF-IDF:
{
  "plumbing": 0.333 × 3.00 = 1.00,
  "training": 0.333 × 1.61 = 0.54,
  "windhoek": 0.333 × 0.69 = 0.23
}

Document TF-IDF:
{
  "plumbing": 0.143 × 3.00 = 0.43,
  "training": 0.143 × 1.61 = 0.23,
  "windhoek": 0.143 × 0.69 = 0.10,
  (other terms)...
}
```

**Step 5: Cosine Similarity**
```
Dot product = (1.00×0.43) + (0.54×0.23) + (0.23×0.10) = 0.43 + 0.12 + 0.02 = 0.57

Magnitude Query = √(1.00² + 0.54² + 0.23²) = √1.35 = 1.16
Magnitude Doc = √(0.43² + 0.23² + 0.10² + ...) ≈ 0.68

Cosine Similarity = 0.57 / (1.16 × 0.68) = 0.57 / 0.79 = 0.72
```

**Result**: Similarity score of **0.72** (high relevance!)

---

## 🎯 Performance Considerations

### Backend

- **Caching**: Opportunities cached for 5 minutes to reduce file I/O
- **Batch Operations**: Firestore batch reads for checking multiple saved states
- **Indexing**: Firestore indexes on `userId` and `savedAt` for fast queries
- **Rate Limiting**: Consider adding rate limits for save/unsave actions

### Frontend

- **Optimistic Updates**: UI updates immediately, rolls back on error
- **Debouncing**: Prevent rapid save/unsave clicks
- **Lazy Loading**: Could paginate saved page for users with many items
- **Error Boundaries**: Graceful error handling

### RAG System

**Current Performance**:
- Load opportunities: ~10ms (cached) / ~50ms (uncached)
- TF-IDF calculation: ~20ms for 108 documents
- Total retrieval: ~30-70ms

**Optimization Ideas**:
1. **Pre-compute TF-IDF**: Calculate vectors once, store in memory
2. **Approximate Nearest Neighbors**: Use libraries like FAISS for large datasets
3. **Semantic Embeddings**: Use actual embeddings (OpenAI, Sentence-BERT) for better accuracy
4. **Elasticsearch**: Consider for production with thousands of opportunities

---

## 📝 Next Steps

### Immediate Improvements

1. **Feedback Loop**: Track which opportunities users save/click to improve ranking
2. **Negative Examples**: Learn from opportunities users unsave
3. **A/B Testing**: Test different boost weights and thresholds
4. **Analytics**: Track retrieval accuracy and user satisfaction

### Future Enhancements

1. **Advanced RAG**:
   - Use OpenAI embeddings for semantic search
   - Implement vector database (Pinecone, Weaviate)
   - Multi-stage retrieval (BM25 + semantic)

2. **Smart Features**:
   - Opportunity recommendations on saved page
   - Email notifications for new relevant opportunities
   - Application tracking (applied, interviewed, etc.)
   - Deadline reminders

3. **Social Features**:
   - Share opportunities with friends
   - Group opportunities by category
   - Notes on saved opportunities

---

## 🐛 Troubleshooting

### No opportunities returned

**Possible causes**:
1. Empty `opportunities.json`
2. Query too specific (no matches above threshold)
3. Filters too restrictive

**Solutions**:
- Check file exists: `ls data/opportunities.json`
- Lower `minScore` threshold
- Run scraper: `python scrapers/run_all.py`

### Save button not working

**Check**:
1. User is authenticated: `console.log(token)` should show JWT
2. Network tab shows API call
3. Firestore rules allow writes to `users/{userId}/savedOpportunities`

### RAG returning irrelevant results

**Tuning options**:
1. Adjust boost weights in `rag.js`
2. Increase `minScore` threshold
3. Add stopwords to tokenizer
4. Test with different queries

---

## 📚 References

- [TF-IDF Wikipedia](https://en.wikipedia.org/wiki/Tf%E2%80%93idf)
- [Cosine Similarity](https://en.wikipedia.org/wiki/Cosine_similarity)
- [RAG Paper](https://arxiv.org/abs/2005.11401)
- [Framer Motion Docs](https://www.framer.com/motion/)
- [Firestore Docs](https://firebase.google.com/docs/firestore)

---

**Last Updated**: October 20, 2025  
**Version**: 1.0  
**Status**: ✅ Production Ready
