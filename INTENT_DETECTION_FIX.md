# Intent Detection Bug Fix

## Issue
The LLM-based intent detection was **failing silently** on every request:
```
[error]: [Chat] Intent detection failed, defaulting to false
```

This caused ALL messages (including "any jobs near me?") to be classified as casual chat, preventing opportunity retrieval.

## Root Cause
**Incorrect function call signature** for `generateChatCompletion`:

### ❌ Wrong (Previous):
```javascript
const response = await generateChatCompletion([
  { role: 'system', content: '...' },
  { role: 'user', content: '...' }
], {
  max_tokens: 10,
  temperature: 0.1
});

const answer = response.trim().toUpperCase(); // ❌ response is an object, not a string
```

### ✅ Correct (Fixed):
```javascript
const result = await generateChatCompletion({
  messages: [
    { role: 'system', content: '...' },
    { role: 'user', content: '...' }
  ],
  maxTokens: 10,
  temperature: 0.1
});

const answer = result.text.trim().toUpperCase(); // ✅ result.text is the string
```

## Function Signature
```javascript
async function generateChatCompletion({ messages, temperature, maxTokens, model })
```

**Parameters:** Single object with properties:
- `messages`: Array of message objects
- `maxTokens`: Number (not `max_tokens`)
- `temperature`: Number
- `model`: String (optional)

**Returns:** Object with:
- `text`: The actual response text
- `raw`: Full OpenRouter response
- `usage`: Token usage stats

## Changes Made

### File: `src/routes/chat.js`

#### Before:
```javascript
const response = await generateChatCompletion([
  { role: 'system', content: 'You are a precise intent classifier. Respond only with YES or NO.' },
  { role: 'user', content: intentDetectionPrompt }
], {
  max_tokens: 10,
  temperature: 0.1
});

const answer = response.trim().toUpperCase();
```

#### After:
```javascript
const result = await generateChatCompletion({
  messages: [
    { role: 'system', content: 'You are a precise intent classifier. Respond only with YES or NO.' },
    { role: 'user', content: intentDetectionPrompt }
  ],
  maxTokens: 10,
  temperature: 0.1
});

const answer = result.text.trim().toUpperCase();
```

Also improved error logging:
```javascript
logger.error('[Chat] Intent detection failed, defaulting to false', { 
  error: error.message, 
  stack: error.stack  // Added stack trace
});
```

## Testing After Fix

### Expected Behavior:

1. **Casual Chat:**
   - Input: "hey how are you?"
   - Intent: NO → Skip RAG
   - Response: Friendly greeting

2. **Opportunity Request:**
   - Input: "any jobs near me?"
   - Intent: YES → Run RAG
   - Response: List of opportunities

3. **Follow-up:**
   - Input: "yes i do please show me some"
   - Intent: YES → Run RAG
   - Response: List of opportunities

### Backend Logs Should Show:
```
[Chat] LLM Intent Detection {
  message: "hey how are you?",
  llmResponse: "NO",
  isRequestingOpportunities: false
}

[Chat] LLM Intent Detection {
  message: "any jobs near me?",
  llmResponse: "YES", 
  isRequestingOpportunities: true
}
```

## Impact
- **Before Fix:** 0% opportunity requests detected (all failed)
- **After Fix:** ~95%+ accuracy expected (LLM-powered classification)

## Why It Was Failing
1. Passing array as first parameter → `messages` was undefined
2. Passing options as second parameter → Ignored completely
3. Trying to call `.trim()` on an object → TypeError
4. Exception caught, defaulted to `false`
5. No opportunities retrieved for ANY message

## Related Files
- `src/routes/chat.js` - Intent detection function (line 38-69)
- `src/utils/llm.js` - LLM API wrapper
- `LLM_INTENT_DETECTION.md` - Documentation

## Next Steps
1. ✅ Fix applied
2. 🔄 Test with various messages
3. 📊 Monitor logs for intent detection accuracy
4. 🎯 Adjust prompt if classification is inaccurate
