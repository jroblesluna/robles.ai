import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';

// ----------------------------------------------------------
// Mock: database (better-sqlite3)
// ----------------------------------------------------------

vi.mock('../db.js', () => ({
  default: {
    prepare: () => ({
      run: vi.fn(),
      get: vi.fn(),
      all: vi.fn(() => []),
    }),
  },
}));

// ----------------------------------------------------------
// Mock: conversationStore (in-memory store)
// ----------------------------------------------------------

const conversations = new Map<number, any>();
const messageStore = new Map<number, any[]>();
const contacts = new Map<number, any>();
let nextConversationId = 1;
let nextMessageId = 1;

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
    messageStore.set(id, []);
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
    const msgs = messageStore.get(conversationId) || [];
    msgs.push(msg);
    messageStore.set(conversationId, msgs);
    const conv = conversations.get(conversationId);
    if (conv) conv.last_message_at = now;
    return msg;
  }),
  getMessages: vi.fn((conversationId: number) => {
    return messageStore.get(conversationId) || [];
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
// Mock: chatEngine — configurable per test via mockGenerateResponse
// ----------------------------------------------------------

let mockGenerateResponse: (...args: any[]) => AsyncIterable<any>;

// Default implementation: returns simple tokens
function defaultGenerateResponse() {
  return (async function* () {
    yield { type: 'token', content: 'Hello' };
    yield { type: 'token', content: ' world' };
    yield { type: 'token', content: '!' };
    yield { type: 'done', fullContent: 'Hello world!' };
  })();
}

mockGenerateResponse = defaultGenerateResponse;

vi.mock('../services/chatEngine.js', () => ({
  generateResponse: vi.fn((...args: any[]) => mockGenerateResponse(...args)),
}));

// ----------------------------------------------------------
// Mock: chatNotifier (avoid sending emails)
// ----------------------------------------------------------

const mockSendConversationEmail = vi.fn().mockResolvedValue(undefined);

vi.mock('../services/chatNotifier.js', () => ({
  sendConversationEmail: mockSendConversationEmail,
}));

// ----------------------------------------------------------
// Mock: auth (for admin routes)
// ----------------------------------------------------------

vi.mock('../auth.js', () => ({
  requireAuth: vi.fn((req: any, res: any, next: any) => {
    const token = req.cookies?.admin_token;
    if (!token) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    req.adminUser = { userId: 1, email: 'admin@test.com' };
    next();
  }),
  getJwtSecret: vi.fn(() => 'test-secret'),
  generateToken: vi.fn(() => 'mock-token'),
  verifyToken: vi.fn(() => ({ userId: 1, email: 'admin@test.com', iat: 0, exp: 0 })),
}));

// ----------------------------------------------------------
// Setup Express app with both chat and admin routes
// ----------------------------------------------------------

let app: express.Express;

beforeEach(async () => {
  vi.clearAllMocks();

  // Reset in-memory stores
  conversations.clear();
  messageStore.clear();
  contacts.clear();
  nextConversationId = 1;
  nextMessageId = 1;

  // Reset to default generator
  mockGenerateResponse = defaultGenerateResponse;

  app = express();
  app.use(express.json());
  app.use(cookieParser());

  const { default: chatRouter } = await import('../chatRoutes.js');
  const { default: chatAdminRouter } = await import('../chatAdminRoutes.js');

  app.use('/api/chat', chatRouter);

  // Admin routes: chatAdminRouter is mounted under /api/admin
  const adminRouter = express.Router();
  adminRouter.use(chatAdminRouter);
  app.use('/api/admin', adminRouter);
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
// TEST SCENARIO 1: Full Chat Lifecycle
// ==========================================================

describe('Full Chat Lifecycle Integration', () => {
  it('completes full lifecycle: session → messages → contact extraction → close → email', async () => {
    // --- Step 1: Create session ---
    const sessionRes = await request(app).post('/api/chat/session').send();
    expect(sessionRes.status).toBe(201);
    expect(sessionRes.body.sessionId).toBeDefined();
    expect(sessionRes.body.conversationId).toBeDefined();

    const setCookieHeader = sessionRes.headers['set-cookie'];
    const cookie = Array.isArray(setCookieHeader) ? setCookieHeader[0] : setCookieHeader;
    expect(cookie).toContain('chat_session=');

    // --- Step 2: Send first message ---
    const msg1Res = await request(app)
      .post('/api/chat/message')
      .set('Cookie', cookie)
      .send({ message: 'Hi, I want to know about your AI services', pagePath: '/' });

    expect(msg1Res.status).toBe(200);
    expect(msg1Res.headers['content-type']).toContain('text/event-stream');

    const events1 = parseSSE(msg1Res.text);
    const tokens1 = events1.filter((e) => e.type === 'token');
    const done1 = events1.find((e) => e.type === 'done');
    expect(tokens1.length).toBeGreaterThan(0);
    expect(done1).toBeDefined();
    expect(done1.messageId).toBeDefined();

    // --- Step 3: Send second message with contact_update tool call from AI ---
    mockGenerateResponse = () =>
      (async function* () {
        yield { type: 'token', content: 'Nice to meet you, Antonio!' };
        yield { type: 'done', fullContent: 'Nice to meet you, Antonio!' };
        yield {
          type: 'tool_call',
          name: 'update_contact',
          data: { name: 'Antonio', email: 'antonio@example.com', company: 'Robles.AI' },
        };
      })();

    const msg2Res = await request(app)
      .post('/api/chat/message')
      .set('Cookie', cookie)
      .send({ message: 'My name is Antonio, antonio@example.com, from Robles.AI', pagePath: '/' });

    expect(msg2Res.status).toBe(200);

    const events2 = parseSSE(msg2Res.text);
    const contactUpdateEvent = events2.find((e) => e.type === 'contact_update');
    expect(contactUpdateEvent).toBeDefined();
    expect(contactUpdateEvent.data.name).toBe('Antonio');
    expect(contactUpdateEvent.data.email).toBe('antonio@example.com');

    // --- Step 4: Verify contact was stored via history ---
    // Update mock to return stored contact
    const { getContact } = await import('../services/conversationStore.js');
    (getContact as any).mockReturnValue({
      name: 'Antonio',
      lastName: null,
      email: 'antonio@example.com',
      phone: null,
      company: 'Robles.AI',
    });

    const historyRes = await request(app)
      .get('/api/chat/history')
      .set('Cookie', cookie)
      .send();

    expect(historyRes.status).toBe(200);
    expect(historyRes.body.contactData).not.toBeNull();
    expect(historyRes.body.contactData.name).toBe('Antonio');
    expect(historyRes.body.contactData.email).toBe('antonio@example.com');
    expect(historyRes.body.status).toBe('open');

    // --- Step 5: Close session ---
    const closeRes = await request(app)
      .post('/api/chat/close')
      .set('Cookie', cookie)
      .send();

    expect(closeRes.status).toBe(200);
    expect(closeRes.body.success).toBe(true);

    // --- Step 6: Verify email notification was triggered ---
    const { sendConversationEmail } = await import('../services/chatNotifier.js');
    expect(sendConversationEmail).toHaveBeenCalledWith(sessionRes.body.conversationId);

    // --- Step 7: Verify conversation is closed (further messages rejected) ---
    const afterCloseRes = await request(app)
      .post('/api/chat/message')
      .set('Cookie', cookie)
      .send({ message: 'Hello again', pagePath: '/' });

    expect(afterCloseRes.status).toBe(410);
  });

  it('handles AI-triggered conversation close via close_conversation tool', async () => {
    // Mock AI that triggers close_conversation
    mockGenerateResponse = () =>
      (async function* () {
        yield { type: 'token', content: 'Goodbye!' };
        yield { type: 'done', fullContent: 'Goodbye!' };
        yield { type: 'tool_call', name: 'close_conversation', data: {} };
      })();

    const { cookie, conversationId } = await createSession();

    const res = await request(app)
      .post('/api/chat/message')
      .set('Cookie', cookie)
      .send({ message: 'Bye, thanks for the help!', pagePath: '/' });

    expect(res.status).toBe(200);

    const events = parseSSE(res.text);
    const closeEvent = events.find((e) => e.type === 'close');
    expect(closeEvent).toBeDefined();

    // Verify conversation was closed
    const { closeConversation } = await import('../services/conversationStore.js');
    expect(closeConversation).toHaveBeenCalledWith(conversationId, 'goodbye');

    // Verify email notification was sent
    const { sendConversationEmail } = await import('../services/chatNotifier.js');
    expect(sendConversationEmail).toHaveBeenCalledWith(conversationId);
  });

  it('sends multiple messages and maintains message history', async () => {
    const { cookie } = await createSession();

    // Send 3 messages
    for (let i = 0; i < 3; i++) {
      const res = await request(app)
        .post('/api/chat/message')
        .set('Cookie', cookie)
        .send({ message: `Message ${i + 1}`, pagePath: '/' });

      expect(res.status).toBe(200);
    }

    // Verify addMessage was called for each visitor + assistant message pair
    const { addMessage } = await import('../services/conversationStore.js');
    // 3 visitor messages + 3 assistant messages = 6 calls
    expect(addMessage).toHaveBeenCalledTimes(6);
  });
});

// ==========================================================
// TEST SCENARIO 2: Admin Endpoints with Auth Enforcement
// ==========================================================

describe('Admin Endpoints Auth Enforcement', () => {
  it('GET /api/admin/conversations without auth returns 401', async () => {
    const res = await request(app)
      .get('/api/admin/conversations')
      .send();

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Unauthorized');
  });

  it('GET /api/admin/conversations/:id without auth returns 401', async () => {
    const res = await request(app)
      .get('/api/admin/conversations/1')
      .send();

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Unauthorized');
  });

  it('GET /api/admin/conversations/analytics without auth returns 401', async () => {
    const res = await request(app)
      .get('/api/admin/conversations/analytics')
      .send();

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Unauthorized');
  });

  it('all admin conversation endpoints reject unauthenticated requests', async () => {
    const endpoints = [
      { method: 'get', path: '/api/admin/conversations' },
      { method: 'get', path: '/api/admin/conversations/42' },
      { method: 'get', path: '/api/admin/conversations/analytics' },
    ];

    for (const endpoint of endpoints) {
      const res = await (request(app) as any)[endpoint.method](endpoint.path).send();
      expect(res.status).toBe(401);
    }
  });
});

// ==========================================================
// TEST SCENARIO 3: SSE Stream Token Assembly
// ==========================================================

describe('SSE Stream Token Assembly', () => {
  it('tokens concatenated equal the full content from done event', async () => {
    // Mock AI that returns many tokens
    mockGenerateResponse = () =>
      (async function* () {
        yield { type: 'token', content: 'We ' };
        yield { type: 'token', content: 'provide ' };
        yield { type: 'token', content: 'AI ' };
        yield { type: 'token', content: 'consulting ' };
        yield { type: 'token', content: 'services.' };
        yield { type: 'done', fullContent: 'We provide AI consulting services.' };
      })();

    const { cookie } = await createSession();

    const res = await request(app)
      .post('/api/chat/message')
      .set('Cookie', cookie)
      .send({ message: 'What services do you offer?', pagePath: '/' });

    expect(res.status).toBe(200);

    const events = parseSSE(res.text);
    const tokenEvents = events.filter((e) => e.type === 'token');
    const doneEvent = events.find((e) => e.type === 'done');

    // Concatenate all token contents
    const assembledContent = tokenEvents.map((e) => e.content).join('');

    // The assembled tokens should match the expected full content
    expect(assembledContent).toBe('We provide AI consulting services.');
    expect(doneEvent).toBeDefined();
    expect(doneEvent.messageId).toBeDefined();
  });

  it('handles single-token responses correctly', async () => {
    mockGenerateResponse = () =>
      (async function* () {
        yield { type: 'token', content: 'Hi!' };
        yield { type: 'done', fullContent: 'Hi!' };
      })();

    const { cookie } = await createSession();

    const res = await request(app)
      .post('/api/chat/message')
      .set('Cookie', cookie)
      .send({ message: 'Hello', pagePath: '/' });

    const events = parseSSE(res.text);
    const tokens = events.filter((e) => e.type === 'token');
    const assembled = tokens.map((e) => e.content).join('');

    expect(assembled).toBe('Hi!');
    expect(tokens.length).toBe(1);
  });

  it('handles responses with special characters in tokens', async () => {
    mockGenerateResponse = () =>
      (async function* () {
        yield { type: 'token', content: 'Hello! ' };
        yield { type: 'token', content: 'Here\'s a "quote" ' };
        yield { type: 'token', content: 'and some <html>.' };
        yield { type: 'done', fullContent: 'Hello! Here\'s a "quote" and some <html>.' };
      })();

    const { cookie } = await createSession();

    const res = await request(app)
      .post('/api/chat/message')
      .set('Cookie', cookie)
      .send({ message: 'Test special chars', pagePath: '/' });

    const events = parseSSE(res.text);
    const tokens = events.filter((e) => e.type === 'token');
    const assembled = tokens.map((e) => e.content).join('');

    expect(assembled).toBe('Hello! Here\'s a "quote" and some <html>.');
  });

  it('SSE events include done with messageId after all tokens', async () => {
    const { cookie } = await createSession();

    const res = await request(app)
      .post('/api/chat/message')
      .set('Cookie', cookie)
      .send({ message: 'Hi', pagePath: '/' });

    const events = parseSSE(res.text);
    const tokenIndices = events
      .map((e, i) => (e.type === 'token' ? i : -1))
      .filter((i) => i >= 0);
    const doneIndex = events.findIndex((e) => e.type === 'done');

    // Done event should come after all token events
    expect(doneIndex).toBeGreaterThan(Math.max(...tokenIndices));
    expect(events[doneIndex].messageId).toEqual(expect.any(Number));
  });
});
