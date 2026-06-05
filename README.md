# YouthGuide NA — Backend

Node.js/Express API server for the YouthGuide NA platform. Provides AI-powered opportunity search via Google Gemini, Firebase-backed authentication, and a full REST API for managing youth opportunities, user profiles, and saved items.

---

## Tech Stack

- **Runtime**: Node.js 20+
- **Framework**: Express 4
- **Database**: Firebase Firestore (via Firebase Admin SDK)
- **Authentication**: Firebase Auth (ID token verification)
- **AI**: Google Gemini (`gemini-2.5-flash` for chat, `text-embedding-004` for vector embeddings)
- **Vector retrieval**: Firestore cosine similarity search (`src/utils/retrieve.js`)
- **Python scraper**: Optional web scraper invoked as a subprocess

---

## Prerequisites

- Node.js 20 or higher
- A Firebase project with Firestore and Authentication enabled
- A Google Gemini API key from [Google AI Studio](https://aistudio.google.com)
- A Firebase service account JSON file (downloaded from Firebase Console)

---

## Installation

```bash
git clone https://github.com/your-org/youth-guide-na-backend.git
cd youth-guide-na-backend
npm install
cp .env.example .env
# Edit .env with your credentials
```

---

## Environment Variables

Copy `.env.example` to `.env` and fill in all values. The server will not start without required variables.

| Variable | Required | Description |
|---|---|---|
| `FIREBASE_SERVICE_ACCOUNT_PATH` | Yes | Path to Firebase service account JSON file |
| `GEMINI_API_KEY` | Yes | Google Gemini API key |
| `GEMINI_MODEL` | No | Gemini model name (default: `gemini-2.5-flash`) |
| `EMBEDDING_MODEL` | No | Embedding model name (default: `text-embedding-004`) |
| `PORT` | No | Server port (default: `3001`) |
| `FRONTEND_URL` | No | Allowed CORS origin (default: `http://localhost:5173`) |
| `ADMIN_EMAILS` | No | Comma-separated admin email fallback list |
| `PYTHON_CMD` | No | Python executable name (default: `python3`) |
| `DISABLE_AUTH_FOR_TESTING` | No | Set `true` only in local dev to skip token verification |

See `.env.example` for the complete list with descriptions.

---

## Firebase Setup

1. In Firebase Console, go to **Project Settings > Service Accounts**.
2. Click **Generate new private key** and download the JSON file.
3. Place the file somewhere outside your repository (e.g., `~/secrets/youth-guide-na-service-account.json`).
4. Set `FIREBASE_SERVICE_ACCOUNT_PATH` in `.env` to the absolute or relative path of that file.

The service account JSON file must never be committed to source control. It is listed in `.gitignore`.

To grant admin access to a user, call `PUT /api/admin/users/:uid` with `{ isAdmin: true }`. This sets the `admin: true` custom claim on the Firebase Auth token. The user must sign out and sign back in for the new claim to take effect.

---

## Running the Server

```bash
# Development (auto-reload)
npm run dev

# Production
npm start
```

The server starts on `http://localhost:3001` by default.

---

## API Route Groups

| Prefix | Description |
|---|---|
| `POST /api/auth/register` | Create user profile in Firestore after Firebase sign-up |
| `GET /api/users/profile` | Get authenticated user's profile |
| `PATCH /api/users/profile` | Partial update of profile fields |
| `POST /api/chat` | Send a message; returns Gemini response with matched opportunities |
| `GET /api/opportunities` | List opportunities (supports `?category=` filter) |
| `POST /api/opportunities` | Create opportunity (admin only) |
| `PUT /api/opportunities/:id` | Update opportunity (admin only) |
| `DELETE /api/opportunities/:id` | Delete opportunity (admin only) |
| `GET /api/saved` | List user's saved opportunities |
| `POST /api/saved/:id` | Save an opportunity |
| `DELETE /api/saved/:id` | Unsave an opportunity |
| `POST /api/saved/batch-check` | Check saved status for multiple IDs |
| `GET /api/admin/stats` | Platform statistics (admin only) |
| `GET /api/admin/users` | Paginated user list (admin only) |
| `PUT /api/admin/users/:uid` | Update user / set admin claim (admin only) |
| `DELETE /api/admin/users/:uid` | Delete user from Auth and Firestore (admin only) |
| `POST /api/scraper/scrape` | Trigger Python web scraper (admin only) |
| `GET /api/feedback/opportunity/:id` | Get feedback for an opportunity |
| `POST /api/feedback` | Submit thumbs-up/down feedback |

All routes except public auth endpoints require a Firebase ID token in the `Authorization: Bearer <token>` header.

---

## Seeding and Embedding Opportunities

On a fresh Firestore database, populate the `opportunities` collection from the
bundled dataset (`data/opportunities.json`), then compute embeddings:

```bash
# 1. Seed opportunities into Firestore (no API calls, fast)
node scripts/seed.js

# 2. Embed all seeded opportunities with Gemini
node scripts/ingest.js --force
```

Use `node scripts/seed.js --wipe` to delete all existing opportunities before
re-seeding.

The ingest script fetches all opportunities from Firestore and computes Gemini
embeddings so they can be retrieved by the RAG pipeline.

```bash
# Embed only documents that are missing embeddings
node scripts/ingest.js

# Re-embed all documents (required after switching embedding models)
node scripts/ingest.js --force
```

Run `--force` after any change to the embedding model or after initial setup.
Embeddings are stored directly on each Firestore opportunity document.

The Gemini API key must not have an IP address restriction that blocks the
machine running the ingest, or embedding calls will fail with a 403.

---

## Scripts

| Command | Description |
|---|---|
| `npm start` | Start server in production mode |
| `npm run dev` | Start server with nodemon auto-reload |
| `node scripts/seed.js` | Seed opportunities from data/opportunities.json |
| `node scripts/seed.js --wipe` | Wipe then re-seed opportunities |
| `node scripts/ingest.js` | Embed missing opportunities |
| `node scripts/ingest.js --force` | Re-embed all opportunities |

---

## Project Structure

```
src/
  config/
    firebase.js       Firebase Admin SDK initialization
  middleware/
    auth.js           Token verification and admin check
  routes/
    auth.js           User registration
    users.js          Profile read/write
    chat.js           Gemini chat + RAG retrieval
    opportunities.js  Opportunity CRUD
    saved.js          Bookmark management
    admin.js          Admin stats, user management
    feedback.js       Opportunity feedback
    scraper.js        Python scraper trigger
    offline.js        Offline mode mock responses
    config.js         Runtime config endpoint
  utils/
    llm.js            Gemini chat client
    embeddings.js     Gemini embedding client
    retrieve.js       Firestore vector retrieval
    firestore.js      Shared collection references
scripts/
  seed.js             Seed opportunities from data/opportunities.json
  ingest.js           Batch embedding script
```

---

## Deployment Notes

- Set `NODE_ENV=production` and `DISABLE_AUTH_FOR_TESTING=false`.
- The service account JSON file must be present at the path specified by `FIREBASE_SERVICE_ACCOUNT_PATH` on the server.
- Run `node scripts/ingest.js --force` after initial deployment to embed all opportunities.
- Firestore indexes are required for compound queries. Create them in Firebase Console if Firestore returns an index error.
- CORS is configured via `FRONTEND_URL`. Set this to your production frontend domain.
