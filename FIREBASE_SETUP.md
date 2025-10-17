# Firebase Setup Guide for YouthGuide NA

## 🔥 Firebase Project Setup Complete

Your Firebase project is configured with:
- **Project ID**: `youthguide-na`  
- **Auth Domain**: `youthguide-na.firebaseapp.com`
- **Frontend Config**: ✅ Already created

## 🚀 Next Steps to Complete Setup

### 1. Enable Firebase Services

Go to [Firebase Console](https://console.firebase.google.com/project/youthguide-na) and enable:

#### a) Authentication
1. Go to **Authentication** → **Sign-in method**
2. Enable **Email/Password** provider
3. Optionally enable **Phone** provider for future use

#### b) Firestore Database  
1. Go to **Firestore Database**
2. Click **Create database**
3. Choose **Start in test mode** (we'll add security rules later)
4. Select your preferred region (choose closest to Namibia, e.g., `europe-west1`)

### 2. Generate Service Account Key (for Backend)

1. Go to **Project Settings** → **Service accounts**
2. Click **Generate new private key**
3. Download the JSON file
4. Copy the values to your backend `.env` file:

```env
# Backend .env file
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:5173

# Firebase Admin SDK Configuration
FIREBASE_PROJECT_ID=youthguide-na
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@youthguide-na.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"

# LLM Configuration (choose one)
OPENROUTER_API_KEY=your_openrouter_key_here
OPENROUTER_MODEL=mistralai/mistral-7b-instruct:free
```

### 3. Install Frontend Dependencies

```bash
cd youth-guide-na
npm install firebase
```

### 4. Test Your Setup

#### Backend Test:
```bash
cd youth-guide-na-backend
npm install
cp .env.example .env
# Edit .env with your Firebase credentials
npm run dev
```

Visit: http://localhost:3001/health

#### Frontend Test:
```bash
cd youth-guide-na  
npm run dev
```

Visit: http://localhost:5173/auth

### 5. Set Up Firestore Collections

Your database will automatically create these collections:
- `users` - User profiles and preferences
- `opportunities` - Job/training opportunities  
- `chats` - Chat conversations and history
- `embeddings` - Vector embeddings for RAG search

## 📋 Quick Verification Checklist

- [ ] Firebase project created: `youthguide-na`
- [ ] Authentication enabled (Email/Password)
- [ ] Firestore database created in test mode
- [ ] Service account key downloaded
- [ ] Backend `.env` configured with Firebase credentials
- [ ] Frontend Firebase SDK installed
- [ ] Frontend `.env` file created
- [ ] Backend server starts without errors
- [ ] Frontend can access auth pages

## 🔧 Troubleshooting

### Common Issues:

1. **"Firebase project not found"**
   - Verify `FIREBASE_PROJECT_ID=youthguide-na` in backend `.env`

2. **"Invalid private key"**  
   - Ensure private key includes `\n` characters and is wrapped in quotes
   - Copy exact key from downloaded JSON file

3. **CORS errors**
   - Backend already configured for `http://localhost:5173`
   - Make sure both servers are running

4. **"Permission denied" in Firestore**
   - Database should be in "test mode" initially
   - We'll add security rules in Sprint 2

## 🎯 Ready for Development

Once setup is complete, you can:
- Register users through the frontend auth page  
- Save user profiles to Firestore
- Test authentication flow
- Begin implementing RAG pipeline (Sprint 1)

## 📞 Need Help?

If you encounter issues:
1. Check browser console for error messages
2. Check backend terminal for error logs  
3. Verify all environment variables are set correctly
4. Ensure Firebase services are enabled in console

---

**Next**: Follow Sprint 1 implementation in `IMPLEMENTATION_PLAN.md` to add RAG functionality!