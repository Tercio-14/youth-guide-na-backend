# 🎯 Offline Mode - Full Local Simulation Mode TODO List

## 📋 Project Overview

**Goal:** Extend Phase 1 to create a fully functional offline simulation environment that mimics online behavior using local JSON storage.

**Critical Rule:** 🚨 **ONLINE MODE MUST REMAIN 100% UNCHANGED AND FUNCTIONAL** 🚨

---

## ✅ Phase 1 Status: COMPLETE
- [x] Network detection hook
- [x] Offline banner component
- [x] Visual indicators
- [x] Toast notifications

---

## 📦 Phase 2: Full Local Simulation Mode

### **Stage 1: Backend - Local Storage Infrastructure** ⏱️ Est: 6-8 hours

#### 1.1 Create Offline Data Storage System
- [ ] **Task 1.1.1:** Create `data/offline/` directory structure
  - [ ] Create `data/offline/offlineUser.json`
  - [ ] Create `data/offline/offlineSavedOpportunities.json`
  - [ ] Create `data/offline/offlineChats.json`
  - [ ] Create `data/offline/offlineConversations.json`
  - [ ] Create `.gitignore` entry for `data/offline/*.json` (except templates)

- [ ] **Task 1.1.2:** Create default data templates
  - [ ] `data/offline/templates/defaultUser.json` - Default offline user profile
  - [ ] `data/offline/templates/defaultChats.json` - Empty chat history structure
  - [ ] `data/offline/templates/defaultSaved.json` - Empty saved opportunities

- [ ] **Task 1.1.3:** Create offline data utilities (`src/utils/offline-storage.js`)
  - [ ] `initializeOfflineStorage()` - Create directories and default files
  - [ ] `readOfflineData(filename)` - Read JSON file safely
  - [ ] `writeOfflineData(filename, data)` - Write JSON file safely
  - [ ] `resetOfflineData()` - Reset all offline data to defaults
  - [ ] Add error handling and file locking

#### 1.2 Create Offline User Profile API
- [ ] **Task 1.2.1:** Create `src/routes/offline.js` - New route file
  - [ ] `GET /api/offline/user` - Get offline user profile
  - [ ] `POST /api/offline/user` - Update offline user profile
  - [ ] `POST /api/offline/user/reset` - Reset to default

- [ ] **Task 1.2.2:** Register offline routes in `src/app.js`
  - [ ] Add `app.use('/api/offline', offlineRoutes)`
  - [ ] Add route only when `process.env.ENABLE_OFFLINE_MODE === 'true'` or always enable

#### 1.3 Create Offline Saved Opportunities API
- [ ] **Task 1.3.1:** Extend `src/routes/offline.js`
  - [ ] `GET /api/offline/saved` - Get all saved opportunities
  - [ ] `POST /api/offline/saved` - Save an opportunity
  - [ ] `DELETE /api/offline/saved/:id` - Unsave an opportunity
  - [ ] `GET /api/offline/saved/:id` - Check if opportunity is saved

#### 1.4 Create Offline Chat History API
- [ ] **Task 1.4.1:** Extend `src/routes/offline.js`
  - [ ] `GET /api/offline/chats` - Get all offline conversations
  - [ ] `GET /api/offline/chats/:conversationId` - Get specific conversation
  - [ ] `POST /api/offline/chats/:conversationId` - Add message to conversation
  - [ ] `DELETE /api/offline/chats/:conversationId` - Delete conversation
  - [ ] `POST /api/offline/chats/new` - Create new conversation

#### 1.5 Create Mock LLM Response Generator
- [ ] **Task 1.5.1:** Create `src/utils/mock-llm.js`
  - [ ] Create response templates library (20-30 diverse responses)
  - [ ] `generateMockResponse(userMessage, opportunities)` - Generate realistic response
  - [ ] Intent detection (greeting, job search, training, help, general)
  - [ ] Dynamic response based on user message keywords
  - [ ] Include opportunities in response naturally

- [ ] **Task 1.5.2:** Create mock response categories
  - [ ] Greeting responses (5+ variations)
  - [ ] Job search responses (5+ variations)
  - [ ] Training/education responses (5+ variations)
  - [ ] Help/guidance responses (5+ variations)
  - [ ] General/fallback responses (5+ variations)

#### 1.6 Create Offline Chat Endpoint
- [ ] **Task 1.6.1:** Create `POST /api/offline/chat` endpoint
  - [ ] Accept same payload as online chat endpoint
  - [ ] Use dummy-opportunities.json for RAG retrieval
  - [ ] Use mock LLM for response generation
  - [ ] Save conversation to offlineChats.json
  - [ ] Return same response format as online endpoint

#### 1.7 Update RAG System for Offline Mode
- [ ] **Task 1.7.1:** Update `src/utils/rag.js`
  - [ ] Add `isOfflineMode` parameter to `hybridRetrieveOpportunities()`
  - [ ] Force use of `dummy-opportunities.json` when offline
  - [ ] Skip AI reranking when offline (use TF-IDF only)
  - [ ] Add fallback logic if dummy data fails to load

---

### **Stage 2: Frontend - Offline Mode Detection & Switching** ⏱️ Est: 4-6 hours

#### 2.1 Create Offline Context Provider
- [ ] **Task 2.1.1:** Create `src/contexts/OfflineContext.tsx`
  - [ ] State: `isOffline`, `offlineUser`, `offlineData`
  - [ ] `useOnlineStatus()` hook integration
  - [ ] Auto-load offline data when going offline
  - [ ] Auto-clear offline data when going online
  - [ ] Provide context to entire app

- [ ] **Task 2.1.2:** Wrap App with OfflineContext
  - [ ] Update `src/main.tsx` or `src/App.tsx`
  - [ ] Ensure context is above AuthContext

#### 2.2 Create Offline API Client
- [ ] **Task 2.2.1:** Extend `src/utils/api.js`
  - [ ] Add `offlineMode` property to ApiClient
  - [ ] Create `apiClient.setOfflineMode(isOffline)` method
  - [ ] Route requests to `/api/offline/*` when offline
  - [ ] Keep `/api/*` for online requests

- [ ] **Task 2.2.2:** Update request method
  - [ ] Check `offlineMode` flag before making request
  - [ ] Redirect chat requests to `/api/offline/chat` when offline
  - [ ] Redirect saved requests to `/api/offline/saved` when offline
  - [ ] Redirect user requests to `/api/offline/user` when offline

#### 2.3 Update Auth Context for Offline Mode
- [ ] **Task 2.3.1:** Update `src/contexts/AuthContext.jsx`
  - [ ] Add `isOfflineMode` state
  - [ ] Skip Firebase auth when offline
  - [ ] Load offline user from `/api/offline/user` when offline
  - [ ] Set `user`, `token`, `userProfile` to offline data
  - [ ] Prevent logout when offline

---

### **Stage 3: Frontend - Chat Component Offline Integration** ⏱️ Est: 6-8 hours

#### 3.1 Update Chat Page for Offline Mode
- [ ] **Task 3.1.1:** Update `src/pages/Chat.tsx`
  - [ ] Import and use OfflineContext
  - [ ] Detect when offline mode is active
  - [ ] Load offline conversation history on mount
  - [ ] Save messages to offline storage

- [ ] **Task 3.1.2:** Update message sending logic
  - [ ] Check if offline before sending
  - [ ] Call `/api/offline/chat` when offline
  - [ ] Call `/api/chat` when online
  - [ ] Show different loading indicator for offline mode

- [ ] **Task 3.1.3:** Update conversation history loading
  - [ ] Load from `/api/offline/chats` when offline
  - [ ] Load from `/api/chat/conversation/:id` when online
  - [ ] Merge logic with single component state

#### 3.2 Update AnimatedMessage for Offline Saved Opportunities
- [ ] **Task 3.2.1:** Update `src/components/chat/AnimatedMessage.tsx`
  - [ ] Pass `isOffline` prop
  - [ ] Route save/unsave to offline endpoints when offline
  - [ ] Show "Saved locally" badge when offline
  - [ ] Update feedback logic for offline mode

---

### **Stage 4: Frontend - Profile & Saved Pages Offline Support** ⏱️ Est: 4-6 hours

#### 4.1 Update Profile Page
- [ ] **Task 4.1.1:** Update `src/pages/Profile.tsx`
  - [ ] Detect offline mode
  - [ ] Load offline user from context
  - [ ] Save changes to `/api/offline/user` when offline
  - [ ] Show "Changes saved locally" message
  - [ ] Disable fields that require online (if any)

#### 4.2 Update Saved Opportunities Page
- [ ] **Task 4.2.1:** Update `src/pages/Saved.tsx`
  - [ ] Detect offline mode
  - [ ] Load saved opportunities from `/api/offline/saved` when offline
  - [ ] Show "Viewing offline saved items" banner
  - [ ] Allow unsaving when offline

---

### **Stage 5: Enhanced Offline UX** ⏱️ Est: 4-5 hours

#### 5.1 Add Offline Mode Indicators
- [ ] **Task 5.1.1:** Update OfflineBanner component
  - [ ] Show "Offline Mode Active" instead of generic message
  - [ ] Add explanation of local simulation mode
  - [ ] Show button to view offline mode status

- [ ] **Task 5.1.2:** Create OfflineStatus component
  - [ ] Show offline user name
  - [ ] Show data source (dummy opportunities)
  - [ ] Show local storage status
  - [ ] Add "Reset Offline Data" button

#### 5.2 Add Offline Message Indicators
- [ ] **Task 5.2.1:** Update AnimatedMessage component
  - [ ] Add visual badge: "💾 Offline Simulation"
  - [ ] Show mock LLM indicator on bot messages
  - [ ] Style differently from online messages

#### 5.3 Add Transition Notifications
- [ ] **Task 5.3.1:** Update OfflineBanner
  - [ ] Show toast: "Switched to Offline Simulation Mode"
  - [ ] Show toast: "Back Online - Restored Full Features"
  - [ ] Explain what changed in each transition

---

### **Stage 6: Data Synchronization (Optional but Recommended)** ⏱️ Est: 6-8 hours

#### 6.1 Create Sync Queue System
- [ ] **Task 6.1.1:** Create `src/utils/sync-queue.js` (backend)
  - [ ] Store pending actions when offline
  - [ ] Actions: saved_opportunity, unsaved_opportunity, profile_update
  - [ ] Write to `data/offline/syncQueue.json`

- [ ] **Task 6.1.2:** Create sync processor
  - [ ] Process queue when going back online
  - [ ] Replay saved opportunities to Firestore
  - [ ] Update profile in Firestore
  - [ ] Clear queue after successful sync

#### 6.2 Add Sync Notifications
- [ ] **Task 6.2.1:** Show sync progress
  - [ ] "Syncing 3 saved opportunities..."
  - [ ] "Profile changes uploaded"
  - [ ] "Sync complete!"

---

### **Stage 7: Testing & Quality Assurance** ⏱️ Est: 8-10 hours

#### 7.1 Unit Tests
- [ ] **Task 7.1.1:** Test offline storage utilities
  - [ ] Test file creation
  - [ ] Test read/write operations
  - [ ] Test error handling

- [ ] **Task 7.1.2:** Test mock LLM generator
  - [ ] Test intent detection
  - [ ] Test response generation
  - [ ] Test opportunity formatting

#### 7.2 Integration Tests
- [ ] **Task 7.2.1:** Test offline API endpoints
  - [ ] Test user profile CRUD
  - [ ] Test saved opportunities CRUD
  - [ ] Test chat history CRUD
  - [ ] Test offline chat endpoint

- [ ] **Task 7.2.2:** Test mode switching
  - [ ] Test online → offline transition
  - [ ] Test offline → online transition
  - [ ] Test data persistence
  - [ ] Test sync queue

#### 7.3 Manual Testing
- [ ] **Task 7.3.1:** Comprehensive offline workflow test
  - [ ] Go offline
  - [ ] Send messages
  - [ ] Save opportunities
  - [ ] Update profile
  - [ ] Reload page (persistence test)
  - [ ] Go online
  - [ ] Verify sync (if implemented)

- [ ] **Task 7.3.2:** Online mode regression testing
  - [ ] 🚨 **CRITICAL:** Test all online features work exactly as before
  - [ ] Test normal chat flow
  - [ ] Test saving opportunities
  - [ ] Test profile updates
  - [ ] Test authentication
  - [ ] Test all API endpoints
  - [ ] Verify no offline code interferes

#### 7.4 Edge Case Testing
- [ ] **Task 7.4.1:** Test edge cases
  - [ ] Multiple rapid offline/online toggles
  - [ ] Offline data corruption
  - [ ] Large conversation history
  - [ ] Network failures mid-request
  - [ ] Concurrent requests

---

### **Stage 8: Documentation** ⏱️ Est: 3-4 hours

#### 8.1 User Documentation
- [ ] **Task 8.1.1:** Create `OFFLINE_SIMULATION_MODE_GUIDE.md`
  - [ ] Explain local simulation mode
  - [ ] Document offline features
  - [ ] Document limitations
  - [ ] Testing instructions

#### 8.2 Developer Documentation
- [ ] **Task 8.2.1:** Create `OFFLINE_MODE_ARCHITECTURE.md`
  - [ ] Explain mode switching logic
  - [ ] Document API endpoints
  - [ ] Document data storage format
  - [ ] Document mock LLM behavior

#### 8.3 Update Existing Documentation
- [ ] **Task 8.3.1:** Update `README.md`
  - [ ] Add offline mode section
  - [ ] Add testing instructions

---

## 🎯 Implementation Priority Order

### **Week 1: Backend Foundation**
1. ✅ Stage 1.1 - Local storage infrastructure (Day 1-2)
2. ✅ Stage 1.2 - Offline user API (Day 2-3)
3. ✅ Stage 1.3 - Offline saved opportunities API (Day 3-4)
4. ✅ Stage 1.4 - Offline chat history API (Day 4-5)

### **Week 2: Backend Logic + Frontend Foundation**
5. ✅ Stage 1.5 - Mock LLM generator (Day 6-7)
6. ✅ Stage 1.6 - Offline chat endpoint (Day 7-8)
7. ✅ Stage 1.7 - RAG system updates (Day 8-9)
8. ✅ Stage 2.1 - Offline context provider (Day 9-10)

### **Week 3: Frontend Integration**
9. ✅ Stage 2.2 - Offline API client (Day 11-12)
10. ✅ Stage 2.3 - Auth context updates (Day 12-13)
11. ✅ Stage 3.1 - Chat component integration (Day 13-15)
12. ✅ Stage 3.2 - Message component updates (Day 15-16)

### **Week 4: Polish & Testing**
13. ✅ Stage 4.1 - Profile page (Day 17-18)
14. ✅ Stage 4.2 - Saved page (Day 18-19)
15. ✅ Stage 5.1-5.3 - Enhanced UX (Day 19-21)
16. ✅ Stage 7.1-7.4 - Testing (Day 21-25)
17. ✅ Stage 8.1-8.3 - Documentation (Day 25-28)

### **Optional (Week 5+):**
18. ⭐ Stage 6.1-6.2 - Sync queue (Optional but recommended)

---

## 🔒 Critical Checkpoints (DO NOT SKIP)

### ✅ Checkpoint 1: After Stage 1 (Backend Storage)
**Test:** Can backend read/write offline JSON files?
- [ ] Files created successfully
- [ ] Data persists across server restarts
- [ ] No file corruption
- [ ] Error handling works

### ✅ Checkpoint 2: After Stage 2 (Mode Switching)
**Test:** Does offline mode activate correctly?
- [ ] Offline mode detected
- [ ] API client switches endpoints
- [ ] No online API calls when offline
- [ ] Context provides offline data

### ✅ Checkpoint 3: After Stage 3 (Chat Integration)
**Test:** Can user send messages offline?
- [ ] Messages sent successfully
- [ ] Mock responses generated
- [ ] Conversation persists
- [ ] Opportunities displayed

### 🚨 **CHECKPOINT 4: ONLINE MODE REGRESSION TEST** 🚨
**Test:** Does online mode still work EXACTLY as before?
- [ ] Normal authentication works
- [ ] Chat sends to real LLM
- [ ] Firestore saving works
- [ ] Profile updates work
- [ ] All original features intact
- [ ] NO offline code interference

### ✅ Checkpoint 5: After Stage 4 (Full Integration)
**Test:** All pages work offline?
- [ ] Profile page offline
- [ ] Saved page offline
- [ ] Chat page offline
- [ ] Navigation works

### ✅ Checkpoint 6: After Stage 5 (UX)
**Test:** User experience quality?
- [ ] Clear offline indicators
- [ ] Smooth transitions
- [ ] Helpful messages
- [ ] No confusion

---

## 📊 Progress Tracking

### Overall Progress: 0% Complete

**Backend:** 0/7 stages complete
**Frontend:** 0/5 stages complete  
**Testing:** 0/4 stages complete
**Documentation:** 0/3 stages complete

---

## 🎯 Success Criteria

### Minimum Viable Product (MVP):
- [ ] User can go offline and continue chatting
- [ ] User can save opportunities offline
- [ ] User can update profile offline
- [ ] All data persists across reloads
- [ ] Mock responses feel natural
- [ ] **🚨 ONLINE MODE WORKS 100% AS BEFORE 🚨**

### Full Feature Complete:
- [ ] All MVP criteria
- [ ] Enhanced UX with clear indicators
- [ ] Smooth mode transitions
- [ ] Comprehensive documentation
- [ ] All tests passing
- [ ] Sync queue working (if implemented)

---

## ⚠️ Risks & Mitigation

### Risk 1: Breaking Online Mode
**Mitigation:** 
- Test online mode after EVERY change
- Use feature flags to disable offline code
- Isolate offline code in separate files

### Risk 2: File Locking Issues
**Mitigation:**
- Use proper file locking mechanisms
- Add retry logic for file operations
- Use atomic write operations

### Risk 3: Mock Responses Not Realistic
**Mitigation:**
- Create diverse response library
- Test with real user queries
- Iterate based on feedback

### Risk 4: Data Loss on Sync
**Mitigation:**
- Implement robust sync queue
- Add conflict resolution
- Backup offline data before sync

---

## 🚀 Ready to Start!

**Current Status:** 📋 Planning Complete
**Next Action:** Start Stage 1.1 - Create offline data storage system

**Estimated Total Time:** 40-60 hours (1-2 months part-time)

---

## 📝 Notes

- Keep all offline code clearly separated
- Add comments: `// OFFLINE MODE: ...`
- Test online mode frequently
- Document all decisions
- Ask for feedback early

---

**Let's build this! 🎉**
