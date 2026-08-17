import { Router, type Request, type Response } from 'express';
import crypto from 'crypto';
import {
  createConversation,
  getConversationBySession,
  addMessage,
  getMessages,
  closeConversation,
  updateContact,
  getContact,
} from './services/conversationStore.js';
import { generateResponse } from './services/chatEngine.js';
import { sendConversationEmail } from './services/chatNotifier.js';
import type { ChatMessageRequest, ChatHistoryResponse, ChatMessage, ContactData } from '../shared/chatTypes.js';

// ============================================================
// Chat Routes — Public API endpoints for the chatbot widget.
// Handles session management, message streaming via SSE, and
// conversation lifecycle.
// ============================================================

const router = Router();

// ----------------------------------------------------------
// Rate Limiting (in-memory, per session)
// ----------------------------------------------------------

interface RateEntry {
  count: number;
  windowStart: number;
}

const rateLimits = new Map<string, RateEntry>();

const RATE_LIMIT_MAX = 30;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

function isRateLimited(sessionId: string): boolean {
  const now = Date.now();
  const entry = rateLimits.get(sessionId);

  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    // New window
    rateLimits.set(sessionId, { count: 1, windowStart: now });
    return false;
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return true;
  }

  entry.count++;
  return false;
}

// Periodic cleanup of stale rate limit entries (every 10 minutes)
setInterval(() => {
  const now = Date.now();
  rateLimits.forEach((entry, key) => {
    if (now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
      rateLimits.delete(key);
    }
  });
}, RATE_LIMIT_WINDOW_MS);

// ----------------------------------------------------------
// Cookie Helpers
// ----------------------------------------------------------

const COOKIE_NAME = 'chat_session';
const COOKIE_MAX_AGE_MS = 3600 * 1000; // 1 hour

function setChatCookie(res: Response, sessionId: string): void {
  res.cookie(COOKIE_NAME, sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE_MS,
  });
}

function getSessionIdFromCookie(req: Request): string | null {
  return req.cookies?.[COOKIE_NAME] || null;
}

// ----------------------------------------------------------
// POST /api/chat/session — Create a new chat session
// ----------------------------------------------------------

router.post('/session', (req: Request, res: Response) => {
  try {
    const sessionId = crypto.randomUUID();
    const conversation = createConversation(sessionId);

    setChatCookie(res, sessionId);

    res.status(201).json({
      sessionId,
      conversationId: conversation.id,
    });
  } catch (error) {
    console.error('[ChatRoutes] Error creating session:', error);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

// ----------------------------------------------------------
// GET /api/chat/history — Get conversation history
// ----------------------------------------------------------

router.get('/history', (req: Request, res: Response) => {
  try {
    const sessionId = getSessionIdFromCookie(req);
    if (!sessionId) {
      res.status(401).json({ error: 'No session found' });
      return;
    }

    const conversation = getConversationBySession(sessionId);
    if (!conversation) {
      res.status(404).json({ error: 'Conversation not found' });
      return;
    }

    if (conversation.status === 'closed') {
      res.status(410).json({ error: 'Conversation is closed' });
      return;
    }

    const messages = getMessages(conversation.id);
    const contactData = getContact(conversation.id);

    const response: ChatHistoryResponse = {
      messages: messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        timestamp: m.created_at,
      })),
      contactData,
      status: conversation.status,
    };

    res.json(response);
  } catch (error) {
    console.error('[ChatRoutes] Error fetching history:', error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

// ----------------------------------------------------------
// POST /api/chat/message — Send message and stream AI response
// ----------------------------------------------------------

router.post('/message', (req: Request, res: Response) => {
  (async () => {
    try {
      const sessionId = getSessionIdFromCookie(req);
      if (!sessionId) {
        res.status(401).json({ error: 'No session found' });
        return;
      }

      const conversation = getConversationBySession(sessionId);
      if (!conversation) {
        res.status(404).json({ error: 'Conversation not found' });
        return;
      }

      if (conversation.status === 'closed') {
        res.status(410).json({ error: 'Conversation is closed' });
        return;
      }

      // Rate limiting
      if (isRateLimited(sessionId)) {
        res.status(429).json({ error: 'Too many messages. Please wait a moment and try again.' });
        return;
      }

      // Validate request body
      const { message, pagePath } = req.body as ChatMessageRequest;

      if (!message || typeof message !== 'string') {
        res.status(400).json({ error: 'Message is required' });
        return;
      }

      if (message.length > 2000) {
        res.status(400).json({ error: 'Message exceeds maximum length of 2000 characters' });
        return;
      }

      if (!pagePath || typeof pagePath !== 'string') {
        res.status(400).json({ error: 'pagePath is required' });
        return;
      }

      // Store visitor message
      addMessage(conversation.id, 'visitor', message);

      // Refresh cookie (rolling session)
      setChatCookie(res, sessionId);

      // Set up SSE headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');
      res.flushHeaders();

      // Build message history for AI Engine
      const allMessages = getMessages(conversation.id);
      const engineMessages = allMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      // Stream AI response
      let fullContent = '';
      let shouldClose = false;
      let contactUpdate: Partial<ContactData> | null = null;

      const stream = generateResponse(engineMessages, pagePath, sessionId);

      for await (const event of stream) {
        switch (event.type) {
          case 'token':
            fullContent += event.content;
            res.write(`data: ${JSON.stringify({ type: 'token', content: event.content })}\n\n`);
            break;

          case 'done':
            // The fullContent from the engine's done event is the authoritative content
            fullContent = event.fullContent;
            break;

          case 'tool_call':
            if (event.name === 'close_conversation') {
              shouldClose = true;
            } else if (event.name === 'update_contact') {
              contactUpdate = event.data;
            }
            break;

          case 'error':
            res.write(`data: ${JSON.stringify({ type: 'error', message: event.message })}\n\n`);
            res.end();
            return;
        }
      }

      // Store assistant message
      let assistantMessage: { id: number } | null = null;
      if (fullContent) {
        const stored = addMessage(conversation.id, 'assistant', fullContent);
        assistantMessage = stored;
      }

      // Send done event with message ID
      res.write(`data: ${JSON.stringify({ type: 'done', messageId: assistantMessage?.id ?? null })}\n\n`);

      // Handle contact update
      if (contactUpdate) {
        updateContact(conversation.id, contactUpdate as ContactData);
        res.write(`data: ${JSON.stringify({ type: 'contact_update', data: contactUpdate })}\n\n`);
      }

      // Handle conversation closure (triggered by AI detecting goodbye)
      if (shouldClose) {
        closeConversation(conversation.id, 'goodbye');
        res.write(`data: ${JSON.stringify({ type: 'close' })}\n\n`);
        // Fire-and-forget email notification
        sendConversationEmail(conversation.id).catch((err) => {
          console.error('[ChatRoutes] Email notification failed:', err);
        });
      }

      res.end();
    } catch (error) {
      console.error('[ChatRoutes] Error processing message:', error);
      // If headers already sent, send SSE error event
      if (res.headersSent) {
        res.write(`data: ${JSON.stringify({ type: 'error', message: 'Something went wrong. Please try again.' })}\n\n`);
        res.end();
      } else {
        res.status(500).json({ error: 'Failed to process message' });
      }
    }
  })();
});

// ----------------------------------------------------------
// POST /api/chat/close — Explicitly close the conversation
// ----------------------------------------------------------

router.post('/close', (req: Request, res: Response) => {
  try {
    const sessionId = getSessionIdFromCookie(req);
    if (!sessionId) {
      res.status(401).json({ error: 'No session found' });
      return;
    }

    const conversation = getConversationBySession(sessionId);
    if (!conversation) {
      res.status(404).json({ error: 'Conversation not found' });
      return;
    }

    if (conversation.status === 'closed') {
      res.status(410).json({ error: 'Conversation is already closed' });
      return;
    }

    closeConversation(conversation.id, 'goodbye');

    // Fire-and-forget email notification
    sendConversationEmail(conversation.id).catch((err) => {
      console.error('[ChatRoutes] Email notification failed:', err);
    });

    res.json({ success: true, message: 'Conversation closed' });
  } catch (error) {
    console.error('[ChatRoutes] Error closing conversation:', error);
    res.status(500).json({ error: 'Failed to close conversation' });
  }
});

export default router;
