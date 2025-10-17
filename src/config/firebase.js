const admin = require('firebase-admin');
const logger = require('../utils/logger');

// Validate required environment variables
const requiredVars = [
  'FIREBASE_PROJECT_ID',
  'FIREBASE_CLIENT_EMAIL', 
  'FIREBASE_PRIVATE_KEY'
];

for (const varName of requiredVars) {
  if (!process.env[varName]) {
    throw new Error(`Missing required environment variable: ${varName}`);
  }
}

// Initialize Firebase Admin SDK
const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
};

try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: process.env.FIREBASE_PROJECT_ID
  });
  
  logger.info('✅ Firebase Admin SDK initialized successfully');
} catch (error) {
  logger.error('❌ Failed to initialize Firebase Admin SDK:', error);
  throw error;
}

const db = admin.firestore();
const auth = admin.auth();

// Configure Firestore settings
db.settings({
  timestampsInSnapshots: true
});

module.exports = { 
  admin, 
  db, 
  auth,
  
  // Collection references
  collections: {
    users: db.collection('users'),
    opportunities: db.collection('opportunities'), 
    chats: db.collection('chats'),
    embeddings: db.collection('embeddings'),
    analytics: db.collection('analytics')
  }
};