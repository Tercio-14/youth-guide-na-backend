# LLM-Based Intent Detection

## Overview
Replaced hardcoded keyword-based intent detection with LLM-powered classification to determine if users are asking for opportunities or just chatting casually.

## Implementation

### Previous Approach (Hardcoded Keywords)
- Used arrays of opportunity keywords ("job", "training", etc.)
- Used arrays of casual keywords ("hello", "hi", etc.)
- Failed to handle nuanced requests or creative phrasing

### New Approach (LLM-Based Classification)
- Makes a preliminary API call to the same LLM
- Uses a focused prompt to classify user intent
- Returns simple YES/NO response
- Much more robust and flexible

## Code Changes

### File: `src/routes/chat.js`

#### 1. Updated `isAskingForOpportunities()` function (Lines 33-60)
```javascript
async function isAskingForOpportunities(message) {
  try {
    const intentDetectionPrompt = `You are an intent classifier for YouthGuide NA...
    
    User message: "${message}"
    
    Respond with ONLY one word:
    - "YES" if they are asking for opportunities
    - "NO" if they are just chatting casually`;

    const response = await generateChatCompletion([
      { role: 'system', content: 'You are a precise intent classifier. Respond only with YES or NO.' },
      { role: 'user', content: intentDetectionPrompt }
    ], {
      max_tokens: 10,
      temperature: 0.1 // Low temperature for consistent classification
    });

    const answer = response.trim().toUpperCase();
    const isRequestingOpportunities = answer.includes('YES');
    
    logger.info('[Chat] LLM Intent Detection', { 
      message: message.substring(0, 50), 
      llmResponse: answer,
      isRequestingOpportunities 
    });
    
    return isRequestingOpportunities;
  } catch (error) {
    logger.error('[Chat] Intent detection failed, defaulting to false', { error: error.message });
    return false; // Fail safe
  }
}
```

#### 2. Updated function call to use `await` (Line 264)
```javascript
// Before:
const requestingOpportunities = isAskingForOpportunities(trimmedMessage);

// After:
const requestingOpportunities = await isAskingForOpportunities(trimmedMessage);
```

## Benefits

### 1. **More Accurate Detection**
- Understands context and nuance
- Handles creative phrasing like "I need something to do" or "got anything for me?"
- Can detect sarcasm, rhetorical questions, etc.

### 2. **No Maintenance Required**
- No need to update keyword lists
- Automatically adapts to new phrases
- Works in multiple languages if user switches

### 3. **Consistent with Main AI**
- Uses the same LLM for both classification and response
- Ensures coherent understanding across the system

### 4. **Fail-Safe Design**
- If LLM call fails, defaults to NOT retrieving opportunities
- Prevents unnecessary RAG calls and API costs
- Logs errors for monitoring

## API Call Flow

### When User Sends Message:
1. **Intent Detection Call** (New)
   - LLM classifies: "YES" or "NO"
   - Max 10 tokens, temperature 0.1
   - Fast and cheap (~$0.0001 per call)

2. **Conditional RAG Retrieval**
   - Only runs if intent = "YES"
   - Searches 108 opportunities
   - Returns top 5 matches

3. **Main Response Call**
   - Uses retrieved opportunities (if any)
   - Generates user-facing response
   - Max 600 tokens

## Performance Impact

- **Additional latency**: ~200-500ms for intent detection
- **Additional cost**: ~$0.0001 per message (negligible)
- **Saved cost**: Eliminates RAG + LLM calls for casual chat (saves ~$0.001 per casual message)
- **Net effect**: Cost savings for apps with high chat volume

## Testing

### Test Cases:
1. **Casual Greeting**
   - Input: "Hello how are you?"
   - Expected: NO → No RAG → Friendly greeting response

2. **Direct Request**
   - Input: "Show me jobs in Windhoek"
   - Expected: YES → Run RAG → Return opportunities

3. **Subtle Request**
   - Input: "I'm bored, got anything for me?"
   - Expected: YES → Run RAG → Return opportunities

4. **Follow-up Question**
   - Input: "Tell me more about the first one"
   - Expected: NO (not asking for NEW opportunities) → Use context

## Monitoring

Check logs for:
```
[Chat] LLM Intent Detection { 
  message: "hello how are you?", 
  llmResponse: "NO",
  isRequestingOpportunities: false 
}
```

## Error Handling

If intent detection fails:
- Function returns `false` (safe default)
- Error logged: `[Chat] Intent detection failed, defaulting to false`
- System continues with NO opportunities retrieved
- User gets friendly chat response without errors

## Future Improvements

1. **Caching**: Cache intent for similar messages
2. **Batch Detection**: Detect intent for multiple messages at once
3. **Confidence Scores**: Return probability instead of YES/NO
4. **Multi-class**: Detect specific opportunity types (job vs training vs scholarship)
