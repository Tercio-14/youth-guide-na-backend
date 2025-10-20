# Chat Context Memory - Test Plan

## Overview
This test plan validates the short-term conversational memory implementation for YouthGuide NA chatbot.

## Test Environment Setup

### Prerequisites
1. Backend server running with latest code
2. Firebase Firestore connection active
3. OpenRouter API key configured
4. Test user account with valid authentication token
5. `.env` file with:
   ```
   USE_CHAT_CONTEXT=true
   CHAT_CONTEXT_TURNS=3
   ```

### Test Data Requirements
- Valid Firebase auth token
- User profile with skills and interests
- At least 2-3 opportunities embedded in Firestore

---

## Test Suite 1: Basic Context Functionality

### Test 1.1: First Message in New Conversation
**Objective**: Verify new conversations start without context

**Steps**:
1. Start backend server with `USE_CHAT_CONTEXT=true`
2. Send POST to `/api/chat` with new user message
3. Do NOT include `conversationId` in request body

**Expected Results**:
- Backend generates new `conversationId`
- Log shows: `[ChatContext] No previous messages found. Starting new conversation.`
- Response includes new `conversationId`
- No previous messages added to LLM prompt
- Response is appropriate for first-time greeting

**Validation**:
```bash
# Check logs for:
[ChatContext] No previous messages found. Starting new conversation.
[Chat] Chat response generated ... historyUsed=false, historyMessageCount=0
```

---

### Test 1.2: Second Message in Same Conversation
**Objective**: Verify context is retrieved and used

**Steps**:
1. Send first message: "Hi, my name is Alex"
2. Capture `conversationId` from response
3. Send second message with same `conversationId`: "What opportunities do you have for me?"

**Expected Results**:
- Backend retrieves previous messages
- Log shows: `[ChatContext] Using previous chat context: true (count: 2)`
- Response acknowledges user's name (Alex) without re-asking
- `historyUsed=true` in logs
- `historyMessageCount=2` in logs

**Validation**:
```bash
# Check logs for:
[ChatContext] Using previous chat context: true
[ChatContext] Added conversation history to prompt { historyMessages: 2 }
[Chat] Chat response generated ... historyUsed=true, historyMessageCount=2
```

---

### Test 1.3: Multiple Messages (Context Window)
**Objective**: Verify context window limits (CHAT_CONTEXT_TURNS=3)

**Steps**:
1. Send 5 messages in sequence with same `conversationId`:
   - Message 1: "Hi"
   - Message 2: "My name is Jamie"
   - Message 3: "I like IT jobs"
   - Message 4: "What training is available?"
   - Message 5: "Tell me more"

**Expected Results**:
- After message 4: `historyMessageCount=6` (3 turns × 2 messages)
- After message 5: `historyMessageCount=6` (still 3 turns, oldest dropped)
- Chatbot maintains context of recent conversation
- Oldest messages (1-2) not included in final prompt

**Validation**:
```bash
# Message 5 logs should show:
[ChatContext] Using previous chat context: true (count: 6)
historyMessageCount=6
```

---

## Test Suite 2: Context Toggle Functionality

### Test 2.1: Context Disabled
**Objective**: Verify system works without context when disabled

**Steps**:
1. Update `.env`: `USE_CHAT_CONTEXT=false`
2. Restart backend
3. Send multiple messages with same `conversationId`

**Expected Results**:
- Log shows: `[ChatContext] Chat context disabled via configuration`
- No history fetched from Firestore
- `historyUsed=false` for all messages
- Chatbot treats each message independently

**Validation**:
```bash
# Check logs for:
[ChatContext] Chat context disabled via configuration
historyUsed=false, historyMessageCount=0
```

---

### Test 2.2: Re-enabling Context
**Objective**: Verify context works after toggling back on

**Steps**:
1. Set `USE_CHAT_CONTEXT=true`
2. Restart backend
3. Continue conversation with existing `conversationId`

**Expected Results**:
- Previous messages retrieved from Firestore
- Context resumes from where it left off
- `historyUsed=true`

---

## Test Suite 3: Conversation Isolation

### Test 3.1: Separate Conversations
**Objective**: Verify conversations don't leak context

**Steps**:
1. Start conversation A: Send 3 messages with `conversationId_A`
2. Start conversation B: Send message with `conversationId_B`
3. Continue conversation A: Send another message with `conversationId_A`

**Expected Results**:
- Conversation B has no context from conversation A
- Conversation A maintains its own context
- Logs show different conversation IDs
- No cross-contamination of messages

**Validation**:
```bash
# Conversation B logs should show:
conversationId=conversationId_B
[ChatContext] No previous messages found. Starting new conversation.

# Returning to conversation A:
conversationId=conversationId_A
[ChatContext] Using previous chat context: true (count: 6)
```

---

### Test 3.2: Page Refresh (Frontend)
**Objective**: Verify new conversation starts after page refresh

**Steps**:
1. Send 3 messages in web UI
2. Refresh browser page (F5)
3. Send new message

**Expected Results**:
- Frontend generates new `conversationId`
- Backend treats it as new conversation
- No previous context retrieved
- Chatbot gives fresh greeting

---

## Test Suite 4: Firestore Data Validation

### Test 4.1: Message Persistence
**Objective**: Verify messages are correctly stored

**Steps**:
1. Send 2 messages in conversation
2. Check Firestore: `chats/{conversationId}/messages`

**Expected Results**:
- 4 documents in messages subcollection (2 user + 2 assistant)
- Each message has:
  - `role`: "user" or "assistant"
  - `content`: message text
  - `timestamp`: server timestamp
- User messages include `profileSnapshot`
- Assistant messages include `opportunities` and `retrieval` data

**Validation**:
```javascript
// Firestore structure:
chats/
  conv_1234567890_abc123/
    messages/
      msg_001: { role: "user", content: "Hi", timestamp: ..., profileSnapshot: {...} }
      msg_002: { role: "assistant", content: "Hello!", timestamp: ..., opportunities: [...] }
      msg_003: { role: "user", content: "Jobs?", timestamp: ... }
      msg_004: { role: "assistant", content: "Here are...", timestamp: ... }
```

---

### Test 4.2: Conversation Metadata
**Objective**: Verify conversation document is updated

**Steps**:
1. Send message in conversation
2. Check Firestore: `chats/{conversationId}`

**Expected Results**:
- Document exists with:
  - `userId`: correct user ID
  - `createdAt`: timestamp of first message
  - `updatedAt`: timestamp of last message
  - `lastMessageAt`: timestamp of last message
  - `lastUserMessage`: last user message text
  - `lastAssistantMessage`: last assistant response
  - `lastOpportunityCount`: number of opportunities in last response

---

## Test Suite 5: Performance & Safety

### Test 5.1: Retrieval Latency
**Objective**: Verify context retrieval doesn't add significant delay

**Steps**:
1. Send message without context
2. Send message with context (same conversation)
3. Compare `durationMs` in logs

**Expected Results**:
- Context retrieval adds < 100ms to total latency
- Firestore query is single read operation
- Overall response time remains acceptable (< 5 seconds)

**Validation**:
```bash
# Compare logs:
[Chat] Chat response generated ... durationMs=2341 (no context)
[Chat] Chat response generated ... durationMs=2398 (with context)
# Difference should be minimal
```

---

### Test 5.2: Empty Context Handling
**Objective**: Verify graceful handling when history fetch fails

**Steps**:
1. Use invalid/non-existent `conversationId`
2. Send message

**Expected Results**:
- No crash or error to user
- Logs show: `[ChatContext] No previous messages found`
- System treats as new conversation
- Response is generated normally

---

### Test 5.3: Large Context Window
**Objective**: Test behavior with maximum context

**Steps**:
1. Set `CHAT_CONTEXT_TURNS=10` in `.env`
2. Send 10+ messages in conversation
3. Monitor token usage and response quality

**Expected Results**:
- System respects 10-turn limit (20 messages)
- No token overflow errors
- Response quality remains consistent
- Logs show `historyMessageCount=20`

---

## Test Suite 6: Response Quality

### Test 6.1: Name Retention
**Objective**: Verify chatbot remembers user's name

**Steps**:
1. Message 1: "Hi, I'm Sarah"
2. Message 2: "What jobs are available?"
3. Message 3: "Thanks"

**Expected Results**:
- Message 2 response uses "Sarah" naturally
- Message 3 response acknowledges "Sarah" if appropriate
- No re-asking for name

---

### Test 6.2: Topic Continuity
**Objective**: Verify chatbot maintains conversation thread

**Steps**:
1. Message 1: "I'm interested in IT jobs"
2. Message 2: "What training do I need?"
3. Message 3: "How long does it take?"

**Expected Results**:
- Message 2 response relates training to IT context
- Message 3 response knows "it" refers to IT training
- No confusion or topic restart

---

### Test 6.3: Follow-up Questions
**Objective**: Verify chatbot handles references to previous responses

**Steps**:
1. Message 1: "Show me part-time jobs"
2. Wait for response with 2-3 opportunities
3. Message 2: "Tell me more about the first one"

**Expected Results**:
- Message 2 response references specific opportunity from previous response
- Chatbot knows which "first one" user means
- Context includes opportunities from assistant's previous message

---

## Test Suite 7: Edge Cases

### Test 7.1: Very Long Messages
**Objective**: Verify system handles long message history

**Steps**:
1. Send 3 messages with 200+ words each
2. Check token count and response

**Expected Results**:
- System handles long context without crash
- May truncate or summarize if needed
- Response is coherent

---

### Test 7.2: Rapid Messages
**Objective**: Test race conditions

**Steps**:
1. Send 3 messages rapidly (< 1 second apart)
2. Verify persistence and retrieval

**Expected Results**:
- All messages persisted correctly
- Context retrieval is accurate
- No duplicate or missing messages

---

### Test 7.3: Special Characters
**Objective**: Verify encoding handles special characters

**Steps**:
1. Message 1: "My name is José"
2. Message 2: "I speak Français"
3. Check context retrieval

**Expected Results**:
- Special characters preserved in Firestore
- Context retrieval maintains encoding
- Response uses correct character rendering

---

## Test Suite 8: Error Scenarios

### Test 8.1: Firestore Connection Failure
**Objective**: Verify graceful degradation

**Steps**:
1. Temporarily break Firestore connection (invalid credentials)
2. Send message with `conversationId`

**Expected Results**:
- Context fetch fails gracefully
- Error logged: `[ChatContext] Failed to fetch conversation history`
- System continues without context
- User receives response (no crash)

---

### Test 8.2: Malformed Message Data
**Objective**: Test resilience to bad data

**Steps**:
1. Manually corrupt message document in Firestore (remove `content` field)
2. Send new message in that conversation

**Expected Results**:
- System skips malformed message
- Retrieves other valid messages
- No crash or error to user

---

## Manual Testing Checklist

### Backend Logs Verification
- [ ] `[ChatContext]` logs appear for context operations
- [ ] `historyUsed` boolean is accurate
- [ ] `historyMessageCount` reflects actual message count
- [ ] `conversationId` is consistent across messages
- [ ] Retrieval latency is logged

### Frontend Behavior
- [ ] `conversationId` generated on page load
- [ ] Same `conversationId` used for all messages in session
- [ ] New `conversationId` generated after refresh
- [ ] Chat UI displays coherent conversation flow

### Firestore Data
- [ ] Messages collection structure is correct
- [ ] Timestamps are sequential
- [ ] Conversation metadata updates properly
- [ ] User and assistant roles are correct

### Response Quality
- [ ] Chatbot remembers names
- [ ] Follow-up questions work correctly
- [ ] Topic continuity maintained
- [ ] No repetition of already-provided information

---

## Success Criteria

### Must Pass
1. ✅ Context is retrieved when `USE_CHAT_CONTEXT=true`
2. ✅ Context is NOT retrieved when `USE_CHAT_CONTEXT=false`
3. ✅ Context window respects `CHAT_CONTEXT_TURNS` limit
4. ✅ Conversations are isolated by `conversationId`
5. ✅ New conversation starts after page refresh
6. ✅ Messages persist correctly in Firestore
7. ✅ No crashes or errors with context enabled
8. ✅ Performance impact is minimal (< 100ms)

### Should Pass
1. ✅ Chatbot maintains name/topic continuity
2. ✅ Follow-up questions work naturally
3. ✅ Logs provide clear visibility into context usage
4. ✅ Error scenarios degrade gracefully

### Nice to Have
1. ⭕ Special characters handled perfectly
2. ⭕ Rapid messages have no race conditions
3. ⭕ Very long conversations remain coherent

---

## Automated Test Script (Optional)

```javascript
// tests/chat-context.spec.js

const { describe, it, expect, beforeAll } = require('@jest/globals');
const request = require('supertest');
const app = require('../src/app');

describe('Chat Context Memory', () => {
  let authToken;
  let conversationId;

  beforeAll(async () => {
    // Setup: Get auth token for test user
    authToken = process.env.TEST_AUTH_TOKEN;
  });

  it('should start new conversation without context', async () => {
    const response = await request(app)
      .post('/api/chat')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        message: 'Hi there',
        context: { firstName: 'Test User' }
      });

    expect(response.status).toBe(200);
    expect(response.body.conversationId).toBeDefined();
    conversationId = response.body.conversationId;
  });

  it('should use context in second message', async () => {
    const response = await request(app)
      .post('/api/chat')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        message: 'What opportunities do you have?',
        conversationId,
        context: { firstName: 'Test User' }
      });

    expect(response.status).toBe(200);
    expect(response.body.conversationId).toBe(conversationId);
    // Verify response shows context awareness (implementation-specific)
  });

  it('should isolate different conversations', async () => {
    const response = await request(app)
      .post('/api/chat')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        message: 'Hello from new conversation',
        context: { firstName: 'Test User' }
      });

    expect(response.status).toBe(200);
    expect(response.body.conversationId).not.toBe(conversationId);
  });
});
```

---

## Reporting

### Test Execution Log
Document each test run with:
- Date/time of test
- Test case ID
- Pass/Fail result
- Screenshots/logs (if relevant)
- Notes on any issues found

### Bug Report Template
```
Bug ID: [BUG-###]
Test Case: [Test ID]
Severity: Critical | High | Medium | Low
Description: [What went wrong]
Steps to Reproduce:
  1. ...
  2. ...
Expected: [What should happen]
Actual: [What actually happened]
Logs: [Relevant log excerpts]
Environment: [Backend version, env vars, etc.]
```

---

## Post-Implementation Verification

After all tests pass:
1. ✅ Update `README.md` with context feature documentation
2. ✅ Add environment variables to deployment guides
3. ✅ Document Firestore schema changes
4. ✅ Update API documentation with `conversationId` parameter
5. ✅ Create user-facing documentation about conversation continuity

---

**Test Plan Version**: 1.0  
**Last Updated**: 2025-10-17  
**Author**: YouthGuide NA Development Team
