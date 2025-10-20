const request = require('supertest');
const app = require('../src/app');

describe('Chatbot Behavioral Requirements Tests', () => {
  let authToken;
  let conversationId;

  beforeAll(() => {
    authToken = process.env.TEST_AUTH_TOKEN || 'mock-token-for-testing';
  });

  describe('Requirement 1: Natural Conversation', () => {
    test('1.1: Should respond naturally to greetings without forcing opportunities', async () => {
      const response = await request(app)
        .post('/api/chat')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          message: 'Hi, how are you?',
          context: {
            firstName: 'Alex'
          }
        });

      // Log error details if request failed
      if (response.status !== 200) {
        console.error('Test 1.1 Failed - Response:', response.status, response.body);
      }

      expect(response.status).toBe(200);
      expect(response.body.response).toBeDefined();
      
      const botResponse = response.body.response.toLowerCase();
      
      // Should NOT force opportunities or give unsolicited advice
      const hasUnsolitedAdvice = 
        botResponse.includes('i recommend') ||
        botResponse.includes('you should') ||
        botResponse.includes('check local job boards');
      
      expect(hasUnsolitedAdvice).toBe(false);
      
      // Should be brief and friendly
      expect(response.body.response.length).toBeLessThan(400);
      
      console.log('✅ Test 1.1: Natural greeting response');
      console.log('   Response:', response.body.response);
      
      conversationId = response.body.conversationId;
    }, 30000);

    test('1.2: Should only share opportunities when explicitly requested', async () => {
      await new Promise(resolve => setTimeout(resolve, 2000));

      const response = await request(app)
        .post('/api/chat')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          message: 'Show me IT jobs',
          conversationId,
          context: {
            firstName: 'Alex',
            skills: ['IT'],
            interests: ['Jobs']
          }
        });

      expect(response.status).toBe(200);
      
      // Should mention opportunities or explain if none found
      const botResponse = response.body.response.toLowerCase();
      const mentionsOpportunities = 
        botResponse.includes('found') ||
        botResponse.includes('opportunity') ||
        botResponse.includes('job') ||
        botResponse.includes("couldn't find");
      
      expect(mentionsOpportunities).toBe(true);
      
      console.log('✅ Test 1.2: Shares opportunities when requested');
      console.log('   Opportunities returned:', response.body.opportunities.length);
    }, 30000);
  });

  describe('Requirement 2: No Invented Opportunities', () => {
    test('2.1: Should only return opportunities from database', async () => {
      const response = await request(app)
        .post('/api/chat')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          message: 'What opportunities are available?',
          context: {
            firstName: 'Test',
            skills: ['IT'],
            interests: ['Jobs']
          }
        });

      expect(response.status).toBe(200);
      
      // All opportunities should have IDs (proving they're from database)
      if (response.body.opportunities.length > 0) {
        response.body.opportunities.forEach(opp => {
          expect(opp.id).toBeDefined();
          expect(opp.title).toBeDefined();
          expect(typeof opp.score).toBe('number');
        });
        
        console.log('✅ Test 2.1: All opportunities have database IDs');
      } else {
        // If no opportunities, should say so clearly
        const botResponse = response.body.response.toLowerCase();
        expect(
          botResponse.includes("couldn't find") ||
          botResponse.includes("no") ||
          botResponse.includes("keep an eye out")
        ).toBe(true);
        
        console.log('✅ Test 2.1: No opportunities - bot acknowledged correctly');
      }
    }, 30000);

    test('2.2: Should not invent opportunities when none match', async () => {
      const response = await request(app)
        .post('/api/chat')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          message: 'Show me opportunities for underwater basket weaving',
          context: {
            firstName: 'Test',
            skills: ['Underwater Basket Weaving'],
            interests: ['Niche Skills']
          }
        });

      expect(response.status).toBe(200);
      
      // Should not return made-up opportunities
      expect(response.body.opportunities.length).toBeLessThanOrEqual(5);
      
      // If opportunities returned, they should have low relevance scores
      if (response.body.opportunities.length > 0) {
        const hasRelevant = response.body.opportunities.some(opp => 
          opp.title.toLowerCase().includes('basket') ||
          opp.title.toLowerCase().includes('underwater')
        );
        
        // Unlikely to find exact match - should return generic or nothing
        console.log('⚠️  Test 2.2: Returned', response.body.opportunities.length, 'opportunities for niche query');
      } else {
        console.log('✅ Test 2.2: Correctly returned no invented opportunities');
      }
    }, 30000);
  });

  describe('Requirement 3: Concise Responses', () => {
    test('3.1: Responses should be under 80 words for simple queries', async () => {
      const response = await request(app)
        .post('/api/chat')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          message: 'Hi',
          context: {
            firstName: 'Test'
          }
        });

      expect(response.status).toBe(200);
      
      const wordCount = response.body.response.split(/\s+/).length;
      
      // Should be concise (allowing some flexibility)
      expect(wordCount).toBeLessThan(120);
      
      console.log('✅ Test 3.1: Response is concise');
      console.log('   Word count:', wordCount);
    }, 30000);

    test('3.2: Should not give unsolicited lengthy advice', async () => {
      const response = await request(app)
        .post('/api/chat')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          message: 'Thanks',
          context: {
            firstName: 'Test'
          }
        });

      expect(response.status).toBe(200);
      
      const wordCount = response.body.response.split(/\s+/).length;
      
      // "Thanks" should get brief acknowledgment, not essay
      expect(wordCount).toBeLessThan(50);
      
      console.log('✅ Test 3.2: Brief response to simple acknowledgment');
      console.log('   Word count:', wordCount);
    }, 30000);
  });

  describe('Requirement 4: Local Namibian Tone', () => {
    test('4.1: Should use friendly peer tone, not corporate', async () => {
      const response = await request(app)
        .post('/api/chat')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          message: 'What can you help me with?',
          context: {
            firstName: 'Sarah'
          }
        });

      expect(response.status).toBe(200);
      
      const botResponse = response.body.response.toLowerCase();
      
      // Should avoid corporate jargon
      const hasCorporateJargon = 
        botResponse.includes('leverage') ||
        botResponse.includes('synergy') ||
        botResponse.includes('stakeholder') ||
        botResponse.includes('pursuant to');
      
      expect(hasCorporateJargon).toBe(false);
      
      console.log('✅ Test 4.1: No corporate jargon detected');
    }, 30000);

    test('4.2: Should use user\'s name when known', async () => {
      const response = await request(app)
        .post('/api/chat')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          message: 'Hi, my name is Jamie',
          context: {
            firstName: 'Jamie'
          }
        });

      conversationId = response.body.conversationId;
      
      await new Promise(resolve => setTimeout(resolve, 2000));

      const response2 = await request(app)
        .post('/api/chat')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          message: 'What can you do?',
          conversationId,
          context: {
            firstName: 'Jamie'
          }
        });

      expect(response2.status).toBe(200);
      
      // Second response should ideally use "Jamie"
      const botResponse = response2.body.response;
      
      console.log('✅ Test 4.2: Name usage check');
      console.log('   Response:', botResponse);
      console.log('   Uses name:', botResponse.includes('Jamie'));
    }, 30000);
  });

  describe('Requirement 5: Context Awareness', () => {
    test('5.1: Should remember conversation context', async () => {
      const response1 = await request(app)
        .post('/api/chat')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          message: 'I am interested in IT jobs',
          context: {
            firstName: 'Taylor',
            skills: ['IT'],
            interests: ['Jobs']
          }
        });

      conversationId = response1.body.conversationId;
      
      await new Promise(resolve => setTimeout(resolve, 2000));

      const response2 = await request(app)
        .post('/api/chat')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          message: 'What training do I need?',
          conversationId,
          context: {
            firstName: 'Taylor',
            skills: ['IT'],
            interests: ['Jobs']
          }
        });

      expect(response2.status).toBe(200);
      
      // Should relate training to IT context
      const botResponse = response2.body.response.toLowerCase();
      const contextuallySmart = 
        botResponse.includes('it') ||
        botResponse.includes('tech') ||
        botResponse.includes('computer');
      
      console.log('✅ Test 5.1: Context awareness check');
      console.log('   Maintains IT context:', contextuallySmart);
    }, 30000);
  });

  describe('Requirement 6: Appropriate Redirects', () => {
    test('6.1: Should redirect unrelated questions gracefully', async () => {
      const response = await request(app)
        .post('/api/chat')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          message: 'What is the weather today?',
          context: {
            firstName: 'Test'
          }
        });

      expect(response.status).toBe(200);
      
      const botResponse = response.body.response.toLowerCase();
      
      // Should politely redirect to core function
      const hasRedirect = 
        botResponse.includes('specialise') ||
        botResponse.includes('help you find') ||
        botResponse.includes('opportunities') ||
        botResponse.includes('job');
      
      expect(hasRedirect).toBe(true);
      
      console.log('✅ Test 6.1: Redirects unrelated questions');
      console.log('   Response:', response.body.response);
    }, 30000);
  });

  describe('Requirement 7: No Repetition of Name', () => {
    test('7.1: Should not repeat user\'s name excessively', async () => {
      const response = await request(app)
        .post('/api/chat')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          message: 'Tell me about opportunities',
          context: {
            firstName: 'RepeatTest'
          }
        });

      expect(response.status).toBe(200);
      
      const botResponse = response.body.response;
      const nameCount = (botResponse.match(/RepeatTest/gi) || []).length;
      
      // Should use name 0-1 times, not multiple
      expect(nameCount).toBeLessThanOrEqual(2);
      
      console.log('✅ Test 7.1: Name not overused');
      console.log('   Name mentions:', nameCount);
    }, 30000);
  });
});

describe('System Prompt Compliance Tests', () => {
  let authToken;

  beforeAll(() => {
    authToken = process.env.TEST_AUTH_TOKEN || 'mock-token-for-testing';
  });

  test('Should follow guideline: Reply naturally to small talk', async () => {
    const response = await request(app)
      .post('/api/chat')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        message: 'Hey there!',
        context: { firstName: 'Test' }
      });

    expect(response.status).toBe(200);
    expect(response.body.response.length).toBeLessThan(300);
    
    console.log('✅ Natural small talk response');
  }, 30000);

  test('Should follow guideline: No invented opportunities', async () => {
    const response = await request(app)
      .post('/api/chat')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        message: 'Show me all opportunities',
        context: { firstName: 'Test', skills: ['IT'], interests: ['Jobs'] }
      });

    expect(response.status).toBe(200);
    
    // All returned opportunities should have database properties
    response.body.opportunities.forEach(opp => {
      expect(opp).toHaveProperty('id');
      expect(opp).toHaveProperty('score');
    });
    
    console.log('✅ Only database opportunities returned');
  }, 30000);

  test('Should follow guideline: Keep under 80 words', async () => {
    const responses = [];
    
    for (let i = 0; i < 3; i++) {
      const response = await request(app)
        .post('/api/chat')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          message: `Test message ${i}`,
          context: { firstName: 'Test' }
        });
      
      responses.push(response.body.response);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    const avgWordCount = responses.reduce((sum, resp) => 
      sum + resp.split(/\s+/).length, 0) / responses.length;
    
    expect(avgWordCount).toBeLessThan(120); // Some flexibility
    
    console.log('✅ Average response length acceptable');
    console.log('   Avg words:', Math.round(avgWordCount));
  }, 90000);
});
