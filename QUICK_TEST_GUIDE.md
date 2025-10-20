# Quick Testing Guide - Conversational Memory

## Setup (2 minutes)

1. **Update `.env`**:
   ```bash
   USE_CHAT_CONTEXT=true
   CHAT_CONTEXT_TURNS=3
   ```

2. **Restart backend**:
   ```bash
   npm run dev
   ```

3. **Open browser** to your frontend (e.g., `http://localhost:8080`)

---

## Quick Test Scenarios

### ✅ Test 1: Basic Context (5 minutes)

**Steps**:
1. Open chat interface
2. Send: "Hi, my name is [YourName]"
3. Wait for response
4. Send: "What opportunities are available?"

**Success Criteria**:
- ✅ Second response uses your name
- ✅ Backend logs show:
  ```
  [ChatContext] Using previous chat context: true (count: 2)
  historyUsed=true, historyMessageCount=2
  ```

---

### ✅ Test 2: Follow-up Question (3 minutes)

**Steps**:
1. Continue from Test 1
2. If bot mentioned opportunities, send: "Tell me more about the first one"
3. If no opportunities, send: "What about training programs?"

**Success Criteria**:
- ✅ Response shows awareness of previous message
- ✅ No need to re-explain what you're looking for
- ✅ Logs show `historyMessageCount=4` or `6`

---

### ✅ Test 3: New Conversation (2 minutes)

**Steps**:
1. Refresh browser page (F5)
2. Send: "Hello"

**Success Criteria**:
- ✅ Bot gives fresh greeting (doesn't remember previous name)
- ✅ Backend logs show:
  ```
  [ChatContext] No previous messages found. Starting new conversation.
  historyUsed=false
  ```
- ✅ Frontend console shows new `conversationId` generated

---

### ✅ Test 4: Context Disabled (3 minutes)

**Steps**:
1. Update `.env`: `USE_CHAT_CONTEXT=false`
2. Restart backend
3. Send 2 messages with your name in first one

**Success Criteria**:
- ✅ Second response doesn't remember your name
- ✅ Backend logs show:
  ```
  [ChatContext] Chat context disabled via configuration
  historyUsed=false
  ```

---

## Firestore Validation (5 minutes)

### Check Messages Structure

1. **Open Firebase Console** → Firestore Database

2. **Navigate to**:
   ```
   chats → [your-conversationId] → messages
   ```

3. **Verify structure**:
   - ✅ Even number of documents (user + assistant pairs)
   - ✅ Each doc has: `role`, `content`, `timestamp`
   - ✅ User docs have: `profileSnapshot`
   - ✅ Assistant docs have: `opportunities`, `retrieval`
   - ✅ Timestamps are sequential

4. **Check conversation doc**:
   ```
   chats → [your-conversationId]
   ```
   - ✅ Has: `userId`, `createdAt`, `updatedAt`, `lastMessageAt`
   - ✅ Has: `lastUserMessage`, `lastAssistantMessage`, `lastOpportunityCount`

---

## Log Verification (2 minutes)

### Backend Terminal

Look for these log patterns:

**First message** (no context):
```
[Chat] Processing user message { userId: "...", conversationId: "conv_...", messageLength: 15 }
[ChatContext] No previous messages found. Starting new conversation.
[Chat] Chat response generated { ..., historyUsed: false, historyMessageCount: 0, durationMs: 2341 }
```

**Second message** (with context):
```
[Chat] Processing user message { userId: "...", conversationId: "conv_...", messageLength: 28 }
[ChatContext] Using previous chat context: true { conversationId: "...", count: 2, turns: 1 }
[ChatContext] Added conversation history to prompt { historyMessages: 2 }
[Chat] Chat response generated { ..., historyUsed: true, historyMessageCount: 2, durationMs: 2398 }
```

### Frontend Console

Look for:
```
🆔 [Chat] Generated new conversation ID: conv_1729177800_abc123
📝 [Chat] Sending message { message: "...", conversationId: "conv_...", ... }
📤 [Chat] Sending chat request with context { message: "...", conversationId: "conv_..." }
✅ [Chat] Received chat response { ..., conversationId: "conv_..." }
```

---

## Performance Check (1 minute)

Compare log `durationMs` values:

```
# Without context
durationMs: 2341

# With context
durationMs: 2398

# Difference should be < 100ms
Δ = 57ms ✅
```

---

## Common Issues & Solutions

### Issue: Context not working

**Symptoms**: `historyUsed=false` even after multiple messages

**Solutions**:
1. Check `.env`: `USE_CHAT_CONTEXT=true`
2. Restart backend after env change
3. Use same `conversationId` across messages
4. Check Firestore rules allow reading from messages subcollection

---

### Issue: Frontend not sending conversationId

**Symptoms**: New conversation on every message

**Solutions**:
1. Check browser console for `conversationId` in logs
2. Verify frontend state persistence
3. Don't refresh page between messages

---

### Issue: Firestore write errors

**Symptoms**: Messages not appearing in Firestore

**Solutions**:
1. Check Firebase credentials in `.env`
2. Verify Firestore rules allow writing to `chats` collection
3. Check backend logs for error messages

---

### Issue: LLM responses ignore context

**Symptoms**: Context retrieved but bot doesn't use it

**Solutions**:
1. This is an LLM behavior issue, not a technical bug
2. Check prompt construction in logs
3. May need to adjust system prompt instructions
4. Try different `OPENROUTER_CHAT_MODEL`

---

## Quick Debug Commands

### Check Firestore manually
```javascript
// In Firebase Console → Firestore → Query
Collection: chats
Document: [paste conversationId]
Subcollection: messages
Order by: timestamp
```

### Test API directly
```bash
# Terminal 1: Watch logs
npm run dev

# Terminal 2: Send test request
curl -X POST http://localhost:3001/api/chat \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hi, my name is Test",
    "context": {"firstName": "Test"}
  }'

# Copy conversationId from response, send follow-up
curl -X POST http://localhost:3001/api/chat \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What jobs are available?",
    "conversationId": "conv_PASTE_HERE",
    "context": {"firstName": "Test"}
  }'
```

---

## Success Checklist

After completing all tests:

- [ ] Context retrieval works (Test 1 passes)
- [ ] Follow-up questions work (Test 2 passes)
- [ ] New conversations start fresh (Test 3 passes)
- [ ] Toggle works (Test 4 passes)
- [ ] Firestore structure is correct
- [ ] Logs show context usage
- [ ] Performance impact < 100ms
- [ ] Frontend persists conversationId
- [ ] No crashes or errors

---

## Next Steps After Testing

If all tests pass:

1. ✅ Update `.env` for production deployment
2. ✅ Monitor logs in production for context usage
3. ✅ Collect user feedback on conversation quality
4. ✅ Consider adjusting `CHAT_CONTEXT_TURNS` based on usage
5. ✅ Document any edge cases discovered

If tests fail:

1. 📋 Create bug report using template in `tests/chat-context.test.md`
2. 📋 Include relevant logs and Firestore screenshots
3. 📋 Note which specific test failed and why

---

**Testing Time**: ~20 minutes total  
**Difficulty**: Easy  
**Required**: Firebase Console access, backend logs, browser console
