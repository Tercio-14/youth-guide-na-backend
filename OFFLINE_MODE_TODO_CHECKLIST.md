# 🎯 Offline Mode: Remaining Work Checklist

**Overall Progress:** 35% Complete (Stage 1 of 4 done)

---

## ✅ COMPLETED: Stage 1 - Backend Infrastructure (Week 1)

### Stage 1.1: Offline Data Storage ✅
- [x] Create `data/offline/` directory structure
- [x] Create template files (defaultUser.json, defaultChats.json, defaultSaved.json)
- [x] Create active data files (offlineUser.json, offlineSaved.json, offlineChats.json, syncQueue.json)
- [x] Create `.gitignore` for offline data
- [x] Build `offline-storage.js` utility (350+ lines)
  - [x] `initializeOfflineStorage()`
  - [x] `readOfflineData(dataType)`
  - [x] `writeOfflineData(dataType, data)`
  - [x] `resetOfflineData(dataType)`
  - [x] `appendChatMessage(conversationId, message)`
  - [x] `getConversation(conversationId)`

### Stage 1.2: User Profile API ✅
- [x] `GET /api/offline/user` - Get offline user profile
- [x] `POST /api/offline/user` - Update offline user profile
- [x] `POST /api/offline/user/reset` - Reset to default

### Stage 1.3: Saved Opportunities API ✅
- [x] `GET /api/offline/saved` - Get all saved opportunities
- [x] `POST /api/offline/saved` - Save new opportunity
- [x] `DELETE /api/offline/saved/:id` - Remove saved opportunity
- [x] `GET /api/offline/saved/:id` - Get specific saved opportunity

### Stage 1.4: Chat History API ✅
- [x] `GET /api/offline/chats` - Get all conversations
- [x] `GET /api/offline/chats/:id` - Get specific conversation
- [x] `POST /api/offline/chats/:id` - Append message to conversation
- [x] `DELETE /api/offline/chats/:id` - Delete conversation
- [x] `POST /api/offline/chats/new` - Create new conversation

### Stage 1.5: Mock LLM Generator ✅
- [x] Create `mock-llm.js` (400+ lines)
- [x] Implement intent detection (9 categories)
  - [x] greeting
  - [x] job_search
  - [x] training
  - [x] scholarship
  - [x] internship
  - [x] help
  - [x] location
  - [x] salary
  - [x] general
- [x] Create 30+ response template variations
- [x] Add closing phrases for natural flow
- [x] Handle no-results scenarios
- [x] Export `generateMockResponse(message, opportunities)`

### Stage 1.6: Offline Chat Endpoint ✅
- [x] `POST /api/offline/chat` - Process message with mock LLM
- [x] Integrate RAG retrieval
- [x] Integrate mock LLM generator
- [x] Save conversation to offlineChats.json
- [x] Return response in same format as online endpoint

### Stage 1.7: RAG Offline Support ✅
- [x] Modify `hybridRetrieveOpportunities()` to accept `isOfflineMode` parameter
- [x] Force `dummy-opportunities.json` when offline
- [x] Skip AI reranking (Stage 2) when offline
- [x] Return metadata: `{ opportunities, isOffline, usedAI, dataSource }`
- [x] Preserve online mode functionality (backward compatible)

### Stage 1.8: Route Registration ✅
- [x] Register offline routes in `app.js`
- [x] Add "OFFLINE MODE:" comments for clarity

---

## 🔄 IN PROGRESS: Stage 2 - Frontend Offline Context (Week 2)

**Estimated Time:** 6-8 hours

### Stage 2.1: Create OfflineContext ⏳
- [ ] Create `src/contexts/OfflineContext.jsx`
- [ ] Define state:
  ```javascript
  {
    isOffline: boolean,           // Network status
    offlineUser: object,          // Offline user profile
    savedOpportunities: array,    // Offline saved items
    conversations: array,         // Offline chat history
    isLoading: boolean,          // Loading state
    lastSync: timestamp          // Last online sync
  }
  ```
- [ ] Implement actions:
  - [ ] `loadOfflineData()` - Load from backend
  - [ ] `updateOfflineUser(data)` - Update profile
  - [ ] `saveOpportunity(opp)` - Save opportunity offline
  - [ ] `removeOpportunity(id)` - Remove saved opportunity
  - [ ] `addChatMessage(conversationId, message)` - Add message
  - [ ] `syncToOnline()` - Sync offline data to Firebase
  - [ ] `resetOffline()` - Reset to defaults
- [ ] Create `useOffline()` hook for easy access
- [ ] Add network status detection (window.navigator.onLine)
- [ ] Add automatic mode switching on network change

### Stage 2.2: Update API Client ⏳
- [ ] Modify `src/utils/api.js`
- [ ] Add offline detection to all API calls
- [ ] Route to `/api/offline/*` when offline
- [ ] Route to `/api/*` when online
- [ ] Example implementation:
  ```javascript
  async function sendChatMessage(message, conversationId) {
    const { isOffline } = useOffline();
    const endpoint = isOffline 
      ? '/api/offline/chat' 
      : '/api/chat';
    return fetch(endpoint, { ... });
  }
  ```
- [ ] Preserve same function signatures (transparent to pages)
- [ ] Add error handling for mode switching

### Stage 2.3: Modify Auth Context ⏳
- [ ] Modify `src/contexts/AuthContext.jsx`
- [ ] Skip Firebase authentication when offline
- [ ] Use offline user profile instead
- [ ] Preserve `currentUser` API compatibility
- [ ] Example:
  ```javascript
  const currentUser = isOffline 
    ? offlineUser 
    : firebaseUser;
  ```
- [ ] Add `isOfflineMode` flag to context
- [ ] Update `useAuth()` hook

---

## 📋 PENDING: Stage 3 - Update Chat Page (Week 2-3)

**Estimated Time:** 4-6 hours

### Stage 3.1: Chat Page Offline Support ⏳
- [ ] Modify `src/pages/Chat.tsx`
- [ ] Import `useOffline()` hook
- [ ] Detect offline mode: `const { isOffline } = useOffline()`
- [ ] Use offline chat endpoint when offline
- [ ] Show offline indicator in chat header
- [ ] Add offline badge to messages
- [ ] Display "🤖 Simulated Response" badge on bot messages
- [ ] Update saved opportunity button for offline mode
- [ ] Test chat flow end-to-end in offline mode

### Stage 3.2: AnimatedMessage Offline Support ⏳
- [ ] Modify `src/components/chat/AnimatedMessage.tsx`
- [ ] Accept `isOffline` prop
- [ ] Show offline badge on opportunities
- [ ] Update saved opportunity handler for offline
- [ ] Call `/api/offline/saved` when offline
- [ ] Show "💾 Saved Offline (Will sync when online)" message

---

## 📋 PENDING: Stage 4 - Update Profile & Saved Pages (Week 3)

**Estimated Time:** 3-4 hours

### Stage 4.1: Profile Page Offline Support ⏳
- [ ] Modify `src/pages/Profile.tsx`
- [ ] Load offline user profile when offline
- [ ] Enable editing in offline mode
- [ ] Save to `/api/offline/user` when offline
- [ ] Show "Changes will sync when online" message
- [ ] Add offline indicator banner
- [ ] Disable Firebase profile picture upload when offline
- [ ] Test profile updates in offline mode

### Stage 4.2: Saved Page Offline Support ⏳
- [ ] Modify `src/pages/Saved.tsx`
- [ ] Load from `/api/offline/saved` when offline
- [ ] Enable removing saved items in offline mode
- [ ] Show "💾 Saved Offline" badges
- [ ] Add "Sync to Online" button
- [ ] Queue sync actions in `syncQueue.json`
- [ ] Test save/remove in offline mode

---

## 📋 PENDING: Stage 5 - Enhanced UX (Week 3)

**Estimated Time:** 4-5 hours

### Stage 5.1: Offline Banner Component ⏳
- [ ] Create `src/components/OfflineBanner.tsx`
- [ ] Design: Persistent banner at top of app
- [ ] Text: "🔴 Offline Mode - Using Simulation Data"
- [ ] Show data source: "Using 25 sample opportunities"
- [ ] Add "Switch to Online" button (when network available)
- [ ] Make dismissible (but reappears on reload)
- [ ] Add to `App.tsx` layout

### Stage 5.2: Offline Badges ⏳
- [ ] Create `src/components/OfflineBadge.tsx`
- [ ] Badge types:
  - [ ] "📦 Offline Data" for opportunities
  - [ ] "🤖 Simulated Response" for bot messages
  - [ ] "💾 Saved Offline" for saved items
  - [ ] "⏳ Pending Sync" for unsaved changes
- [ ] Add to opportunity cards
- [ ] Add to chat messages
- [ ] Add to saved items

### Stage 5.3: Offline Status Component ⏳
- [ ] Create `src/components/OfflineStatus.tsx`
- [ ] Show network status: "Online" / "Offline"
- [ ] Show data source: "108 opportunities" / "25 sample opportunities"
- [ ] Show last sync time
- [ ] Show pending sync count
- [ ] Add to sidebar or header

### Stage 5.4: Mode Switching UX ⏳
- [ ] Create `src/components/ModeSwitcher.tsx`
- [ ] Manual mode toggle (for testing)
- [ ] Automatic mode switching on network change
- [ ] Show notification when switching modes
- [ ] Ask to sync when going online
- [ ] Smooth transition animation

---

## 📋 PENDING: Stage 6 - Sync Queue Implementation (Week 3-4)

**Estimated Time:** 5-6 hours

### Stage 6.1: Sync Queue Logic ⏳
- [ ] Create `src/utils/syncQueue.js`
- [ ] Queue action types:
  - [ ] Profile updates
  - [ ] Saved opportunities
  - [ ] Chat history
  - [ ] Removed saved items
- [ ] Implement `addToSyncQueue(action)`
- [ ] Implement `processSyncQueue()` - Execute when online
- [ ] Implement `clearSyncQueue()` - After successful sync
- [ ] Handle sync conflicts

### Stage 6.2: Sync UI ⏳
- [ ] Create `src/components/SyncStatus.tsx`
- [ ] Show pending sync count
- [ ] Show sync progress
- [ ] Show sync errors
- [ ] Add "Sync Now" button
- [ ] Add "Discard Offline Changes" button
- [ ] Show success/error notifications

---

## 📋 PENDING: Stage 7 - Testing (Week 4)

**Estimated Time:** 8-10 hours

### 🚨 CRITICAL: Online Mode Regression Testing ⏳
**Priority: HIGH - Must verify no breaking changes**

- [ ] Test all original online features
  - [ ] Chat with real LLM works
  - [ ] Firebase authentication works
  - [ ] Profile updates sync to Firebase
  - [ ] Saved opportunities sync to Firebase
  - [ ] RAG with AI reranking works
  - [ ] Chat history persists correctly
  - [ ] Search/filter opportunities
  - [ ] Admin panel (if applicable)
- [ ] Test performance (no degradation)
- [ ] Test all API endpoints
- [ ] Test error handling
- [ ] Test edge cases

### Stage 7.1: Offline Mode Unit Tests ⏳
- [ ] Test OfflineContext
  - [ ] State updates correctly
  - [ ] Actions work as expected
  - [ ] Network detection works
- [ ] Test offline API client routing
  - [ ] Routes to `/api/offline/*` when offline
  - [ ] Routes to `/api/*` when online
- [ ] Test sync queue
  - [ ] Actions added correctly
  - [ ] Processing works
  - [ ] Conflicts handled

### Stage 7.2: Offline Mode Integration Tests ⏳
- [ ] Test chat flow offline
  - [ ] Send message
  - [ ] Receive mock response
  - [ ] See opportunities
  - [ ] Save opportunity
  - [ ] Conversation persists
- [ ] Test profile updates offline
  - [ ] Update profile
  - [ ] Changes persist
  - [ ] Sync to online works
- [ ] Test saved opportunities offline
  - [ ] Save opportunity
  - [ ] Remove opportunity
  - [ ] View saved items
  - [ ] Sync to online works

### Stage 7.3: Mode Switching Tests ⏳
- [ ] Test online → offline transition
  - [ ] Network disconnects
  - [ ] App switches to offline mode
  - [ ] Offline data loads
  - [ ] User can continue working
- [ ] Test offline → online transition
  - [ ] Network reconnects
  - [ ] App detects online mode
  - [ ] Sync prompt appears
  - [ ] Data syncs successfully
  - [ ] App switches to online mode
- [ ] Test repeated switching
  - [ ] No data loss
  - [ ] No conflicts
  - [ ] Smooth transitions

### Stage 7.4: Edge Cases & Error Handling ⏳
- [ ] Test with no network on app start
- [ ] Test with network loss during chat
- [ ] Test with failed sync
- [ ] Test with sync conflicts
- [ ] Test with corrupted offline data
- [ ] Test with full storage
- [ ] Test with rapid mode switching
- [ ] Test with multiple browser tabs

### Stage 7.5: User Acceptance Testing ⏳
- [ ] Test with real users
- [ ] Gather feedback on UX
- [ ] Test on different devices
- [ ] Test on different browsers
- [ ] Test on different network conditions

---

## 📋 PENDING: Stage 8 - Documentation (Week 4)

**Estimated Time:** 3-4 hours

### Stage 8.1: User Documentation ⏳
- [ ] Create `OFFLINE_MODE_USER_GUIDE.md`
  - [ ] What is offline mode?
  - [ ] How to use offline mode
  - [ ] What works offline vs. online
  - [ ] How to sync data
  - [ ] Troubleshooting
  - [ ] FAQ

### Stage 8.2: Technical Documentation ⏳
- [ ] Create `OFFLINE_MODE_ARCHITECTURE.md`
  - [ ] System architecture
  - [ ] Data flow diagrams
  - [ ] API documentation
  - [ ] Storage structure
  - [ ] Sync logic
  - [ ] Testing strategy

### Stage 8.3: Update README ⏳
- [ ] Add "Offline Mode" section
- [ ] Add setup instructions
- [ ] Add testing instructions
- [ ] Add screenshots/GIFs
- [ ] Add troubleshooting section

### Stage 8.4: Code Documentation ⏳
- [ ] Add JSDoc to all offline functions
- [ ] Add inline comments
- [ ] Update API documentation
- [ ] Document sync queue format
- [ ] Document offline data structure

---

## 📊 Progress Summary

### Overall Completion: 35%

| Stage | Status | Progress | Estimated Time | Actual Time |
|-------|--------|----------|----------------|-------------|
| **1. Backend Infrastructure** | ✅ Complete | 100% | 10-12h | ~12h |
| **2. Frontend Offline Context** | ⏳ Pending | 0% | 6-8h | - |
| **3. Update Chat Page** | ⏳ Pending | 0% | 4-6h | - |
| **4. Update Profile & Saved** | ⏳ Pending | 0% | 3-4h | - |
| **5. Enhanced UX** | ⏳ Pending | 0% | 4-5h | - |
| **6. Sync Queue** | ⏳ Pending | 0% | 5-6h | - |
| **7. Testing** | ⏳ Pending | 0% | 8-10h | - |
| **8. Documentation** | ⏳ Pending | 0% | 3-4h | - |
| **TOTAL** | **In Progress** | **35%** | **43-55h** | **~12h** |

### Remaining Work: ~31-43 hours

---

## 🎯 Next Immediate Steps

### Step 1: Create OfflineContext (2-3 hours)
1. Create `src/contexts/OfflineContext.jsx`
2. Define state and actions
3. Create `useOffline()` hook
4. Add network detection
5. Test context functionality

### Step 2: Update API Client (1-2 hours)
1. Modify `src/utils/api.js`
2. Add offline routing logic
3. Test API routing

### Step 3: Update Auth Context (1 hour)
1. Modify `src/contexts/AuthContext.jsx`
2. Skip Firebase when offline
3. Use offline user profile
4. Test auth flow

### Step 4: Update Chat Page (2-3 hours)
1. Modify `src/pages/Chat.tsx`
2. Add offline detection
3. Show offline indicators
4. Test chat flow

---

## ⚠️ Critical Reminders

### Must Do:
1. **🚨 ONLINE MODE REGRESSION TESTING** - Top priority after frontend complete
2. Test on multiple browsers (Chrome, Firefox, Safari, Edge)
3. Test on mobile devices
4. Test with slow/unstable networks
5. Test sync conflicts
6. Document all edge cases

### Must NOT Do:
1. ❌ Do NOT break existing online functionality
2. ❌ Do NOT add dependencies without approval
3. ❌ Do NOT skip testing phase
4. ❌ Do NOT deploy without documentation

---

## 📝 Notes

### Design Principles
- **Transparency:** Users should know when they're offline
- **Seamless:** Switching modes should be smooth
- **Safe:** No data loss during mode switching
- **Backward Compatible:** Online mode works exactly as before

### Key Decisions
- File-based storage (no SQLite)
- Atomic writes (no corruption)
- Template system (easy reset)
- `/api/offline/*` prefix (clear separation)
- Mock LLM (realistic responses)
- Stage 1 RAG only (no AI offline)

### Success Criteria
- [ ] All features work offline
- [ ] Online mode unchanged
- [ ] Smooth mode switching
- [ ] Clear user feedback
- [ ] Data syncs correctly
- [ ] No data loss
- [ ] Good performance
- [ ] Well documented

---

**Last Updated:** January 2025  
**Current Stage:** Stage 1 Complete, Stage 2 Starting  
**Next Milestone:** Frontend Offline Context Complete
