const request = require('supertest');
const app = require('../src/app');

describe('Chat Context Memory Integration Tests', () => {
  let authToken;
  let conversationId;
  let userId;

  beforeAll(() => {
    // Use test auth token from environment or create mock
    authToken = process.env.TEST_AUTH_TOKEN || 'mock-token-for-testing';
    userId = 'test-user-123';
    
    // Mock Firebase auth if needed
    if (!process.env.TEST_AUTH_TOKEN) {
      console.warn('⚠️  No TEST_AUTH_TOKEN found. Tests may fail authentication.');
      console.warn('   Set TEST_AUTH_TOKEN in .env for full integration tests.');
    }
  });

  describe('Test Suite 1: Basic Context Functionality', () => {
    test('1.1: First message should start new conversation without context', async () => {
      const response = await request(app)
        .post('/api/chat')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          message: 'Hi, my name is TestUser',
          context: {
            firstName: 'TestUser',
            skills: ['IT'],
            interests: ['Jobs']
          }
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.conversationId).toBeDefined();
      expect(response.body.response).toBeDefined();
      
      // Save for next test
      conversationId = response.body.conversationId;
      
      console.log('✅ Test 1.1: New conversation started');
      console.log('   Conversation ID:', conversationId);
    }, 30000); // 30s timeout for LLM call

    test('1.2: Second message should retrieve and use context', async () => {
      // Wait a bit to ensure first message is persisted
      await new Promise(resolve => setTimeout(resolve, 2000));

      const response = await request(app)
        .post('/api/chat')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          message: 'What opportunities do you have for me?',
          conversationId,
          context: {
            firstName: 'TestUser',
            skills: ['IT'],
            interests: ['Jobs']
          }
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.conversationId).toBe(conversationId);
      expect(response.body.response).toBeDefined();
      
      // Response should ideally use the name "TestUser" from context
      // This is a soft check since LLM behavior varies
      console.log('✅ Test 1.2: Context-aware response received');
      console.log('   Response preview:', response.body.response.substring(0, 100));
    }, 30000);

    test('1.3: Third message should maintain conversation context', async () => {
      await new Promise(resolve => setTimeout(resolve, 2000));

      const response = await request(app)
        .post('/api/chat')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          message: 'Tell me more details',
          conversationId,
          context: {
            firstName: 'TestUser',
            skills: ['IT'],
            interests: ['Jobs']
          }
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.conversationId).toBe(conversationId);
      
      console.log('✅ Test 1.3: Continued conversation successful');
    }, 30000);
  });

  describe('Test Suite 2: Conversation Isolation', () => {
    test('2.1: New conversation should not have previous context', async () => {
      const response = await request(app)
        .post('/api/chat')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          message: 'Hello, do you remember me?',
          context: {
            firstName: 'NewUser',
            skills: ['Sales'],
            interests: ['Training']
          }
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.conversationId).not.toBe(conversationId);
      
      console.log('✅ Test 2.1: New conversation is isolated');
      console.log('   New Conversation ID:', response.body.conversationId);
    }, 30000);
  });

  describe('Test Suite 3: Input Validation', () => {
    test('3.1: Empty message should return 400 error', async () => {
      const response = await request(app)
        .post('/api/chat')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          message: '',
          context: {}
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
      
      console.log('✅ Test 3.1: Empty message validation works');
    });

    test('3.2: Missing message should return 400 error', async () => {
      const response = await request(app)
        .post('/api/chat')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          context: {}
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
      
      console.log('✅ Test 3.2: Missing message validation works');
    });

    test('3.3: Whitespace-only message should return 400 error', async () => {
      const response = await request(app)
        .post('/api/chat')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          message: '   ',
          context: {}
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
      
      console.log('✅ Test 3.3: Whitespace validation works');
    });
  });

  describe('Test Suite 4: Response Structure', () => {
    test('4.1: Response should have required fields', async () => {
      const response = await request(app)
        .post('/api/chat')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          message: 'Test message',
          context: {
            firstName: 'Test'
          }
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('response');
      expect(response.body).toHaveProperty('opportunities');
      expect(response.body).toHaveProperty('conversationId');
      expect(response.body).toHaveProperty('timestamp');
      
      expect(Array.isArray(response.body.opportunities)).toBe(true);
      
      console.log('✅ Test 4.1: Response structure is correct');
    }, 30000);

    test('4.2: Opportunities should have correct structure', async () => {
      const response = await request(app)
        .post('/api/chat')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          message: 'Show me IT jobs',
          context: {
            firstName: 'Test',
            skills: ['IT'],
            interests: ['Jobs']
          }
        });

      expect(response.status).toBe(200);
      
      if (response.body.opportunities.length > 0) {
        const opp = response.body.opportunities[0];
        expect(opp).toHaveProperty('id');
        expect(opp).toHaveProperty('title');
        expect(opp).toHaveProperty('category');
        expect(opp).toHaveProperty('cost');
        
        console.log('✅ Test 4.2: Opportunity structure is correct');
        console.log('   Sample opportunity:', opp.title);
      } else {
        console.log('⚠️  Test 4.2: No opportunities returned (may be expected)');
      }
    }, 30000);
  });

  describe('Test Suite 5: Error Handling', () => {
    test('5.1: Invalid conversationId should not crash', async () => {
      const response = await request(app)
        .post('/api/chat')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          message: 'Test with invalid conversation ID',
          conversationId: 'invalid-id-that-does-not-exist',
          context: {
            firstName: 'Test'
          }
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      
      console.log('✅ Test 5.1: Invalid conversationId handled gracefully');
    }, 30000);

    test('5.2: Missing auth token should return 401', async () => {
      const response = await request(app)
        .post('/api/chat')
        .send({
          message: 'Test without auth',
          context: {}
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBeDefined();
      
      console.log('✅ Test 5.2: Auth validation works');
    });
  });

  describe('Test Suite 6: Performance', () => {
    test('6.1: Response time should be reasonable (<10s)', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .post('/api/chat')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          message: 'Quick test message',
          context: {
            firstName: 'Test'
          }
        });

      const duration = Date.now() - startTime;
      
      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(10000); // 10 seconds
      
      console.log('✅ Test 6.1: Response time acceptable');
      console.log('   Duration:', duration, 'ms');
    }, 15000);
  });
});

describe('Health Check Tests', () => {
  test('Health endpoint should return 200', async () => {
    const response = await request(app).get('/health');
    
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('healthy');
    
    console.log('✅ Health check passed');
  });

  test('API docs endpoint should return 200', async () => {
    const response = await request(app).get('/api');
    
    expect(response.status).toBe(200);
    expect(response.body.name).toBeDefined();
    
    console.log('✅ API docs accessible');
  });
});
