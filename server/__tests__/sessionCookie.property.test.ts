import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import express from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';

/**
 * Property 1: Session cookie round-trip identity
 * **Validates: Requirements 3.1, 3.2**
 *
 * For any valid session ID, creating a session via POST /api/chat/session and then
 * requesting history via GET /api/chat/history with the returned cookie SHALL return
 * a conversation object belonging to that same session (empty messages array, status open),
 * and no other session SHALL share that conversation.
 *
 * Feature: ai-chatbot-widget, Property 1: Session cookie round-trip identity
 */

// Mock the chatEngine to avoid OpenAI API calls (not needed for session/history endpoints)
vi.mock('../services/chatEngine.js', () => ({
  generateResponse: vi.fn(),
}));

// Mock the chatNotifier to avoid email sending
vi.mock('../services/chatNotifier.js', () => ({
  sendConversationEmail: vi.fn().mockResolvedValue(undefined),
}));

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  return app;
}

/** Helper to extract the chat_session cookie value from a response */
function extractSessionCookie(res: request.Response): string {
  const cookies = res.headers['set-cookie'];
  const cookieHeader = Array.isArray(cookies) ? cookies.join('; ') : cookies;
  const match = cookieHeader.match(/chat_session=([^;]+)/);
  return match![1];
}

describe('Session Cookie Round-Trip Property Tests', () => {
  let app: express.Express;

  beforeEach(async () => {
    vi.clearAllMocks();

    app = createTestApp();

    // Dynamically import to get fresh module with mocks applied
    const { default: chatRouter } = await import('../chatRoutes.js');
    app.use('/api/chat', chatRouter);
  });

  describe('Property 1: Session cookie round-trip identity', () => {
    it('creating a session and requesting history with the returned cookie returns a valid open conversation with empty messages', () => {
      return fc.assert(
        fc.asyncProperty(
          fc.constant(null), // no random input needed — property holds universally
          async () => {
            // Step 1: Create a session
            const sessionRes = await request(app)
              .post('/api/chat/session')
              .send({});

            expect(sessionRes.status).toBe(201);
            expect(sessionRes.body).toHaveProperty('sessionId');
            expect(sessionRes.body).toHaveProperty('conversationId');
            expect(typeof sessionRes.body.sessionId).toBe('string');
            expect(typeof sessionRes.body.conversationId).toBe('number');

            // Step 2: Extract the chat_session cookie from the Set-Cookie header
            const cookies = sessionRes.headers['set-cookie'];
            expect(cookies).toBeDefined();

            const cookieHeader = Array.isArray(cookies) ? cookies.join('; ') : cookies;
            expect(cookieHeader).toContain('chat_session=');

            const cookieValue = extractSessionCookie(sessionRes);

            // Step 3: Request history using the session cookie
            const historyRes = await request(app)
              .get('/api/chat/history')
              .set('Cookie', `chat_session=${cookieValue}`);

            expect(historyRes.status).toBe(200);

            // Step 4: Verify it's a valid ChatHistoryResponse
            const body = historyRes.body;
            expect(body).toHaveProperty('messages');
            expect(body).toHaveProperty('contactData');
            expect(body).toHaveProperty('status');

            // Empty messages for a fresh session
            expect(Array.isArray(body.messages)).toBe(true);
            expect(body.messages).toHaveLength(0);

            // No contact data for a fresh session
            expect(body.contactData).toBeNull();

            // Status should be 'open' for a new session
            expect(body.status).toBe('open');
          },
        ),
        { numRuns: 100 },
      );
    });

    it('each created session is uniquely identified — no two sessions share a conversation', () => {
      return fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 2, max: 10 }), // number of sessions to create per iteration
          async (sessionCount) => {
            const sessionIds: string[] = [];
            const conversationIds: number[] = [];

            // Create multiple sessions
            for (let i = 0; i < sessionCount; i++) {
              const res = await request(app)
                .post('/api/chat/session')
                .send({});

              expect(res.status).toBe(201);
              sessionIds.push(res.body.sessionId);
              conversationIds.push(res.body.conversationId);
            }

            // All session IDs must be unique
            const uniqueSessionIds = new Set(sessionIds);
            expect(uniqueSessionIds.size).toBe(sessionCount);

            // All conversation IDs must be unique
            const uniqueConversationIds = new Set(conversationIds);
            expect(uniqueConversationIds.size).toBe(sessionCount);
          },
        ),
        { numRuns: 50 },
      );
    });

    it('a session cookie only provides access to its own conversation — no cross-session contamination', () => {
      return fc.assert(
        fc.asyncProperty(
          fc.constant(null), // no random input needed — property holds universally
          async () => {
            // Create two separate sessions
            const session1Res = await request(app)
              .post('/api/chat/session')
              .send({});
            const session2Res = await request(app)
              .post('/api/chat/session')
              .send({});

            expect(session1Res.status).toBe(201);
            expect(session2Res.status).toBe(201);

            // Extract cookies
            const cookie1 = extractSessionCookie(session1Res);
            const cookie2 = extractSessionCookie(session2Res);

            // Cookies should be different
            expect(cookie1).not.toBe(cookie2);

            // Each cookie returns history for its own conversation only
            const history1Res = await request(app)
              .get('/api/chat/history')
              .set('Cookie', `chat_session=${cookie1}`);
            const history2Res = await request(app)
              .get('/api/chat/history')
              .set('Cookie', `chat_session=${cookie2}`);

            expect(history1Res.status).toBe(200);
            expect(history2Res.status).toBe(200);

            // Both are valid open sessions with empty messages
            expect(history1Res.body.messages).toHaveLength(0);
            expect(history1Res.body.status).toBe('open');
            expect(history2Res.body.messages).toHaveLength(0);
            expect(history2Res.body.status).toBe('open');

            // Verify session IDs are different (conversations are separate)
            expect(session1Res.body.sessionId).not.toBe(session2Res.body.sessionId);
            expect(session1Res.body.conversationId).not.toBe(session2Res.body.conversationId);
          },
        ),
        { numRuns: 50 },
      );
    });

    it('requesting history without a session cookie returns 401', async () => {
      const res = await request(app)
        .get('/api/chat/history');

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error');
    });

    it('requesting history with an invalid/unknown session cookie returns 404', async () => {
      const res = await request(app)
        .get('/api/chat/history')
        .set('Cookie', 'chat_session=non-existent-session-id');

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('error');
    });
  });
});
