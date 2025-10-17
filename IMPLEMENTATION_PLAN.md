# YouthGuide NA - Backend Implementation Plan

**Repository**: `youth-guide-na-backend`  
**Target**: Complete RAG-powered API server  
**Timeline**: 3 sprints (3 weeks)  
**Status**: Ready for implementation  

---

## 🎯 Implementation Goals

Transform the empty backend repository into a production-ready API server that:
- ✅ Handles RAG-powered chat conversations with personalized responses
- ✅ Manages user authentication and profiles via Firebase  
- ✅ Stores and retrieves opportunities with vector similarity search
- ✅ Provides admin CRUD operations for opportunity management
- ✅ Computes embeddings locally using sentence-transformers
- ✅ Integrates with free-tier LLM (OpenRouter/Hugging Face)
- ✅ Deploys on free hosting (Render/Vercel)

---

## 📊 Gap Analysis: Audit vs Backend Requirements

### Critical Missing Features from Audit Report
| Feature | Status | Backend Implementation Required |
|---------|--------|-------------------------------|
| **RAG Chat Pipeline** | ❌ Missing | `/api/chat` endpoint with embedding retrieval + LLM |
| **User Authentication** | ❌ Missing | Firebase Auth middleware + user session management |
| **Data Persistence** | ❌ Missing | Firestore integration for users, chats, opportunities |
| **Opportunity Management** | ❌ Missing | `/api/opportunities` CRUD + `/api/ingest` for embeddings |
| **Vector Search** | ❌ Missing | Cosine similarity retrieval with stored embeddings |
| **Admin Operations** | ❌ Missing | Protected admin endpoints with role verification |
| **API Infrastructure** | ❌ Missing | Express.js server with proper middleware stack |

### Frontend Integration Points Identified
| Frontend Component | Backend API Needed | Current Status |
|-------------------|-------------------|----------------|
| `Chat.tsx` | `POST /api/chat` | Uses mock data |
| `Auth.tsx` | Firebase Auth + `POST /api/auth/verify` | Non-functional UI |
| `Profile.tsx` | `POST /api/users/profile` | Data not saved |
| `Admin.tsx` | `POST /api/opportunities` | Form doesn't submit |
| `Saved.tsx` | `GET /api/users/saved`, `POST /api/users/save` | No persistence |

---

## 🏗️ Backend Architecture Design

### Folder Structure
```
youth-guide-na-backend/
├── src/
│   ├── config/
│   │   ├── firebase.js          # Firebase Admin SDK setup
│   │   ├── database.js          # Firestore connection & collections
│   │   └── environment.js       # Environment variable validation
│   ├── middleware/
│   │   ├── auth.js              # Firebase Auth token verification
│   │   ├── cors.js              # CORS configuration
│   │   ├── validation.js        # Request body validation
│   │   └── errorHandler.js      # Global error handling
│   ├── routes/
│   │   ├── auth.js              # Authentication endpoints
│   │   ├── chat.js              # RAG chat endpoints  
│   │   ├── opportunities.js     # Opportunity CRUD
│   │   ├── users.js             # User profile management
│   │   └── admin.js             # Admin-only operations
│   ├── services/
│   │   ├── embedding.js         # Local embedding computation
│   │   ├── retrieval.js         # Vector similarity search
│   │   ├── llm.js               # LLM API client (OpenRouter/HF)
│   │   ├── chat.js              # Chat orchestration service
│   │   └── ingest.js            # Data ingestion pipeline
│   ├── utils/
│   │   ├── logger.js            # Structured logging
│   │   ├── validation.js        # Input validation schemas
│   │   └── helpers.js           # Common utilities
│   └── app.js                   # Express app configuration
├── scripts/
│   ├── ingest-opportunities.js   # Initial data ingestion
│   ├── setup-collections.js     # Firestore collection setup
│   └── test-embedding.js        # Embedding pipeline testing
├── tests/
│   ├── unit/                    # Unit tests
│   ├── integration/             # API integration tests
│   └── setup.js                 # Test environment setup
├── .env.example                 # Environment variables template
├── .gitignore                   # Git ignore rules
├── package.json                 # Dependencies and scripts
├── server.js                    # Entry point
├── vercel.json                  # Vercel deployment config
└── render.yaml                  # Render deployment config
```

### Core API Endpoints
```
Authentication:
POST   /api/auth/verify          # Verify Firebase token
GET    /api/auth/user            # Get current user info

Chat & RAG:
POST   /api/chat                 # Main RAG chat endpoint
GET    /api/chat/history/:userId # Get user's chat history

Opportunities:
GET    /api/opportunities        # List/filter opportunities
POST   /api/opportunities        # Create new opportunity (admin)
PUT    /api/opportunities/:id    # Update opportunity (admin)
DELETE /api/opportunities/:id    # Delete opportunity (admin)
POST   /api/ingest               # Batch ingest with embeddings

Users:
GET    /api/users/profile        # Get user profile
POST   /api/users/profile        # Create/update user profile
GET    /api/users/saved          # Get saved opportunities
POST   /api/users/save/:oppId    # Save opportunity
DELETE /api/users/save/:oppId    # Unsave opportunity

Admin:
GET    /api/admin/stats          # System statistics
POST   /api/admin/recompute      # Recompute all embeddings
GET    /api/admin/users          # List all users
```

---

## 📦 Dependencies & Technology Stack

### Core Dependencies
```json
{
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "helmet": "^7.1.0",
    "morgan": "^1.10.0",
    "dotenv": "^16.3.1",
    "firebase-admin": "^11.11.1",
    "@xenova/transformers": "^2.6.2",
    "node-fetch": "^3.3.2",
    "joi": "^17.11.0",
    "winston": "^3.11.0",
    "compression": "^1.7.4"
  },
  "devDependencies": {
    "nodemon": "^3.0.1",
    "jest": "^29.7.0",
    "supertest": "^6.3.3",
    "eslint": "^8.54.0"
  }
}
```

### Key Technologies
- **Server**: Node.js 18+ + Express.js
- **Database**: Firebase Firestore (free tier: 50k reads/20k writes daily)
- **Authentication**: Firebase Auth with JWT verification
- **Embeddings**: @xenova/transformers with all-MiniLM-L6-v2 model
- **LLM**: OpenRouter (free tier) or Hugging Face Inference API
- **Logging**: Winston for structured logging
- **Validation**: Joi for request validation
- **Testing**: Jest + Supertest for API testing
- **Deployment**: Vercel Functions or Render (both free tier compatible)

---

## 🔐 Environment Variables & Configuration

### .env.example
```env
# Server Configuration
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:5173

# Firebase Configuration
FIREBASE_PROJECT_ID=youthguide-na-dev
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@youthguide-na-dev.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nXXXXX\n-----END PRIVATE KEY-----\n"
FIREBASE_DATABASE_URL=https://youthguide-na-dev-default-rtdb.firebaseio.com/

# LLM API Configuration (choose one)
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxxx
OPENROUTER_MODEL=mistralai/mistral-7b-instruct:free
# OR
HUGGINGFACE_API_KEY=hf_xxxxxxxxxxxxx
HUGGINGFACE_MODEL=microsoft/DialoGPT-medium

# Application Settings
MAX_OPPORTUNITIES_PER_QUERY=5
EMBEDDING_MODEL=Xenova/all-MiniLM-L6-v2
LOG_LEVEL=info
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW_MS=900000

# Deployment
RENDER_EXTERNAL_URL=https://youthguide-backend.onrender.com
VERCEL_URL=https://youthguide-backend.vercel.app
```

---

## 🚀 3-Sprint Implementation Plan

### **SPRINT 1: Foundation & RAG Pipeline (Week 1)**

#### Goals
- Set up Express.js server with middleware stack
- Implement Firebase Auth and Firestore integration  
- Build core embedding and retrieval services
- Create basic chat endpoint with LLM integration

#### Tasks
1. **Day 1-2: Server Foundation**
   ```bash
   # Initialize project
   npm init -y
   npm install express cors helmet morgan dotenv firebase-admin
   npm install @xenova/transformers node-fetch joi winston compression
   npm install -D nodemon jest supertest eslint
   ```
   - Create `server.js` entry point
   - Set up `src/app.js` with Express configuration
   - Implement middleware stack (CORS, auth, validation, logging)
   - Configure Firebase Admin SDK

2. **Day 3-4: RAG Services**
   - Build `src/services/embedding.js` for local embedding computation
   - Implement `src/services/retrieval.js` for cosine similarity search
   - Create `src/services/llm.js` for OpenRouter/Hugging Face integration
   - Test embedding pipeline with sample data

3. **Day 5-7: Chat Endpoint**
   - Implement `src/routes/chat.js` with RAG orchestration
   - Create `src/services/chat.js` for conversation management
   - Build data ingestion script for sample opportunities
   - Test end-to-end chat flow locally

#### Deliverables
- ✅ Working Express.js server with Firebase integration
- ✅ Local embedding computation (all-MiniLM-L6-v2)
- ✅ Vector similarity search functionality
- ✅ Basic chat endpoint returning LLM responses
- ✅ Initial data ingestion of sample opportunities

### **SPRINT 2: Full API & Authentication (Week 2)**

#### Goals
- Complete all CRUD operations for opportunities and users
- Implement Firebase Auth middleware and protected routes
- Build admin operations and batch processing
- Deploy backend to Render/Vercel

#### Tasks
1. **Day 1-2: User Management**
   - Implement `src/routes/users.js` for profile management
   - Build `src/routes/auth.js` for token verification
   - Create user profile persistence in Firestore
   - Implement save/unsave opportunities functionality

2. **Day 3-4: Opportunity Management** 
   - Build `src/routes/opportunities.js` with full CRUD
   - Implement `src/routes/admin.js` with role-based access
   - Create batch ingestion endpoint (`/api/ingest`)
   - Add opportunity filtering and search

3. **Day 5-7: Deployment & Testing**
   - Configure deployment for Render and Vercel
   - Set up environment variables in production
   - Implement comprehensive error handling
   - Create API integration tests

#### Deliverables
- ✅ Complete REST API with all required endpoints
- ✅ Firebase Auth integration with protected routes
- ✅ User profile and opportunity CRUD operations
- ✅ Deployed backend accessible from internet
- ✅ API documentation and testing suite

### **SPRINT 3: Frontend Integration & Polish (Week 3)**

#### Goals
- Connect React frontend to backend APIs
- Implement real authentication flow
- Add error handling and loading states
- Prepare for user testing and research data collection

#### Tasks
1. **Day 1-2: Frontend API Integration**
   - Update `src/pages/Chat.tsx` to call `/api/chat`
   - Connect `src/pages/Auth.tsx` to Firebase Auth
   - Implement `src/pages/Profile.tsx` profile persistence
   - Add API client with error handling

2. **Day 3-4: Authentication & State Management**
   - Create React Auth context with Firebase SDK
   - Implement protected routes and auth guards
   - Add session management and token refresh
   - Connect `src/pages/Admin.tsx` to backend APIs

3. **Day 5-7: Testing & Research Preparation**
   - Implement analytics tracking for research metrics
   - Add comprehensive error boundaries and user feedback
   - Test full user journey end-to-end
   - Document setup for user testing environment

#### Deliverables
- ✅ Fully integrated frontend-backend application
- ✅ Working authentication and user sessions
- ✅ Real-time data persistence and retrieval
- ✅ Research-ready environment with analytics
- ✅ Complete deployment and testing documentation

---

## 🔗 Frontend Integration Specifications

### Required Frontend Changes

#### 1. **API Client Setup**
```javascript
// src/utils/api.js - NEW FILE
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

export class ApiClient {
  async post(endpoint, data, token = null) {
    const headers = {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` })
    };
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }
    
    return response.json();
  }
  
  // GET, PUT, DELETE methods...
}

export const apiClient = new ApiClient();
```

#### 2. **Firebase Auth Context**
```javascript
// src/contexts/AuthContext.tsx - NEW FILE  
import { createContext, useContext, useEffect, useState } from 'react';
import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged 
} from 'firebase/auth';
import { auth } from '../config/firebase';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const token = await user.getIdToken();
        setUser(user);
        setToken(token);
      } else {
        setUser(null);
        setToken(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = (email, password) => 
    signInWithEmailAndPassword(auth, email, password);
  
  const register = (email, password) => 
    createUserWithEmailAndPassword(auth, email, password);
  
  const logout = () => signOut(auth);

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
```

#### 3. **Updated Component Integration**

**Chat.tsx Changes:**
```javascript
// Replace handleSendMessage function
const handleSendMessage = async (text: string) => {
  if (!text.trim()) return;

  const userMessage = { role: "user", text, timestamp: new Date() };
  setMessages(prev => [...prev, userMessage]);
  setInputText("");
  setIsTyping(true);

  try {
    const response = await apiClient.post('/chat', {
      message: text,
      userId: user.uid
    }, token);
    
    const botMessage = {
      role: "bot",
      text: response.message,
      timestamp: new Date(),
      opportunities: response.opportunities
    };
    
    setMessages(prev => [...prev, botMessage]);
  } catch (error) {
    toast.error("Sorry, I couldn't process that. Please try again.");
  } finally {
    setIsTyping(false);
  }
};
```

**Profile.tsx Changes:**
```javascript
// Replace handleSubmit function  
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  try {
    await apiClient.post('/users/profile', {
      firstName,
      ageBracket, 
      skills,
      interests
    }, token);
    
    toast.success(`Welcome, ${firstName}! Let's find opportunities for you.`);
    navigate("/chat");
  } catch (error) {
    toast.error("Failed to save profile. Please try again.");
  }
};
```

#### 4. **Environment Variables for Frontend**
```env
# .env for React frontend
REACT_APP_API_URL=http://localhost:3001/api
REACT_APP_FIREBASE_API_KEY=xxxxx
REACT_APP_FIREBASE_AUTH_DOMAIN=youthguide-na-dev.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=youthguide-na-dev
```

---

## 🚀 Deployment Configuration

### Vercel Deployment (serverless.json)
```json
{
  "version": 2,
  "builds": [
    {
      "src": "server.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/server.js"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  }
}
```

### Render Deployment (render.yaml)
```yaml
services:
  - type: web
    name: youthguide-backend
    env: node
    plan: free
    buildCommand: npm install
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: FIREBASE_PROJECT_ID
        fromDatabase: firebase_project_id
      - key: OPENROUTER_API_KEY  
        fromDatabase: openrouter_api_key
```

---

## 📊 Testing & Quality Assurance

### API Testing Strategy
```javascript
// tests/integration/chat.test.js
describe('Chat API', () => {
  test('POST /api/chat returns RAG response', async () => {
    const response = await request(app)
      .post('/api/chat')
      .set('Authorization', `Bearer ${testToken}`)
      .send({
        message: "I need plumbing training",
        userId: "test-user-123"
      });
      
    expect(response.status).toBe(200);
    expect(response.body.message).toBeDefined();
    expect(response.body.opportunities).toBeInstanceOf(Array);
  });
});
```

### Performance Benchmarks
- **Chat Response Time**: <2 seconds (including embedding + LLM)
- **Opportunity Retrieval**: <500ms for similarity search
- **User Authentication**: <200ms for token verification  
- **Data Ingestion**: <5 seconds for 100 opportunities with embeddings

---

## 📈 Success Metrics & Monitoring

### Technical Metrics
- **API Uptime**: >99% (monitored via Render/Vercel dashboards)
- **Response Times**: P95 <2s for chat, P95 <500ms for other endpoints
- **Error Rates**: <1% for all endpoints
- **Database Usage**: Monitor Firestore read/write quotas

### Research Metrics (for thesis evaluation)
- **User Engagement**: Chat messages per session, opportunities saved
- **RAG Quality**: Relevance scores, user satisfaction ratings
- **System Usage**: DAU, session duration, feature adoption
- **Performance**: Response times by user location/device

---

## 🎯 Risk Mitigation & Contingency Plans

### Technical Risks
1. **LLM API Rate Limits**: Implement response caching and fallback messages
2. **Firebase Quota Limits**: Monitor usage, implement efficient querying
3. **Embedding Computation Speed**: Cache embeddings, use lighter models if needed
4. **Deployment Issues**: Maintain configs for both Render and Vercel

### Research Risks  
1. **User Adoption**: Implement progressive disclosure, simple onboarding
2. **Data Quality**: Validate all inputs, implement content moderation
3. **Privacy Concerns**: Minimize data collection, clear consent flows
4. **Evaluation Challenges**: Built-in analytics, structured feedback collection

---

## ✅ Implementation Checklist

### Pre-Development Setup
- [ ] Firebase project created with Firestore and Auth enabled
- [ ] OpenRouter or Hugging Face API keys obtained  
- [ ] Development environment configured with Node.js 18+
- [ ] Git repository cloned and npm initialized

### Sprint 1 Completion Criteria
- [ ] Express.js server running locally on port 3001
- [ ] Firebase Admin SDK connected and authenticated
- [ ] Embedding computation working with sample text
- [ ] Basic chat endpoint returning LLM responses
- [ ] Sample opportunities ingested with embeddings stored

### Sprint 2 Completion Criteria  
- [ ] All API endpoints implemented and tested
- [ ] Firebase Auth middleware protecting routes
- [ ] User profiles persisting in Firestore
- [ ] Opportunity CRUD operations working
- [ ] Backend deployed and accessible via HTTPS

### Sprint 3 Completion Criteria
- [ ] Frontend successfully calling backend APIs
- [ ] Real user authentication and session management
- [ ] End-to-end user journey working (register → profile → chat → save)
- [ ] Error handling and user feedback implemented
- [ ] Analytics tracking user interactions for research

---

**Implementation Guide Prepared**: October 16, 2025  
**Estimated Completion**: November 6, 2025 (3 weeks)  
**Next Action**: Begin Sprint 1 with server foundation and Firebase setup

This comprehensive plan addresses every missing feature identified in the audit report and provides a clear roadmap to transform YouthGuide NA from a frontend-only prototype into a fully functional, research-ready application.