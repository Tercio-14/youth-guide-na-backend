const admin = require('firebase-admin');

// Mock Firebase Admin SDK for tests
jest.mock('firebase-admin', () => {
  const mockQuerySnapshot = {
    empty: true,
    docs: [],
    size: 0,
    forEach: jest.fn((callback) => {
      // Call callback for each mock doc (empty by default)
    }),
  };

  const mockFirestore = {
    collection: jest.fn().mockReturnThis(),
    doc: jest.fn().mockReturnThis(),
    get: jest.fn().mockResolvedValue(mockQuerySnapshot),
    set: jest.fn().mockResolvedValue(undefined),
    add: jest.fn().mockResolvedValue({ id: 'mock-id' }),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    settings: jest.fn(), // Add settings mock
  };

  const mockAuth = {
    verifyIdToken: jest.fn().mockResolvedValue({
      uid: 'test-user-123',
      email: 'test@example.com',
      email_verified: true,
      auth_time: Date.now() / 1000,
      iat: Date.now() / 1000,
      exp: (Date.now() / 1000) + 3600,
    }),
    app: true,
  };

  const mockFieldValue = {
    serverTimestamp: jest.fn(() => new Date()),
    arrayUnion: jest.fn(val => val),
    arrayRemove: jest.fn(val => val),
  };

  return {
    initializeApp: jest.fn(),
    credential: {
      cert: jest.fn(),
    },
    firestore: jest.fn(() => {
      const instance = Object.assign(mockFirestore, {
        FieldValue: mockFieldValue,
      });
      return instance;
    }),
    auth: jest.fn(() => mockAuth),
    apps: [],
  };
});

// Mock the embeddings module to avoid Float32Array issues in Jest
jest.mock('../src/utils/embeddings.js', () => {
  // Create a deterministic embedding based on text
  const createMockEmbedding = (text) => {
    const mockDim = 384; // Same dimension as all-MiniLM-L6-v2
    const embedding = new Array(mockDim).fill(0);
    
    // Generate pseudo-random but deterministic values based on text
    for (let i = 0; i < text.length && i < mockDim; i++) {
      embedding[i] = (text.charCodeAt(i) % 100) / 100;
    }
    
    // Normalize the vector
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return embedding.map(val => magnitude > 0 ? val / magnitude : 0);
  };

  return {
    embedText: jest.fn((text) => Promise.resolve(createMockEmbedding(text))),
    cosineSimilarity: jest.fn((vecA, vecB) => {
      // Real cosine similarity calculation
      const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
      const magnitudeA = Math.sqrt(vecA.reduce((sum, val) => sum + val * val, 0));
      const magnitudeB = Math.sqrt(vecB.reduce((sum, val) => sum + val * val, 0));
      return dotProduct / (magnitudeA * magnitudeB);
    }),
  };
});

// Mock the LLM module to avoid actual API calls in tests
jest.mock('../src/utils/llm.js', () => {
  return {
    generateChatCompletion: jest.fn(async ({ messages, maxTokens }) => {
      // Extract the last user message
      const lastUserMsg = messages.filter(m => m.role === 'user').pop();
      const userContent = lastUserMsg?.content || '';
      const userText = userContent.toLowerCase();
      
      // Extract the actual user query from the formatted message
      const queryMatch = userContent.match(/User query:\s*(.+?)(?:\n|$)/i);
      const actualQuery = queryMatch ? queryMatch[1].toLowerCase() : userText;
      
      // Check if there are retrieved opportunities mentioned in the message
      const hasOpportunities = userText.includes('retrieved opportunities:') && 
                              !userText.includes('no matching opportunities');
      
      // Simple rule-based mock responses
      let responseText;
      
      if (actualQuery.includes('hi') || actualQuery.includes('hello') || actualQuery.includes('hey')) {
        responseText = "Hey! How can I help you today?";
      } else if (actualQuery.includes('what can you do') || actualQuery.includes('help')) {
        responseText = "I can help you find opportunities like jobs, training, and events in Namibia!";
      } else if (actualQuery.includes('show me') && (actualQuery.includes('jobs') || actualQuery.includes('opportunities'))) {
        // Explicit request for opportunities
        if (hasOpportunities) {
          responseText = "I found some IT job opportunities that might interest you!";
        } else {
          responseText = "I couldn't find any IT job opportunities right now, but I'll keep an eye out for you.";
        }
      } else if (actualQuery.includes('opportunity') || actualQuery.includes('opportunities')) {
        if (hasOpportunities) {
          responseText = "I found some opportunities that might interest you. Let me know if you'd like more details!";
        } else {
          responseText = "I couldn't find any new opportunities right now, but I'll keep an eye out for you.";
        }
      } else if (actualQuery.includes('jobs') || actualQuery.includes('training')) {
        if (hasOpportunities) {
          responseText = "I found some relevant opportunities for you. Would you like to hear more?";
        } else {
          responseText = "I couldn't find any new opportunities right now, but I'll keep an eye out for you.";
        }
      } else if (actualQuery.includes('weather')) {
        responseText = "I specialise in youth opportunities. Can I help you find jobs, training, or events instead?";
      } else {
        responseText = "I'm here to help you find opportunities in Namibia. What are you interested in?";
      }
      
      return {
        text: responseText,
        usage: {
          promptTokens: 100,
          completionTokens: responseText.split(' ').length,
          totalTokens: 100 + responseText.split(' ').length,
        },
      };
    }),
  };
});

// Mock environment variables for tests
process.env.NODE_ENV = 'test';
process.env.FIREBASE_PROJECT_ID = 'test-project';
process.env.FIREBASE_CLIENT_EMAIL = 'test@test.iam.gserviceaccount.com';
process.env.FIREBASE_PRIVATE_KEY = '-----BEGIN PRIVATE KEY-----\nTEST_KEY\n-----END PRIVATE KEY-----\n';
process.env.OPENROUTER_API_KEY = 'test-api-key';
process.env.OPENROUTER_CHAT_MODEL = 'test-model';
process.env.USE_CHAT_CONTEXT = 'true';
process.env.CHAT_CONTEXT_TURNS = '3';

// Increase timeout for integration tests
jest.setTimeout(30000);

// Global setup
beforeAll(() => {
  console.log('\n🧪 Test Suite Starting...\n');
  console.log('Environment:', process.env.NODE_ENV);
  console.log('Firebase Project:', process.env.FIREBASE_PROJECT_ID);
  console.log('Chat Context Enabled:', process.env.USE_CHAT_CONTEXT);
  console.log('\n');
});

// Global teardown
afterAll(() => {
  console.log('\n✅ Test Suite Completed\n');
});
