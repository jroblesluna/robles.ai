import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';

// ----------------------------------------------------------
// Mock: database (better-sqlite3)
// ----------------------------------------------------------

const conversations = new Map<number, any>();
const messages = new Map<number, any[]>();
const contacts = new Map<number, any>();
let nextConversationId = 1;
let nextMessageId = 1;

const mockRun = vi.fn();
const mockGet = vi.fn();
const mockAll = vi.fn();

vi.mock('../db.js', () => ({
  default: {
    prepare: () => ({
      run: mockRun,
      get: mockGet,
      all: mockAll,
    }),
  },
}));

// ----------------------------------------------------------
// Mock: conversationStore (use a lightweight in-memory store)
// ----------------------------------------------------------

vi.mock('../services/conversationStore.js', () => ({
  createConversation: vi.fn((sessionId: string) => {
    const id = nextConversationId++;
    const now = new Date().toISOString();
    const row = {
      id,
      session_id: sessionId,
      status: 'open' as const,
      closure_reason: null,
      created_at: now,
      last_message_at: now,
      closed_at: null,
    };
    conversations.set(id, row);
    messages.set(id, []);
    return row;
  }),
  getConversationBySession: vi.fn((sessionId: string) => {
    for (const conv of conversations.values()) {
      if (conv.session_id === sessionId) return conv;
    }
    return null;
  }),
  addMessage: vi.fn((conversationId: number, role: string, content: string) => {
    const now = new Date().toISOString();
    const msg = { id: nextMessageId++, conversation_id: conversationId, role, content, created_at: now };
    const msgs = messages.get(conversationId) || [];
    msgs.push(msg);
    messages.set(conversationId, msgs);
    const conv = conversations.get(conversationId);
    if (conv) conv.last_message_at = now;
    return msg;
  }),
  getMessages: vi.fn((conversationId: number) => {
    return messages.get(conversationId) || [];
  }),
  closeConversation: vi.fn((conversationId: number, reason: string) => {
    const conv = conversations.get(conversationId);
    if (conv) {
      conv.status = 'closed';
      conv.closure_reason = reason;
      conv.closed_at = new Date().toISOString();
    }
  }),
  updateContact: vi.fn((conversationId: number, contactData: any) => {
    contacts.set(conversationId, contactData);
  }),
  getContact: vi.fn((conversationId: number) => {
    return contacts.get(conversationId) || null;
  }),
}));

// ----------------------------------------------------------
// Mock: chatEngine (avoid calling OpenAI)
// ----------------------------------------------------------

vi.mock('../services/chatEngine.js', () => ({
  generateResponse: vi.fn(async function* (_messages: any[], _pagePath: string, _sessionId: string) {
    yield { type: 'token', content: 'Hello' };
    yield { type: 'token', content: ' there!' };
    yield { type: 'done', fullContent: 'Hello there!' };
  }),
}));

// ----------------------------------------------------------
// Mock: chatNotifier (avoid sending emails)
// ----------------------------------------------------------

vi.mock('../services/chatNotifier.js', () => ({
  sendConversationEmail: vi.fn().mockResolvedValue(undefined),
}));

// ----------------------------------------------------------
// Setup Express app with chat routes
// ----------------------------------------------------------

let app: express.Express;

beforeEach(async () => {
  vi.clearAllMocks();

  // Reset in-memory stores
  conversations.clear();
  messages.clear();
  contacts.clear();
  nextConversationId = 1;
  nextMessageId = 1;

  app = express();
  app.use(express.json());
  app.use(cookieParser());

  const { default: chatRouter } = await import('../chatRoutes.js');
  app.use('/api/chat', chatRouter);
});

// ----------------------------------------------------------
// Helper: parse SSE response body into events
// ----------------------------------------------------------

function parseSSE(body: string): any[] {
  return body
    .split('\n')
    .filter((line) => line.startsWith('data: '))
    .map((line) => {
      try {
        return JSON.parse(line.slice(6));
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

// ----------------------------------------------------------
// Helper: create a session and return the cookie
// ----------------------------------------------------------

async function createSession(): Promise<{ cookie: string; sessionId: string; conversationId: number }> {
  const res = await request(app).post('/api/chat/session').send();
  const setCookieHeader = res.headers['set-cookie'];
  const cookie = Array.isArray(setCookieHeader) ? setCookieHeader[0] : setCookieHeader;
  return {
    cookie,
    sessionId: res.body.sessionId,
    conversationId: res.body.conversationId,
  };
}

// ==========================================================
// TESTS
// ==========================================================

describe('Chat Routes Integration Tests', () => {
  // --------------------------------------------------------
  // 1. Session creation
  // --------------------------------------------------------
  describe('POST /api/chat/session', () => {
    it('returns 201 with sessionId and conversationId', async () => {
      const res = await request(app).post('/api/chat/session').send();

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('sessionId');
      expect(res.body).toHaveProperty('conversationId');
      expect(typeof res.body.sessionId).toBe('string');
      expect(typeof res.body.conversationId).toBe('number');
    });

    it('sets an httpOnly chat_session cookie', async () => {
      const res = await request(app).post('/api/chat/session').send();

      const setCookie = res.headers['set-cookie'];
      expect(setCookie).toBeDefined();
      const cookieStr = Array.isArray(setCookie) ? setCookie[0] : setCookie;
      expect(cookieStr).toContain('chat_session=');
      expect(cookieStr).toContain('HttpOnly');
    });
  });

  // --------------------------------------------------------
  // 2. History retrieval
  // --------------------------------------------------------
  describe('GET /api/chat/history', () => {
    it('returns messages array (empty initially) for a valid session', async () => {
      const { cookie } = await createSession();

      const res = await request(app)
        .get('/api/chat/history')
        .set('Cookie', cookie)
        .send();

      expect(res.status).toBe(200);
      expect(res.body.messages).toEqual([]);
      expect(res.body.status).toBe('open');
      expect(res.body.contactData).toBeNull();
    });

    it('returns 401 when no session cookie is present', async () => {
      const res = await request(app).get('/api/chat/history').send();
      expect(res.status).toBe(401);
    });

    it('returns 404 for a non-existent session', async () => {
      const res = await request(app)
        .get('/api/chat/history')
        .set('Cookie', 'chat_session=non-existent-id')
        .send();

      expect(res.status).toBe(404);
    });

    it('returns 410 for a closed conversation', async () => {
      const { cookie, conversationId } = await createSession();

      // Close the conversation
      const { closeConversation } = await import('../services/conversationStore.js');
      (closeConversation as any)(conversationId, 'goodbye');

      const res = await request(app)
        .get('/api/chat/history')
        .set('Cookie', cookie)
        .send();

      expect(res.status).toBe(410);
    });
  });

  // --------------------------------------------------------
  // 3. Message sending with SSE
  // --------------------------------------------------------
  describe('POST /api/chat/message', () => {
    it('returns SSE stream with token and done events', async () => {
      const { cookie } = await createSession();

      const res = await request(app)
        .post('/api/chat/message')
        .set('Cookie', cookie)
        .send({ message: 'Hello', pagePath: '/' });

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/event-stream');

      const events = parseSSE(res.text);
      const tokenEvents = events.filter((e) => e.type === 'token');
      const doneEvent = events.find((e) => e.type === 'done');

      expect(tokenEvents.length).toBeGreaterThanOrEqual(1);
      expect(doneEvent).toBeDefined();
      expect(doneEvent.messageId).toBeDefined();
    });

    it('stores the visitor message in the conversation', async () => {
      const { cookie, conversationId } = await createSession();

      await request(app)
        .post('/api/chat/message')
        .set('Cookie', cookie)
        .send({ message: 'Hi from visitor', pagePath: '/' });

      const { addMessage } = await import('../services/conversationStore.js');
      expect(addMessage).toHaveBeenCalledWith(conversationId, 'visitor', 'Hi from visitor');
    });

    it('stores the assistant response in the conversation', async () => {
      const { cookie, conversationId } = await createSession();

      await request(app)
        .post('/api/chat/message')
        .set('Cookie', cookie)
        .send({ message: 'Hello', pagePath: '/' });

      const { addMessage } = await import('../services/conversationStore.js');
      // First call: visitor message, Second call: assistant message
      expect(addMessage).toHaveBeenCalledWith(conversationId, 'assistant', 'Hello there!');
    });

    it('returns 401 when no session cookie is present', async () => {
      const res = await request(app)
        .post('/api/chat/message')
        .send({ message: 'Hello', pagePath: '/' });

      expect(res.status).toBe(401);
    });

    it('returns 410 for a closed conversation', async () => {
      const { cookie, conversationId } = await createSession();

      const { closeConversation } = await import('../services/conversationStore.js');
      (closeConversation as any)(conversationId, 'goodbye');

      const res = await request(app)
        .post('/api/chat/message')
        .set('Cookie', cookie)
        .send({ message: 'Hello', pagePath: '/' });

      expect(res.status).toBe(410);
    });
  });

  // --------------------------------------------------------
  // 4. Session closure
  // --------------------------------------------------------
  describe('POST /api/chat/close', () => {
    it('closes the conversation and returns success', async () => {
      const { cookie, conversationId } = await createSession();

      const res = await request(app)
        .post('/api/chat/close')
        .set('Cookie', cookie)
        .send();

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const { closeConversation } = await import('../services/conversationStore.js');
      expect(closeConversation).toHaveBeenCalledWith(conversationId, 'goodbye');
    });

    it('triggers email notification on close', async () => {
      const { cookie, conversationId } = await createSession();

      await request(app)
        .post('/api/chat/close')
        .set('Cookie', cookie)
        .send();

      const { sendConversationEmail } = await import('../services/chatNotifier.js');
      expect(sendConversationEmail).toHaveBeenCalledWith(conversationId);
    });

    it('returns 401 when no session cookie is present', async () => {
      const res = await request(app).post('/api/chat/close').send();
      expect(res.status).toBe(401);
    });

    it('returns 410 if conversation is already closed', async () => {
      const { cookie, conversationId } = await createSession();

      const { closeConversation } = await import('../services/conversationStore.js');
      (closeConversation as any)(conversationId, 'goodbye');

      const res = await request(app)
        .post('/api/chat/close')
        .set('Cookie', cookie)
        .send();

      expect(res.status).toBe(410);
    });
  });

  // --------------------------------------------------------
  // 5. Rate limiting
  // --------------------------------------------------------
  describe('Rate Limiting', () => {
    it('returns 429 after 30 messages in 10 minutes', async () => {
      const { cookie } = await createSession();

      // Send 30 messages (should all succeed)
      for (let i = 0; i < 30; i++) {
        const res = await request(app)
          .post('/api/chat/message')
          .set('Cookie', cookie)
          .send({ message: `Message ${i + 1}`, pagePath: '/' });

        expect(res.status).toBe(200);
      }

      // 31st message should be rate limited
      const rateLimitedRes = await request(app)
        .post('/api/chat/message')
        .set('Cookie', cookie)
        .send({ message: 'One too many', pagePath: '/' });

      expect(rateLimitedRes.status).toBe(429);
      expect(rateLimitedRes.body.error).toContain('Too many messages');
    });
  });

  // --------------------------------------------------------
  // 6. Invalid / expired session handling
  // --------------------------------------------------------
  describe('Invalid Session Handling', () => {
    it('returns 401 when no cookie is set (all endpoints)', async () => {
      const historyRes = await request(app).get('/api/chat/history').send();
      const messageRes = await request(app).post('/api/chat/message').send({ message: 'hi', pagePath: '/' });
      const closeRes = await request(app).post('/api/chat/close').send();

      expect(historyRes.status).toBe(401);
      expect(messageRes.status).toBe(401);
      expect(closeRes.status).toBe(401);
    });

    it('returns 404 for a nonexistent session ID in cookie', async () => {
      const res = await request(app)
        .get('/api/chat/history')
        .set('Cookie', 'chat_session=does-not-exist-uuid')
        .send();

      expect(res.status).toBe(404);
    });

    it('returns 410 when accessing a closed conversation', async () => {
      const { cookie, conversationId } = await createSession();

      const { closeConversation } = await import('../services/conversationStore.js');
      (closeConversation as any)(conversationId, 'timeout');

      const historyRes = await request(app)
        .get('/api/chat/history')
        .set('Cookie', cookie)
        .send();

      const messageRes = await request(app)
        .post('/api/chat/message')
        .set('Cookie', cookie)
        .send({ message: 'hello', pagePath: '/' });

      const closeRes = await request(app)
        .post('/api/chat/close')
        .set('Cookie', cookie)
        .send();

      expect(historyRes.status).toBe(410);
      expect(messageRes.status).toBe(410);
      expect(closeRes.status).toBe(410);
    });
  });

  // --------------------------------------------------------
  // 7. Message validation
  // --------------------------------------------------------
  describe('Message Validation', () => {
    it('returns 400 for an empty message', async () => {
      const { cookie } = await createSession();

      const res = await request(app)
        .post('/api/chat/message')
        .set('Cookie', cookie)
        .send({ message: '', pagePath: '/' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Message is required');
    });

    it('returns 400 for a message exceeding 2000 characters', async () => {
      const { cookie } = await createSession();

      const longMessage = 'x'.repeat(2001);
      const res = await request(app)
        .post('/api/chat/message')
        .set('Cookie', cookie)
        .send({ message: longMessage, pagePath: '/' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('2000');
    });

    it('returns 400 when pagePath is missing', async () => {
      const { cookie } = await createSession();

      const res = await request(app)
        .post('/api/chat/message')
        .set('Cookie', cookie)
        .send({ message: 'Hello' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('pagePath');
    });

    it('accepts a message at exactly 2000 characters', async () => {
      const { cookie } = await createSession();

      const exactMessage = 'x'.repeat(2000);
      const res = await request(app)
        .post('/api/chat/message')
        .set('Cookie', cookie)
        .send({ message: exactMessage, pagePath: '/' });

      expect(res.status).toBe(200);
    });
  });
});
