# 🎯 Offline Mode Quick Reference

**Last Updated:** January 2025  
**Overall Progress:** 35% (Stage 1 Complete)

---

## 📊 Status Overview

```
✅ Stage 1: Backend Infrastructure (100%)
⏳ Stage 2: Frontend Context (0%)
⏳ Stage 3: Update Pages (0%)
⏳ Stage 4: Enhanced UX (0%)
⏳ Stage 5: Testing (0%)
⏳ Stage 6: Documentation (0%)
```

---

## 📁 Key Files

### Backend (Stage 1 - Complete)
| File | Purpose | Lines | Status |
|------|---------|-------|--------|
| `src/utils/offline-storage.js` | Storage utility | 350+ | ✅ |
| `src/routes/offline.js` | API endpoints | 618 | ✅ |
| `src/utils/mock-llm.js` | Mock LLM | 400+ | ✅ |
| `src/utils/rag.js` | RAG offline mode | 60+ | ✅ Modified |
| `src/app.js` | Route registration | 5+ | ✅ Modified |

### Data Files
| File | Purpose | Status |
|------|---------|--------|
| `data/offline/offlineUser.json` | Active user profile | ✅ Auto-created |
| `data/offline/offlineChats.json` | Conversation history | ✅ Auto-created |
| `data/offline/offlineSavedOpportunities.json` | Saved items | ✅ Auto-created |
| `data/offline/syncQueue.json` | Pending sync actions | ✅ Auto-created |

### Documentation
| File | Purpose | Status |
|------|---------|--------|
| `STAGE_1_BACKEND_COMPLETE.md` | Stage 1 summary | ✅ Complete |
| `OFFLINE_MODE_TODO_CHECKLIST.md` | Full checklist | ✅ Complete |
| `STAGE_1.7_RAG_OFFLINE_COMPLETE.md` | RAG docs | ✅ Complete |
| `OFFLINE_MODE_STAGE1_COMPLETE.md` | Detailed docs | ✅ Complete |

### Frontend (Stage 2 - Pending)
| File | Purpose | Status |
|------|---------|--------|
| `src/contexts/OfflineContext.jsx` | Offline state | ⏳ TODO |
| `src/utils/api.js` | API routing | ⏳ TODO Modified |
| `src/contexts/AuthContext.jsx` | Auth offline | ⏳ TODO Modified |
| `src/pages/Chat.tsx` | Chat offline | ⏳ TODO Modified |
| `src/pages/Profile.tsx` | Profile offline | ⏳ TODO Modified |
| `src/pages/Saved.tsx` | Saved offline | ⏳ TODO Modified |

---

## 🔌 API Endpoints (15)

### User Profile
```
GET    /api/offline/user          # Get profile
POST   /api/offline/user          # Update profile
POST   /api/offline/user/reset    # Reset to default
```

### Saved Opportunities
```
GET    /api/offline/saved         # Get all
POST   /api/offline/saved         # Save
DELETE /api/offline/saved/:id     # Remove
GET    /api/offline/saved/:id     # Get one
```

### Chat History
```
GET    /api/offline/chats         # Get all
GET    /api/offline/chats/:id     # Get one
POST   /api/offline/chats/:id     # Append message
DELETE /api/offline/chats/:id     # Delete
POST   /api/offline/chats/new     # Create new
```

### Chat Processing
```
POST   /api/offline/chat          # Send message
```

### Utility
```
GET    /api/offline/status        # Status check
POST   /api/offline/reset         # Reset all
```

---

## 🧪 Testing

### Quick Test Commands

```bash
# Test backend server
cd youth-guide-na-backend
npm start

# Test RAG offline mode
node test-rag-offline.js

# Test API endpoint (example)
curl -X POST http://localhost:3000/api/offline/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Show me tech jobs","conversationId":"conv-test"}'
```

---

## 🎯 Next Immediate Actions

### 1. Create OfflineContext (2-3 hours)
```javascript
// File: youth-guide-na/src/contexts/OfflineContext.jsx
// - Define state (isOffline, offlineUser, etc.)
// - Implement actions (loadOfflineData, syncToOnline)
// - Create useOffline() hook
// - Add network detection
```

### 2. Update API Client (1-2 hours)
```javascript
// File: youth-guide-na/src/utils/api.js
// - Add offline detection
// - Route to /api/offline/* when offline
// - Preserve function signatures
```

### 3. Update Auth Context (1 hour)
```javascript
// File: youth-guide-na/src/contexts/AuthContext.jsx
// - Skip Firebase when offline
// - Use offline user profile
// - Preserve currentUser API
```

---

## 📈 Progress Tracking

### Time Estimates
- **Stage 1 (Backend):** 12 hours ✅ COMPLETE
- **Stage 2 (Frontend Context):** 6-8 hours ⏳
- **Stage 3 (Update Pages):** 4-6 hours ⏳
- **Stage 4 (Enhanced UX):** 4-5 hours ⏳
- **Stage 5 (Testing):** 8-10 hours ⏳
- **Stage 6 (Documentation):** 3-4 hours ⏳
- **TOTAL:** 43-55 hours (35% done)

### Key Milestones
- [x] **Milestone 1:** Backend infrastructure complete (Stage 1)
- [ ] **Milestone 2:** Frontend integration complete (Stages 2-3)
- [ ] **Milestone 3:** Enhanced UX complete (Stage 4)
- [ ] **Milestone 4:** Testing complete (Stage 5)
- [ ] **Milestone 5:** Documentation complete (Stage 6)

---

## 🚨 Critical Reminders

### Must Test
- 🚨 **PRIORITY 1:** Online mode regression test
- All original features work unchanged
- No performance degradation
- Firebase authentication works
- RAG with AI reranking works

### Design Principles
- **Transparency:** Users know when offline
- **Seamless:** Smooth mode switching
- **Safe:** No data loss
- **Compatible:** Online mode unchanged

---

## 🎓 Key Concepts

### Online vs Offline

| Feature | Online | Offline |
|---------|--------|---------|
| **Data Source** | opportunities.json (108) | dummy-opportunities.json (25) |
| **Authentication** | Firebase | Local profile |
| **LLM** | OpenRouter API | Mock generator |
| **RAG** | TF-IDF + AI (2-3s) | TF-IDF only (50-100ms) |
| **Storage** | Firebase Firestore | Local JSON files |

### Data Flow

```
User → Frontend → API Client → Detect Mode → Route to Endpoint
                                    ↓
                            Online: /api/*
                            Offline: /api/offline/*
                                    ↓
                            Process → Return
```

---

## 🔗 Quick Links

### Documentation Files
1. [`STAGE_1_BACKEND_COMPLETE.md`](./STAGE_1_BACKEND_COMPLETE.md) - Stage 1 summary
2. [`OFFLINE_MODE_TODO_CHECKLIST.md`](./OFFLINE_MODE_TODO_CHECKLIST.md) - Full checklist
3. [`STAGE_1.7_RAG_OFFLINE_COMPLETE.md`](./STAGE_1.7_RAG_OFFLINE_COMPLETE.md) - RAG offline docs
4. [`OFFLINE_MODE_STAGE1_COMPLETE.md`](./OFFLINE_MODE_STAGE1_COMPLETE.md) - Detailed Stage 1 docs

### Related Files
- Original planning: Check conversation history
- Project status: `PROJECT_STATUS.md`
- Backend setup: `BACKEND_SETUP.md`

---

## 📞 Support

### If Backend Tests Fail
1. Check `data/offline/` directory exists
2. Check templates in `data/offline/templates/`
3. Run `npm start` to initialize
4. Check logs for errors

### If Frontend Issues
1. Not started yet (Stage 2 pending)
2. Backend must be running
3. Check CORS settings

### Common Issues
- **"File not found"** → Run backend server to initialize files
- **"ENOENT error"** → Check paths are correct
- **"Module not found"** → Run `npm install` in backend

---

## ✅ Quick Verification

### Backend Health Check
```bash
# 1. Files exist?
ls data/offline/offlineUser.json

# 2. Server starts?
cd youth-guide-na-backend && npm start

# 3. Endpoint works?
curl http://localhost:3000/api/offline/status

# 4. RAG works?
node test-rag-offline.js
```

### Expected Results
- ✅ 4 data files in `data/offline/`
- ✅ Server starts without errors
- ✅ Status endpoint returns JSON
- ✅ RAG test passes all checks

---

## 🎯 Success Criteria

### Stage 1 (Backend) ✅
- [x] 15 API endpoints working
- [x] Mock LLM generating responses
- [x] RAG supporting offline mode
- [x] Data persistence working
- [x] Error handling complete
- [x] Documentation complete

### Stage 2-6 (Frontend) ⏳
- [ ] OfflineContext working
- [ ] Pages work offline
- [ ] Mode switching smooth
- [ ] Visual indicators clear
- [ ] Online mode unchanged
- [ ] Testing complete

---

**Last Updated:** January 2025  
**Status:** Stage 1 Complete, Stage 2 Starting  
**Overall Progress:** 35% (12/43-55 hours)
