const admin = require('firebase-admin');
const fs = require('fs');
const logger = require('../utils/logger');

const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
if (!serviceAccountPath) {
  throw new Error('Missing required environment variable: FIREBASE_SERVICE_ACCOUNT_PATH');
}

let serviceAccount;
try {
  const raw = fs.readFileSync(serviceAccountPath, 'utf8');
  serviceAccount = JSON.parse(raw);
} catch (error) {
  throw new Error(`Failed to load Firebase service account from "${serviceAccountPath}": ${error.message}`);
}

try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id,
  });
  logger.info('Firebase Admin SDK initialized successfully');
} catch (error) {
  logger.error('Failed to initialize Firebase Admin SDK:', error);
  throw error;
}

const db = admin.firestore();
const auth = admin.auth();

db.settings({ timestampsInSnapshots: true });

module.exports = {
  admin,
  db,
  auth,
  collections: {
    users: db.collection('users'),
    opportunities: db.collection('opportunities'),
    chats: db.collection('chats'),
    embeddings: db.collection('embeddings'),
    analytics: db.collection('analytics'),
    saved: db.collection('saved'),
    feedback: db.collection('feedback'),
  },
};
