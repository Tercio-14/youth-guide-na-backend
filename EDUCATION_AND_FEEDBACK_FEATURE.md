# Education Matching & Feedback System Implementation

## Overview
This document describes the implementation of two new features for the YouthGuide NA chatbot:
1. **Education-Level Matching Boost** in RAG scoring logic
2. **Feedback Buttons** on opportunity suggestion cards

Both features are designed as **non-breaking additions** that enhance the chatbot without disrupting existing functionality.

---

## Feature 1: Education-Level Matching Boost

### Goal
Improve the relevance of opportunity recommendations by considering the user's education level and matching it against opportunity requirements.

### Implementation Details

#### Backend Changes

**File: `src/utils/ai-reranker.js`**

1. **Added Education to User Profile Context** (Line ~102)
   ```javascript
   if (userProfile.education) {
     profileContext.push(`Education Level: ${userProfile.education}`);
   }
   ```

2. **Updated Evaluation Criteria** (6 factors instead of 5)
   - Previous weights: Skill 30%, Query 30%, Interest 20%, Location 10%, Type 10%
   - **New weights**: Skill 25%, Query 25%, **Education 20%**, Interest 15%, Location 10%, Type 5%

3. **Added Education Requirements to Opportunity Prompt**
   ```javascript
   Education Requirements: ${opportunity.requirements || opportunity.education_required || 'Not specified'}
   ```

4. **Education Level Hierarchy**
   - Tertiary (University/College) > Grade 12 > Grade 10 > Grade 8 or below
   - AI model evaluates if user meets minimum requirements

#### How It Works
- When a user has an education level in their profile, the AI reranker considers this during scoring
- Opportunities with education requirements are boosted for qualified users
- If education requirements are not specified in the opportunity data, AI infers from description
- Users see opportunities they're qualified for ranked higher

#### Data Structure
- Opportunities may have `requirements` or `education_required` fields
- If neither exists, defaults to "Not specified" (AI infers from description)
- User education stored in profile: "Tertiary", "Grade 12", "Grade 10", "Grade 8 or below"

---

## Feature 2: Feedback System

### Goal
Allow users to provide feedback on opportunity recommendations to help improve the chatbot's performance over time.

### Implementation Details

#### Backend Changes

**File: `src/routes/feedback.js` (NEW)**

Created complete feedback API with 3 endpoints:

1. **POST `/api/feedback`** - Submit feedback
   - Body: `{ opportunityId, feedback, conversationId }`
   - Feedback types: `'helpful'` or `'not_relevant'`
   - Requires authentication (verifyToken middleware)
   - Stores: userId, opportunityId, feedback, conversationId, timestamp

2. **GET `/api/feedback/opportunity/:id`** - Get stats for an opportunity
   - Returns: total feedback count, helpful count, not_relevant count
   - Public endpoint (no auth required)

3. **GET `/api/feedback/user`** - Get user's feedback history
   - Returns: all feedback submitted by authenticated user
   - Requires authentication

**File: `src/app.js`**

- Added feedback route import
- Registered route: `app.use('/api/feedback', feedbackRoutes)`
- Added to API documentation endpoint

**File: `src/config/firebase.js`**

- Added `feedback` collection to Firebase collections
- Structure: `feedback` collection with documents containing:
  - userId (indexed for user queries)
  - opportunityId (indexed for opportunity queries)
  - feedback ('helpful' | 'not_relevant')
  - conversationId
  - timestamp

#### Frontend Changes

**File: `src/utils/api.js`**

Added 3 API client methods:
```javascript
async submitFeedback(opportunityId, feedback, conversationId, token)
async getOpportunityFeedback(opportunityId, token = null)
async getUserFeedbackHistory(token)
```

**File: `src/components/chat/AnimatedMessage.tsx`**

1. **Added Imports**
   - `ThumbsUp`, `ThumbsDown` icons from lucide-react

2. **Added State Management**
   ```typescript
   const [feedbackStates, setFeedbackStates] = useState<Record<string, 'helpful' | 'not_relevant' | null>>({});
   const [feedbackSubmitting, setFeedbackSubmitting] = useState<Record<string, boolean>>({});
   ```

3. **Added conversationId Prop**
   - Component now receives `conversationId` from parent

4. **Created Feedback Handler**
   ```typescript
   const handleFeedback = async (opportunityId: string, feedbackType: 'helpful' | 'not_relevant')
   ```
   - Validates authentication
   - Prevents duplicate feedback
   - Submits to API
   - Shows success/error toasts
   - Updates button states

5. **Added Feedback Buttons UI**
   - Two buttons below opportunity description:
     - 👍 "Helpful" button
     - 👎 "Not Relevant" button
   - Buttons are disabled after feedback submission
   - Active state shows which feedback was given
   - Clean, non-intrusive design

**File: `src/pages/Chat.tsx`**

- Added `conversationId` prop to AnimatedMessage component
- Passes current conversation ID for feedback tracking

#### User Experience
1. User sees opportunities with two feedback buttons
2. Clicks "Helpful" or "Not Relevant" based on relevance
3. Button becomes highlighted, other button disabled
4. Success toast confirms feedback submission
5. Feedback stored in Firestore for analytics

---

## Testing Checklist

### Education Matching Tests
- [ ] User with "Tertiary" education sees university opportunities ranked higher
- [ ] User with "Grade 12" sees appropriate opportunities
- [ ] Opportunities without education requirements still appear
- [ ] AI correctly infers education requirements from descriptions
- [ ] Existing functionality unchanged (non-breaking)

### Feedback System Tests
- [ ] Feedback buttons appear on all opportunity cards
- [ ] Clicking "Helpful" submits correct feedback
- [ ] Clicking "Not Relevant" submits correct feedback
- [ ] Buttons disabled after feedback submission
- [ ] Authentication required (shows error if not logged in)
- [ ] Duplicate feedback prevented
- [ ] Success toasts display correctly
- [ ] Feedback stored in Firestore correctly
- [ ] GET endpoints return correct statistics
- [ ] Mobile responsiveness maintained

### Integration Tests
- [ ] Both features work together without conflicts
- [ ] Existing save/bookmark functionality unaffected
- [ ] Chat UI remains responsive
- [ ] No console errors
- [ ] API documentation updated correctly

---

## Database Structure

### Firestore Collections

**`feedback` Collection**
```javascript
{
  userId: string,              // Firebase Auth UID
  opportunityId: string,       // Reference to opportunity
  feedback: 'helpful' | 'not_relevant',
  conversationId: string,      // Chat conversation ID
  timestamp: Timestamp         // When feedback was submitted
}
```

**Recommended Indexes**
- Composite: `userId` + `timestamp` (for user history queries)
- Composite: `opportunityId` + `timestamp` (for opportunity stats)
- Single: `conversationId` (for conversation analysis)

---

## API Endpoints

### Feedback Endpoints

**POST `/api/feedback`**
```
Headers: Authorization: Bearer <token>
Body: {
  "opportunityId": "string",
  "feedback": "helpful" | "not_relevant",
  "conversationId": "string"
}
Response: {
  "success": true,
  "message": "Feedback submitted successfully"
}
```

**GET `/api/feedback/opportunity/:id`**
```
Response: {
  "opportunityId": "string",
  "stats": {
    "total": number,
    "helpful": number,
    "not_relevant": number
  }
}
```

**GET `/api/feedback/user`**
```
Headers: Authorization: Bearer <token>
Response: {
  "feedback": [
    {
      "id": "string",
      "opportunityId": "string",
      "feedback": "helpful" | "not_relevant",
      "conversationId": "string",
      "timestamp": "ISO-8601 date"
    }
  ]
}
```

---

## Future Enhancements

### Education Matching
- [ ] Add education field to opportunity scraper
- [ ] Create admin interface to edit education requirements
- [ ] Track education match accuracy over time
- [ ] Allow users to update education level easily

### Feedback System
- [ ] Analytics dashboard showing feedback trends
- [ ] Use feedback to retrain RAG model
- [ ] Add optional comment field for detailed feedback
- [ ] Email admins when opportunity gets multiple "not relevant" votes
- [ ] Show aggregated feedback stats to users (e.g., "90% found this helpful")

---

## Notes

### Non-Breaking Design
- All changes are additive (no existing features removed)
- Education matching gracefully handles missing data
- Feedback buttons don't interfere with existing save/open buttons
- Authentication errors show helpful messages instead of breaking

### Performance Considerations
- Feedback submission is async (doesn't block UI)
- Firestore indexes recommended for query performance
- Education matching adds minimal overhead to AI reranker
- Frontend state management prevents duplicate API calls

### Security
- All feedback endpoints use authentication middleware
- User can only see their own feedback history
- Opportunity stats are public (for transparency)
- ConversationId validates feedback came from actual chat

---

## Files Modified

### Backend
- `src/utils/ai-reranker.js` - Added education matching logic
- `src/routes/feedback.js` - NEW: Complete feedback API
- `src/app.js` - Registered feedback routes
- `src/config/firebase.js` - Added feedback collection

### Frontend
- `src/utils/api.js` - Added feedback API methods
- `src/components/chat/AnimatedMessage.tsx` - Added feedback buttons UI
- `src/pages/Chat.tsx` - Pass conversationId to AnimatedMessage

---

## Deployment Notes

1. **Environment Variables** - No new variables required
2. **Firebase Setup** - Feedback collection will be auto-created on first write
3. **Indexes** - Create Firestore indexes for optimal query performance
4. **Testing** - Run comprehensive tests before production deploy
5. **Rollback Plan** - Can disable features by reverting frontend changes only

---

## Success Metrics

### Education Matching
- Measure: Average relevance score improvement
- Target: 10-15% increase in relevant opportunities for users with education profiles
- Track: User engagement with education-matched opportunities

### Feedback System
- Measure: Feedback submission rate
- Target: 20-30% of opportunities get feedback
- Track: Ratio of helpful vs not_relevant feedback
- Goal: Use feedback to improve recommendation quality over time

---

**Implementation Date**: January 2025  
**Status**: ✅ Complete - Ready for Testing  
**Breaking Changes**: None  
**Migration Required**: No
