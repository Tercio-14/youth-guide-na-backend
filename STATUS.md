# YouthGuide NA Backend — Status

**Updated**: June 2026  
**Status**: Production-ready

---

## Completed

### Core Infrastructure
- Express.js server with structured route organization
- Firebase Admin SDK initialized via service account JSON file (`FIREBASE_SERVICE_ACCOUNT_PATH`)
- Firestore collections: users, opportunities, chats, saved, feedback
- CORS configured; auth middleware on all protected routes

### AI / RAG Pipeline
- Google Gemini `gemini-2.5-flash` for chat generation (replaces OpenRouter)
- Google Gemini `text-embedding-004` for vector embeddings (replaces @xenova/transformers, 768-dim)
- Firestore cosine similarity retrieval (`src/utils/retrieve.js`)
- Batch ingest script (`node scripts/ingest.js --force`) to embed all opportunities

### Authentication & Authorization
- Firebase ID token verification on all protected routes
- Admin check: custom claim `admin: true` → `ADMIN_EMAILS` env var → Firestore `isAdmin` field
- Service account JSON committed to `.gitignore`; loaded via env var path only

### API Routes (all implemented)
- `POST /api/auth/register` — create user profile
- `GET/PATCH /api/users/profile` — read and partial-update profile
- `POST /api/chat` — Gemini chat with RAG opportunity retrieval
- `GET/POST/PUT/DELETE /api/opportunities` — full CRUD
- `GET/POST/DELETE /api/saved` + `POST /api/saved/batch-check` — bookmark management
- `GET/PUT/DELETE /api/admin/users` + `GET /api/admin/stats` — admin management
- `POST /api/scraper/scrape` — Python scraper trigger (admin only)
- `POST /api/feedback` — thumbs-up/down feedback
- Offline mode mock endpoints under `/api/offline/*`

### Branch State
- `main`: current production-ready state
- `dev`: mirrors main; feature branches deleted

---

## Pending

- Run `node scripts/ingest.js --force` on production Firestore to re-embed all opportunities with Gemini vectors (required: switching from 384-dim Xenova to 768-dim Gemini makes existing vectors incompatible)
- Set up Firestore composite indexes if compound queries return index errors
- Production deployment: set `NODE_ENV=production`, `DISABLE_AUTH_FOR_TESTING=false`, provide service account path on server
