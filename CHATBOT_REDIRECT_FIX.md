# Chatbot Redirect Fix - Stay On Topic

## Issue
The chatbot was engaging in extended off-topic conversations (cooking, food, general topics) instead of staying focused on its core mission: **helping young people find opportunities**.

### Example Problem:
User: "I want to eat some salmonella bro"
Bot: "Haha, I think you might mean some salmon! That sounds tasty! 🍴..."
User: "with some green lettuce, and some garlic too, any recommendations?"
Bot: "That sounds delicious! You could try grilling the salmon with some garlic..."

❌ **This is wrong** - The bot should politely redirect to opportunities, not give cooking advice.

## Solution
Updated the system prompt and user message instructions to enforce **strict topic boundaries** with polite but firm redirects.

## Changes Made

### File: `src/routes/chat.js`

#### 1. Updated System Message Guidelines (Lines 311-321)

**Before:**
```
1. Respond naturally and briefly. If the user is just greeting or making small talk, reply warmly and optionally ask if they would like help finding opportunities.
2. When the user clearly requests opportunities AND opportunities are provided below, use only the opportunities provided to answer.
4. If the user asks about something unrelated, politely explain you specialise in youth opportunities and ask if they want you to look for some.
7. Speak like a supportive peer from Windhoek, not a corporate advisor.
8. When several relevant opportunities are available and the user wants them, summarise the top two or three in plain sentences.
```

**After:**
```
1. If the user greets you, respond warmly and IMMEDIATELY ask if they need help finding opportunities. If they ask about ANYTHING unrelated (food, hobbies, general topics), acknowledge in ONE sentence, then IMMEDIATELY redirect to opportunities.
2. DO NOT engage in extended off-topic conversations. Your ONLY job is connecting youth to opportunities. Always steer back.
3. When the user requests opportunities AND opportunities are provided below, summarise the top 2-3 in plain sentences.
4. If the user asked for opportunities but none are available, say: "I couldn't find any new opportunities right now, but I'll keep an eye out for you."
5. Never invent opportunities. Only use what's provided below.
6. Keep responses under 60 words - be concise!
```

#### 2. Added Example Responses (Lines 318-321)

**Before:**
```
Example greeting response:
"Hey there! I'm doing great, thanks for asking! 😊 I'm here to help you find jobs, training, or other opportunities in Namibia. Want me to look for something specific?"
```

**After:**
```
Example responses:
- Off-topic (cooking): "That sounds tasty! 😊 But I'm here to help you find jobs, training, and scholarships in Namibia. Are you looking for work or learning opportunities?"
- Greeting: "Hey! I'm doing great, thanks! I help young people find opportunities like jobs, training, or scholarships. What are you looking for?"
```

#### 3. Updated User Message Instructions (Lines 328-329)

**Before:**
```javascript
requestingOpportunities 
  ? 'The user is asking for opportunities. If opportunities are provided above, summarise them naturally. If not, let them know you couldn\'t find any.'
  : 'The user is NOT asking for opportunities - they are just chatting. Do NOT mention any opportunities. Just respond naturally to their message.'
```

**After:**
```javascript
requestingOpportunities 
  ? 'The user is asking for opportunities. If opportunities are provided above, summarise them naturally. If not, let them know you couldn\'t find any.'
  : 'The user is NOT asking for opportunities - they are just chatting casually or asking off-topic questions. Acknowledge politely in ONE sentence, then IMMEDIATELY redirect the conversation back to finding opportunities. Do NOT engage deeply in off-topic conversation.'
```

## Expected Behavior After Fix

### ✅ Correct Responses:

1. **Off-Topic Conversation:**
   - User: "I want to eat some salmonella bro"
   - Bot: "That sounds tasty! 😊 But I'm here to help you find jobs, training, and scholarships in Namibia. Are you looking for work or learning opportunities?"

2. **Cooking Advice:**
   - User: "with some green lettuce, and some garlic too, any recommendations?"
   - Bot: "Sounds delicious! 😊 But I specialize in helping you find jobs, training, and scholarships. Are you looking for any opportunities?"

3. **General Chat:**
   - User: "I want you to tell me about quantum physics"
   - Bot: "That's a fascinating topic! But I'm here to help you find opportunities like jobs, training, or scholarships in Namibia. Need help with anything?"

4. **Greeting:**
   - User: "hey how are you?"
   - Bot: "Hey! I'm doing great, thanks! I help young people find opportunities like jobs, training, or scholarships. What are you looking for?"

5. **Opportunity Request:**
   - User: "enough about food, any job opportunities for me?"
   - Bot: "Sure! Here are a few job opportunities you might like: [lists opportunities]"

## Key Changes Summary

### ✅ What's Better:

1. **Shorter responses** (60 words vs 80 words)
2. **Explicit redirect instruction** in casual chat context
3. **Clear examples** showing how to redirect off-topic conversations
4. **Stronger language**: "Your ONLY job", "DO NOT engage", "IMMEDIATELY redirect"
5. **Removed permissive language**: "optionally ask" → "IMMEDIATELY ask"

### 🎯 Core Principle:

**Be polite, acknowledge briefly, redirect immediately.**

Formula: `[Brief acknowledgment] + [Redirect to opportunities] + [Open question]`

Example:
- "That sounds interesting! 😊" (acknowledge)
- "But I'm here to help you find jobs and training" (redirect)  
- "Are you looking for anything specific?" (open question)

## Impact

- **Before:** Bot would discuss cooking, quantum physics, general topics for multiple turns
- **After:** Bot acknowledges in ONE sentence, then redirects to opportunities
- **User Experience:** Clearer bot purpose, faster path to opportunities
- **Engagement:** Users understand the bot's specialty immediately

## Testing Recommendations

Test these scenarios:
1. ✅ Cooking/food questions → Should redirect
2. ✅ Science/general knowledge → Should redirect  
3. ✅ Casual greetings → Should redirect with question
4. ✅ Opportunity requests → Should provide opportunities
5. ✅ Follow-up off-topic → Should redirect again (persistent)

## Related Files
- `src/routes/chat.js` - Main chat route with system prompt
- `INTENT_DETECTION_FIX.md` - Previous fix for intent detection
- `LLM_INTENT_DETECTION.md` - LLM-based intent classification
