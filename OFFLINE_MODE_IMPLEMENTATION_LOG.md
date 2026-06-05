# 🎯 Offline Mode - Full Local Simulation Implementation Guide

## 📋 Overview

This guide tracks the implementation of **Full Local Simulation Mode** - a complete offline environment that mimics online functionality using local JSON storage.

**Critical Rule:** 🚨 **ONLINE MODE MUST REMAIN 100% UNCHANGED** 🚨

---

## 🏗️ Architecture Overview

### Mode Detection Flow
```
User loads app
    ↓
Check navigator.onLine
    ↓
┌─────────────────┬──────────────────┐
│   ONLINE MODE   │   OFFLINE MODE   │
├─────────────────┼──────────────────┤
│ Firebase Auth   │ Mock Auth        │
│ Firestore DB    │ Local JSON       │
│ OpenRouter LLM  │ Mock LLM         │
│ Real API        │ Offline API      │
│ opportunities   │ dummy-opps.json  │
└─────────────────┴──────────────────┘
```

### File Structure
```
backend/
├── data/
│   ├── opportunities.json (ONLINE)
│   ├── dummy-opportunities.json (OFFLINE)
│   └── offline/ (NEW)
│       ├── offlineUser.json
│       ├── offlineSavedOpportunities.json
│       ├── offlineChats.json
│       ├── offlineConversations.json
│       ├── syncQueue.json (optional)
│       └── templates/
│           ├── defaultUser.json
│           ├── defaultChats.json
│           └── defaultSaved.json
├── src/
│   ├── routes/
│   │   └── offline.js (NEW)
│   └── utils/
│       ├── offline-storage.js (NEW)
│       └── mock-llm.js (NEW)

frontend/
├── src/
│   ├── contexts/
│   │   └── OfflineContext.tsx (NEW)
│   └── utils/
│       └── api.js (MODIFIED - add offline routing)
```

---

## 🎯 Current Status

**Phase 1:** ✅ COMPLETE - Visual indicators and network detection

**Phase 2:** 🚧 IN PROGRESS - Full Local Simulation Mode

**Current Task:** Stage 1.1 - Create offline data storage system

---

## 📦 Stage 1.1: Backend - Offline Data Storage System

### Task 1.1.1: Create Directory Structure ✅

**What:** Create `data/offline/` with required JSON files

**Files to Create:**
1. `data/offline/offlineUser.json`
2. `data/offline/offlineSavedOpportunities.json`
3. `data/offline/offlineChats.json`
4. `data/offline/offlineConversations.json`
5. `data/offline/templates/defaultUser.json`
6. `data/offline/templates/defaultChats.json`
7. `data/offline/templates/defaultSaved.json`
8. `data/offline/.gitignore`

**Starting now...**

---

## 🔄 Implementation Log

### Session 1: October 28, 2025

**Time:** Starting now
**Goal:** Complete Stage 1.1 - Offline data storage infrastructure

**Tasks:**
1. ✅ Create TODO list (DONE)
2. ✅ Create implementation guide (DONE)
3. 🚧 Create offline directory structure (IN PROGRESS)

---

## 📝 Notes

- All offline code is isolated and won't affect online mode
- Using JSON files for simplicity (no new databases)
- Backend-first approach for easier testing
- Will test online mode after each major stage

---

**Ready to implement!** 🚀
