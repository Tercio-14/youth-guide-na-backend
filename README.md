# YouthGuide NA Backend

RAG-powered backend API for YouthGuide NA - connecting youth to opportunities in Namibia.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- Firebase project with Firestore and Authentication enabled
- OpenRouter or Hugging Face API key

### Local Development

1. **Clone and install dependencies:**
   ```bash
   git clone https://github.com/Tercio-14/youth-guide-na-backend.git
   cd youth-guide-na-backend
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your Firebase and LLM API credentials
   ```

3. **Start development server:**
   ```bash
   npm run dev
   ```

4. **Test the API:**
   ```bash
   curl http://localhost:3001/health
   curl http://localhost:3001/api
   ```

## 📋 Implementation Status

### ✅ Completed (Foundation)
- Express.js server with middleware stack
- Firebase Admin SDK integration  
- Authentication middleware with JWT verification
- Basic route structure for all endpoints
- Error handling and logging
- Deployment configurations for Vercel and Render

### 🚧 In Progress (Sprint 1)
- RAG pipeline with sentence-transformers
- LLM integration (OpenRouter/Hugging Face)
- Embedding computation and vector search
- Data ingestion scripts

### ⏳ Planned (Sprint 2-3)
- Complete CRUD operations for opportunities
- User profile management
- Chat history persistence
- Admin operations and analytics

## 🏗️ Architecture

```
├── src/
│   ├── config/         # Firebase and environment setup
│   ├── middleware/     # Auth, CORS, error handling
│   ├── routes/         # API endpoints
│   ├── services/       # Business logic (RAG, LLM, etc.)
│   └── utils/          # Helpers and utilities
├── scripts/            # Setup and maintenance scripts
└── tests/              # Test suites
```

## 📡 API Endpoints

### Authentication
- `POST /api/auth/verify` - Verify Firebase token
- `GET /api/auth/user` - Get current user info

### Chat & RAG  
- `POST /api/chat` - Main RAG chat endpoint
- `GET /api/chat/history/:userId` - Get user's chat history

### Opportunities
- `GET /api/opportunities` - List/filter opportunities
- `POST /api/opportunities` - Create opportunity (admin)
- `PUT /api/opportunities/:id` - Update opportunity (admin)
- `DELETE /api/opportunities/:id` - Delete opportunity (admin)

### Users
- `GET /api/users/profile` - Get user profile
- `POST /api/users/profile` - Create/update profile
- `GET /api/users/saved` - Get saved opportunities
- `POST /api/users/save/:id` - Save opportunity
- `DELETE /api/users/save/:id` - Unsave opportunity

### Admin
- `GET /api/admin/stats` - System statistics
- `POST /api/admin/recompute` - Recompute embeddings
- `GET /api/admin/users` - List users

## 🔐 Environment Variables

Copy `.env.example` to `.env` and configure:

```env
# Server Configuration
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:5173

# Firebase Configuration
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_DATABASE_URL=https://your-project-id-default-rtdb.firebaseio.com/

# LLM API Configuration (choose one)
OPENROUTER_API_KEY=sk-or-v1-xxxxx
OPENROUTER_CHAT_MODEL=mistralai/mistral-small-latest
OPENROUTER_SITE_URL=https://your-frontend-url.local
OPENROUTER_APP_NAME=YouthGuide NA Backend
CHAT_TEMPERATURE=0.2
CHAT_MAX_TOKENS=600
# OR
HUGGINGFACE_API_KEY=hf_xxxxx
HUGGINGFACE_MODEL=microsoft/DialoGPT-medium

# Retrieval & Logging Settings
MAX_OPPORTUNITIES_PER_QUERY=5
EMBEDDING_MODEL=Xenova/all-MiniLM-L6-v2
RETRIEVAL_TOP_K=3
RETRIEVAL_CANDIDATES=100
LOG_LEVEL=info

# Chat Context Settings
USE_CHAT_CONTEXT=true
CHAT_CONTEXT_TURNS=3

# Rate Limiting
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW_MS=900000

# Deployment
RENDER_EXTERNAL_URL=https://youthguide-backend.onrender.com
VERCEL_URL=https://youthguide-backend.vercel.app
```

## 🚢 Deployment

### Vercel (Recommended)
```bash
npm install -g vercel
vercel --prod
```

### Render
1. Connect GitHub repository to Render
2. Set environment variables in dashboard
3. Deploy automatically on push

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test -- auth.test.js

# Test chat context memory feature
# See tests/chat-context.test.md for comprehensive test plan
```

## 💬 Conversational Memory Feature

The chatbot now supports **short-term conversational memory** to maintain context within a single chat session.

### How It Works

1. **Conversation ID**: Each chat session is identified by a unique `conversationId` that persists across messages until the page is refreshed.

2. **Message History**: The backend retrieves the last few message pairs from Firestore before generating each response, allowing the chatbot to:
   - Remember user's name and preferences
   - Maintain topic continuity
   - Handle follow-up questions naturally
   - Reference previous opportunities mentioned

3. **Configuration**:
   - `USE_CHAT_CONTEXT=true` - Enable/disable context feature
   - `CHAT_CONTEXT_TURNS=3` - Number of message pairs to include (default: 3 turns = 6 messages)

4. **Performance**: Context retrieval adds minimal latency (<100ms) via a single Firestore query.

### Example Conversation

```
User: Hi, my name is Sarah
Bot: Hi Sarah! I'm YouthGuide NA. How can I help you today?

User: What IT jobs are available?
Bot: Hi Sarah! I found 2 opportunities that might interest you...

User: Tell me more about the first one
Bot: The software development internship at TechCorp offers...
```

### Data Structure

Messages are stored in Firestore:
```
chats/
  {conversationId}/
    userId: "user123"
    createdAt: timestamp
    updatedAt: timestamp
    lastUserMessage: "..."
    lastAssistantMessage: "..."
    messages/
      {messageId}: {
        role: "user" | "assistant"
        content: "message text"
        timestamp: timestamp
        profileSnapshot: {...}  // user messages only
        opportunities: [...]     // assistant messages only
      }
```

### Logging

Context usage is logged for monitoring:
```
[ChatContext] Using previous chat context: true (count: 6)
[Chat] conversationId=conv_123, historyUsed=true, historyMessageCount=6
```

### Testing

See `tests/chat-context.test.md` for a comprehensive test plan covering:
- Basic context functionality
- Context toggle behavior
- Conversation isolation
- Performance validation
- Edge cases and error scenarios

## 📚 Next Steps

Follow the implementation plan in `IMPLEMENTATION_PLAN.md`:

1. **Sprint 1 (Week 1)**: RAG pipeline and embedding computation
2. **Sprint 2 (Week 2)**: Complete API endpoints and deployment  
3. **Sprint 3 (Week 3)**: Frontend integration and testing

## 🤝 Contributing

This is a research prototype for academic evaluation. See the main repository for contribution guidelines.

## 📄 License

MIT License - See LICENSE file for details.

---

**Repository**: https://github.com/Tercio-14/youth-guide-na-backend  
**Main Project**: https://github.com/Tercio-14/youth-guide-na  
**Documentation**: See `IMPLEMENTATION_PLAN.md` for detailed technical specifications