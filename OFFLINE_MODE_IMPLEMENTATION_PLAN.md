# Offline Mode Implementation Plan for YouthGuide NA

## Executive Summary

**Feasibility**: ✅ **YES - Highly Feasible with Graceful Degradation**

An offline mode for YouthGuide NA chatbot is **possible and practical** using modern web technologies. The implementation will provide a degraded but functional experience when internet connectivity is lost.

---

## 🎯 What's Possible Offline

### ✅ **Fully Functional Offline**
1. **Browse Cached Opportunities** - View previously loaded opportunities
2. **Basic Search** - Client-side keyword search through cached data
3. **View Saved Opportunities** - Access bookmarked opportunities
4. **Read Conversation History** - View past chat messages
5. **UI Navigation** - Full app navigation remains functional
6. **Profile Viewing** - Access user profile data

### ⚠️ **Limited Functionality Offline**
1. **Simple Chat Responses** - Predefined responses for common questions
2. **Offline RAG** - Basic keyword matching instead of AI-powered ranking
3. **Educational Content** - Show cached tips and guidance

### ❌ **Requires Internet Connection**
1. **AI-Powered Responses** - LLM API calls (OpenRouter)
2. **Fresh Opportunity Search** - Real-time data from backend
3. **AI Reranking** - Semantic understanding and scoring
4. **User Profile Updates** - Syncing with Firestore
5. **Saving New Opportunities** - Storing to Firestore
6. **Authentication** - Firebase Auth requires connectivity

---

## 🏗️ Technical Architecture

### Current Dependencies (All Require Internet)
```
User Query
    ↓
Frontend (React)
    ↓
API Call (fetch)
    ↓
Backend API (Express)
    ↓
├─ Firestore (User Profile, Saved Items)
├─ OpenRouter API (LLM Responses)
└─ Opportunities JSON (TF-IDF + AI Reranking)
    ↓
Response Back to User
```

### Proposed Offline Architecture
```
User Query
    ↓
Network Detection (navigator.onLine)
    ↓
┌───────────────┬───────────────┐
│   ONLINE      │    OFFLINE    │
├───────────────┼───────────────┤
│ Full RAG      │ IndexedDB     │
│ + AI          │ + LocalSearch │
│ + Firestore   │ + Cache       │
└───────────────┴───────────────┘
    ↓
Unified UI Response
```

---

## 💾 Storage Strategy

### 1. **IndexedDB** (Primary Offline Storage)
Store structured data for offline access:

```javascript
// Database Schema
const DB_STRUCTURE = {
  name: 'YouthGuideDB',
  version: 1,
  stores: {
    opportunities: {
      keyPath: 'id',
      indexes: ['type', 'location', 'organization', 'date_posted']
    },
    conversations: {
      keyPath: 'conversationId',
      indexes: ['timestamp', 'userId']
    },
    savedOpportunities: {
      keyPath: 'id',
      indexes: ['savedAt', 'userId']
    },
    userProfile: {
      keyPath: 'userId',
      data: {} // Current user profile
    },
    offlineQueue: {
      keyPath: 'id',
      data: [] // Queued actions to sync when online
    }
  }
};
```

**Storage Limits:**
- Chrome: ~60% of available disk space
- Firefox: ~50% of available disk space
- Safari: ~1GB limit
- **Estimated Usage**: 5-10MB for 100 opportunities + chat history

### 2. **LocalStorage** (Configuration & Small Data)
```javascript
const LOCAL_STORAGE_KEYS = {
  'offline-mode-enabled': 'true/false',
  'last-sync-timestamp': 'ISO timestamp',
  'cache-version': 'v1.0.0',
  'user-preferences': '{ ... }',
  'offline-banner-dismissed': 'timestamp'
};
```

### 3. **Service Worker Cache** (Static Assets)
```javascript
const CACHE_NAME = 'youthguide-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/assets/css/main.css',
  '/assets/js/bundle.js',
  '/assets/images/logo.svg'
];
```

---

## 🔧 Implementation Components

### 1. **Network Detection Hook** (`useOnlineStatus.ts`)

```typescript
import { useState, useEffect } from 'react';

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    function handleOnline() {
      setIsOnline(true);
      if (wasOffline) {
        // Trigger sync and show "Back online" notification
        console.log('📡 Back online - syncing data...');
        toast.success('You\'re back online! Syncing data...', {
          duration: 3000,
          icon: '🌐'
        });
        setWasOffline(false);
      }
    }

    function handleOffline() {
      setIsOnline(false);
      setWasOffline(true);
      console.log('📴 Gone offline - switching to offline mode');
      toast.warning('You\'re offline. Limited functionality available.', {
        duration: 5000,
        icon: '📴'
      });
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [wasOffline]);

  return { isOnline, wasOffline };
}
```

### 2. **IndexedDB Wrapper** (`db.ts`)

```typescript
import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface YouthGuideDB extends DBSchema {
  opportunities: {
    key: string;
    value: Opportunity;
    indexes: { 'type': string; 'location': string };
  };
  conversations: {
    key: string;
    value: Conversation;
    indexes: { 'timestamp': number };
  };
  savedOpportunities: {
    key: string;
    value: SavedOpportunity;
  };
}

class OfflineDatabase {
  private db: IDBPDatabase<YouthGuideDB> | null = null;

  async init() {
    this.db = await openDB<YouthGuideDB>('YouthGuideDB', 1, {
      upgrade(db) {
        // Create opportunities store
        const oppStore = db.createObjectStore('opportunities', { 
          keyPath: 'id' 
        });
        oppStore.createIndex('type', 'type');
        oppStore.createIndex('location', 'location');

        // Create conversations store
        const convStore = db.createObjectStore('conversations', { 
          keyPath: 'conversationId' 
        });
        convStore.createIndex('timestamp', 'timestamp');

        // Create saved opportunities store
        db.createObjectStore('savedOpportunities', { 
          keyPath: 'id' 
        });
      },
    });
  }

  async cacheOpportunities(opportunities: Opportunity[]) {
    const tx = this.db!.transaction('opportunities', 'readwrite');
    await Promise.all(
      opportunities.map(opp => tx.store.put(opp))
    );
  }

  async searchOpportunities(query: string, filters?: any) {
    const allOpps = await this.db!.getAll('opportunities');
    
    // Simple keyword matching
    const lowerQuery = query.toLowerCase();
    return allOpps.filter(opp => 
      opp.title.toLowerCase().includes(lowerQuery) ||
      opp.description?.toLowerCase().includes(lowerQuery) ||
      opp.organization?.toLowerCase().includes(lowerQuery)
    );
  }

  async saveConversation(conversation: Conversation) {
    await this.db!.put('conversations', conversation);
  }

  async getRecentConversations(limit: number = 10) {
    const allConvs = await this.db!.getAll('conversations');
    return allConvs
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }
}

export const offlineDB = new OfflineDatabase();
```

### 3. **Offline-Aware API Client** (Update `api.js`)

```javascript
class ApiClient {
  async request(endpoint, options = {}) {
    // Check if online
    if (!navigator.onLine) {
      console.log('📴 Offline - attempting offline fallback');
      return this.handleOfflineRequest(endpoint, options);
    }

    // Normal online request
    try {
      const response = await fetch(url, config);
      
      // Cache successful responses for offline use
      if (response.ok && options.method === 'GET') {
        await this.cacheResponse(endpoint, response.clone());
      }
      
      return await response.json();
    } catch (error) {
      // Network error - try offline fallback
      if (error.name === 'TypeError' || error.message.includes('fetch')) {
        console.log('🔄 Network error - trying offline fallback');
        return this.handleOfflineRequest(endpoint, options);
      }
      throw error;
    }
  }

  async handleOfflineRequest(endpoint, options) {
    // Handle specific endpoints offline
    if (endpoint === '/chat' && options.method === 'POST') {
      return this.handleOfflineChat(JSON.parse(options.body));
    }
    
    if (endpoint === '/opportunities') {
      return this.handleOfflineOpportunities();
    }
    
    if (endpoint.startsWith('/saved')) {
      return this.handleOfflineSaved();
    }

    // No offline handler available
    throw new Error('This action requires an internet connection');
  }

  async handleOfflineChat(data) {
    const { message } = data;
    
    // Simple keyword-based responses
    const offlineResponses = {
      greeting: "Hi! I'm currently in offline mode with limited functionality. I can help you search through cached opportunities.",
      search: "I'll search through cached opportunities for you.",
      help: "In offline mode, I can help you browse previously loaded opportunities and view your saved items.",
      default: "I'm in offline mode right now. I can help you browse cached opportunities, but I can't provide AI-powered recommendations until you're back online."
    };

    // Detect intent (simple keyword matching)
    let responseType = 'default';
    if (/hello|hi|hey/i.test(message)) responseType = 'greeting';
    else if (/job|training|opportunity|internship/i.test(message)) responseType = 'search';
    else if (/help|what can you/i.test(message)) responseType = 'help';

    // Search cached opportunities
    const opportunities = await offlineDB.searchOpportunities(message);

    return {
      response: offlineResponses[responseType],
      opportunities: opportunities.slice(0, 5),
      isOffline: true
    };
  }

  async handleOfflineOpportunities() {
    const cached = await offlineDB.db!.getAll('opportunities');
    return {
      opportunities: cached,
      isOffline: true,
      message: 'Showing cached opportunities'
    };
  }
}
```

### 4. **Offline Banner Component** (`OfflineBanner.tsx`)

```typescript
import { Alert, AlertDescription } from "@/components/ui/alert";
import { WifiOff, Wifi, Info } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

export function OfflineBanner() {
  const { isOnline, wasOffline } = useOnlineStatus();
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    if (isOnline && wasOffline) {
      setShowReconnected(true);
      setTimeout(() => setShowReconnected(false), 5000);
    }
  }, [isOnline, wasOffline]);

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed top-0 left-0 right-0 z-50"
        >
          <Alert variant="warning" className="rounded-none border-x-0 border-t-0">
            <WifiOff className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>
                You're currently offline. Limited functionality available.
                You can browse cached opportunities and view saved items.
              </span>
              <Info className="h-4 w-4 text-muted-foreground" />
            </AlertDescription>
          </Alert>
        </motion.div>
      )}

      {showReconnected && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          className="fixed top-0 left-0 right-0 z-50"
        >
          <Alert variant="success" className="rounded-none border-x-0 border-t-0">
            <Wifi className="h-4 w-4" />
            <AlertDescription>
              You're back online! Data is being synced...
            </AlertDescription>
          </Alert>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

### 5. **Update Chat.tsx for Offline Mode**

```typescript
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { offlineDB } from "@/lib/db";

const Chat = () => {
  const { isOnline } = useOnlineStatus();
  const [offlineMode, setOfflineMode] = useState(false);

  useEffect(() => {
    setOfflineMode(!isOnline);
  }, [isOnline]);

  const handleSendMessage = async (text: string) => {
    // Show offline indicator if offline
    if (offlineMode) {
      // Visual indicator in chat
      const offlineNotice: Message = {
        id: `offline-${Date.now()}`,
        role: "bot",
        text: "⚠️ Note: You're in offline mode. Responses may be less accurate. Connect to internet for full AI-powered recommendations.",
        timestamp: new Date(),
        isOfflineMode: true
      };
      setMessages(prev => [...prev, offlineNotice]);
    }

    const userMessage = {
      id: Date.now().toString(),
      role: "user",
      text: text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsTyping(true);

    try {
      // API client will automatically handle offline fallback
      const response = await apiClient.post('/chat', {
        message: text,
        conversationId
      }, token);

      const botMessage = {
        id: (Date.now() + 1).toString(),
        role: "bot",
        text: response.response,
        timestamp: new Date(),
        opportunities: response.opportunities || [],
        isOfflineMode: response.isOffline || false
      };

      setMessages((prev) => [...prev, botMessage]);

      // Cache conversation for offline access
      await offlineDB.saveConversation({
        conversationId,
        messages: [...messages, userMessage, botMessage],
        timestamp: Date.now()
      });

    } catch (error) {
      toast.error(
        offlineMode 
          ? "Couldn't process your request offline. Try browsing cached opportunities."
          : "Failed to get response. Please try again."
      );
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="relative">
      <OfflineBanner />
      
      {/* Offline mode indicator in chat */}
      {offlineMode && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800 px-4 py-2 text-sm text-yellow-800 dark:text-yellow-200 flex items-center gap-2">
          <WifiOff className="h-4 w-4" />
          <span>Offline Mode - Limited functionality</span>
        </div>
      )}

      {/* Rest of chat component */}
    </div>
  );
};
```

---

## 🎨 UX/UI Design Patterns

### Offline Indicators

**1. Persistent Banner** (Top of page)
```
┌─────────────────────────────────────────────┐
│ 📴 You're offline                           │
│ Limited features. Browse cached content.    │
└─────────────────────────────────────────────┘
```

**2. Feature-Specific Badges**
- Save button: "💾 Will sync when online"
- Search: "🔍 Searching cached opportunities"
- Chat input: Placeholder changes to "Limited offline mode"

**3. Reconnection Toast**
```
┌─────────────────────────────────┐
│ ✅ Back online!                 │
│ Syncing your data...            │
└─────────────────────────────────┘
```

### Offline Mode Message Styling

```tsx
// Differentiate offline messages visually
<AnimatedMessage
  {...messageProps}
  className={cn(
    message.isOfflineMode && "border-l-4 border-yellow-400 bg-yellow-50/50"
  )}
/>
```

---

## 📊 Data Sync Strategy

### Background Sync Queue

```typescript
class SyncManager {
  private syncQueue: SyncAction[] = [];

  async queueAction(action: SyncAction) {
    this.syncQueue.push({
      ...action,
      timestamp: Date.now(),
      retries: 0
    });
    
    // Store in IndexedDB
    await offlineDB.db!.put('offlineQueue', action);
    
    // Try immediate sync if online
    if (navigator.onLine) {
      await this.processSyncQueue();
    }
  }

  async processSyncQueue() {
    while (this.syncQueue.length > 0) {
      const action = this.syncQueue[0];
      
      try {
        await this.executeAction(action);
        this.syncQueue.shift();
        await offlineDB.db!.delete('offlineQueue', action.id);
      } catch (error) {
        action.retries++;
        if (action.retries >= 3) {
          // Failed after 3 retries
          console.error('Sync failed:', action);
          this.syncQueue.shift();
        }
        break; // Stop processing on error
      }
    }
  }

  async executeAction(action: SyncAction) {
    switch (action.type) {
      case 'save-opportunity':
        await apiClient.post('/saved', action.data, action.token);
        break;
      case 'unsave-opportunity':
        await apiClient.delete(`/saved/${action.data.id}`, action.token);
        break;
      case 'update-profile':
        await apiClient.post('/users/profile', action.data, action.token);
        break;
    }
  }
}

export const syncManager = new SyncManager();
```

### Auto-Sync on Reconnection

```typescript
useEffect(() => {
  if (isOnline && wasOffline) {
    // Sync queued actions
    syncManager.processSyncQueue();
    
    // Refresh cached data
    refreshOpportunitiesCache();
    
    // Show sync status
    toast.loading('Syncing...', { id: 'sync' });
    
    setTimeout(() => {
      toast.success('All caught up!', { id: 'sync' });
    }, 2000);
  }
}, [isOnline, wasOffline]);
```

---

## 📱 Progressive Web App (PWA) Enhancement

### manifest.json

```json
{
  "name": "YouthGuide NA",
  "short_name": "YouthGuide",
  "description": "Find job opportunities and training in Namibia",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#25D366",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ],
  "offline_enabled": true
}
```

### Service Worker (Optional Advanced Feature)

```javascript
// public/sw.js
const CACHE_NAME = 'youthguide-v1';

self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Cache successful API responses
        if (event.request.url.includes('/api/opportunities')) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Return cached response if offline
        return caches.match(event.request);
      })
  );
});
```

---

## 🚀 Implementation Roadmap

### Phase 1: Foundation (Week 1-2)
- [ ] Create `useOnlineStatus` hook
- [ ] Set up IndexedDB wrapper
- [ ] Add network detection logging
- [ ] Create offline banner component

### Phase 2: Core Offline Features (Week 3-4)
- [ ] Implement offline opportunity caching
- [ ] Add simple keyword search for cached data
- [ ] Update API client with offline fallbacks
- [ ] Add offline queue for sync

### Phase 3: UX Polish (Week 5)
- [ ] Design and implement offline indicators
- [ ] Add reconnection animations
- [ ] Create offline mode explanations
- [ ] Test sync queue reliability

### Phase 4: Advanced Features (Week 6+)
- [ ] Service Worker implementation
- [ ] PWA manifest and install prompt
- [ ] Background sync API
- [ ] Offline analytics

---

## ⚠️ Limitations & Tradeoffs

### What Won't Work Offline
1. **No AI Responses** - LLM requires backend API
2. **No Semantic Search** - AI reranking unavailable
3. **No Real-Time Data** - Only cached opportunities
4. **No Profile Sync** - Changes stored locally until online
5. **No Authentication** - Can't log in/out offline

### Storage Constraints
- Mobile browsers: 5-50MB typical limit
- Opportunities: ~50KB per 100 items
- Conversations: ~10KB per 10 messages
- **Recommended**: Cache last 200 opportunities, 50 messages

### Battery Impact
- Network polling: Minimal (<1% per hour)
- IndexedDB operations: Negligible
- Service Worker: Minimal when idle

---

## 📈 Success Metrics

### User Experience
- ✅ Banner appears within 500ms of going offline
- ✅ Offline search returns results in <100ms
- ✅ Reconnection sync completes in <3 seconds
- ✅ Zero data loss from offline actions

### Performance
- ✅ IndexedDB query time: <50ms
- ✅ Cache hit rate: >80% for repeat visits
- ✅ Sync queue processing: <5 seconds for 10 actions

### Adoption
- ✅ Track offline session frequency
- ✅ Measure feature usage in offline mode
- ✅ Monitor sync success rate

---

## 🎯 Recommended Approach

### **START WITH**: Minimal Viable Offline Mode
1. **Network detection + Banner** (2-3 days)
2. **Basic opportunity caching** (3-4 days)
3. **Offline queue for saves** (2-3 days)
4. **Graceful degradation messaging** (1-2 days)

**Total Estimated Time**: 2-3 weeks for full implementation

### Priority Order
1. 🔥 **High**: Network detection + UI indicators
2. 🔥 **High**: Cache opportunities for browsing
3. 🟡 **Medium**: Offline queue for saves
4. 🟡 **Medium**: Simple keyword search
5. 🟢 **Low**: Service Worker PWA features

---

## 💡 Conclusion

**YES**, offline mode is highly feasible for YouthGuide NA with the following approach:

✅ **Graceful Degradation**: Works offline with reduced features
✅ **Clear Communication**: Users know what's available offline
✅ **Auto-Recovery**: Seamless sync when back online
✅ **No Breaking Changes**: Enhances existing functionality

The key is **managing expectations** through clear UI/UX indicators and providing **valuable offline features** like browsing cached opportunities and viewing saved items, even without AI-powered search.

**Recommended**: Start with Phase 1-2 (network detection + caching) for immediate value, then iterate based on user feedback.
