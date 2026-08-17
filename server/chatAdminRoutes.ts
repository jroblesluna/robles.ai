import { Router } from 'express';
import db from './db.js';
import { requireAuth } from './auth.js';
import type {
  ConversationSummary,
  ConversationListResponse,
  ConversationAnalytics,
  ChatMessage,
  ContactData,
} from '../shared/chatTypes.js';

const chatAdminRouter = Router();

// ----------------------------------------------------------
// GET /api/admin/conversations
// Paginated list with filters: page, limit, dateFrom, dateTo, hasContact, status
// ----------------------------------------------------------
chatAdminRouter.get('/conversations', requireAuth, (req, res) => {
  try {
    let page = parseInt(req.query.page as string) || 1;
    let limit = parseInt(req.query.limit as string) || 20;
    if (limit > 100) limit = 100;
    if (limit < 1) limit = 20;
    if (page < 1) page = 1;
    const offset = (page - 1) * limit;

    const dateFrom = req.query.dateFrom as string | undefined;
    const dateTo = req.query.dateTo as string | undefined;
    const hasContact = req.query.hasContact as string | undefined;
    const status = req.query.status as string | undefined;

    // Build dynamic WHERE clause
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (dateFrom) {
      conditions.push('c.created_at >= ?');
      params.push(dateFrom);
    }
    if (dateTo) {
      // dateTo is inclusive of the whole day
      conditions.push('c.created_at < ?');
      params.push(dateTo + 'T23:59:59.999Z');
    }
    if (status === 'open' || status === 'closed') {
      conditions.push('c.status = ?');
      params.push(status);
    }
    if (hasContact === 'true') {
      conditions.push(
        `EXISTS (SELECT 1 FROM chat_contacts cc WHERE cc.conversation_id = c.id AND cc.name IS NOT NULL)`
      );
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const countRow = db.prepare(
      `SELECT COUNT(*) as total FROM chat_conversations c ${whereClause}`
    ).get(...params) as { total: number };

    // Get paginated results with message count and visitor name
    const rows = db.prepare(`
      SELECT
        c.id,
        c.status,
        c.closure_reason,
        c.created_at,
        c.last_message_at,
        (SELECT COUNT(*) FROM chat_messages m WHERE m.conversation_id = c.id) as message_count,
        (SELECT cc.name FROM chat_contacts cc WHERE cc.conversation_id = c.id) as visitor_name
      FROM chat_conversations c
      ${whereClause}
      ORDER BY c.last_message_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset) as Array<{
      id: number;
      status: 'open' | 'closed';
      closure_reason: 'timeout' | 'goodbye' | 'session_lost' | null;
      created_at: string;
      last_message_at: string;
      message_count: number;
      visitor_name: string | null;
    }>;

    const conversations: ConversationSummary[] = rows.map((row) => ({
      id: row.id,
      visitorName: row.visitor_name,
      status: row.status,
      closureReason: row.closure_reason,
      messageCount: row.message_count,
      createdAt: row.created_at,
      lastMessageAt: row.last_message_at,
    }));

    const response: ConversationListResponse = {
      conversations,
      total: countRow.total,
      page,
      limit,
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching conversations list:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ----------------------------------------------------------
// GET /api/admin/conversations/analytics
// Aggregated stats for date range
// NOTE: This must be registered BEFORE /:id to avoid route conflicts
// ----------------------------------------------------------
chatAdminRouter.get('/conversations/analytics', requireAuth, (req, res) => {
  try {
    const dateFrom = req.query.dateFrom as string | undefined;
    const dateTo = req.query.dateTo as string | undefined;

    const conditions: string[] = [];
    const params: unknown[] = [];

    if (dateFrom) {
      conditions.push('c.created_at >= ?');
      params.push(dateFrom);
    }
    if (dateTo) {
      conditions.push('c.created_at < ?');
      params.push(dateTo + 'T23:59:59.999Z');
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Total conversations
    const totalRow = db.prepare(
      `SELECT COUNT(*) as total FROM chat_conversations c ${whereClause}`
    ).get(...params) as { total: number };

    const totalConversations = totalRow.total;

    // Contact capture rate: conversations with name AND (email OR phone)
    const contactCountRow = db.prepare(`
      SELECT COUNT(*) as count FROM chat_conversations c
      ${whereClause ? whereClause + ' AND' : 'WHERE'}
      EXISTS (
        SELECT 1 FROM chat_contacts cc
        WHERE cc.conversation_id = c.id
        AND cc.name IS NOT NULL
        AND (cc.email IS NOT NULL OR cc.phone IS NOT NULL)
      )
    `).get(...params) as { count: number };

    const contactCaptureRate = totalConversations > 0
      ? Math.round((contactCountRow.count / totalConversations) * 100)
      : 0;

    // Average messages per conversation
    const avgRow = db.prepare(`
      SELECT COALESCE(AVG(msg_count), 0) as avg_messages FROM (
        SELECT COUNT(*) as msg_count
        FROM chat_messages m
        INNER JOIN chat_conversations c ON c.id = m.conversation_id
        ${whereClause}
        GROUP BY m.conversation_id
      )
    `).get(...params) as { avg_messages: number };

    const averageMessages = Math.round(avgRow.avg_messages * 10) / 10;

    // Top topics: extract from first visitor message page paths
    // Use the page_path from the first visitor message content or simply
    // analyze the first visitor messages for common keywords
    // For simplicity, we'll extract topics from the first visitor messages
    const topicRows = db.prepare(`
      SELECT m.content
      FROM chat_messages m
      INNER JOIN chat_conversations c ON c.id = m.conversation_id
      ${whereClause ? whereClause + ' AND' : 'WHERE'}
      m.role = 'visitor'
      AND m.id = (
        SELECT MIN(m2.id) FROM chat_messages m2
        WHERE m2.conversation_id = c.id AND m2.role = 'visitor'
      )
    `).all(...params) as Array<{ content: string }>;

    // Simple keyword-based topic extraction
    const topicCounts = new Map<string, number>();
    const topicKeywords: Record<string, string[]> = {
      'AI/ML Services': ['service', 'services', 'offering', 'solution', 'solutions', 'help', 'provide'],
      'Computer Vision': ['vision', 'image', 'video', 'recognition', 'detection', 'cv'],
      'Natural Language Processing': ['nlp', 'language', 'text', 'chatbot', 'gpt', 'llm'],
      'Data Science': ['data', 'analytics', 'analysis', 'dashboard', 'insights'],
      'Machine Learning': ['machine learning', 'ml', 'model', 'training', 'prediction'],
      'Deep Learning': ['deep learning', 'neural', 'network', 'cnn', 'rnn', 'transformer'],
      'Consulting': ['consult', 'consulting', 'advice', 'strategy', 'roadmap'],
      'Pricing': ['price', 'pricing', 'cost', 'quote', 'budget', 'estimate'],
      'General Inquiry': ['hello', 'hi', 'hey', 'hola', 'question', 'info', 'information'],
    };

    for (const row of topicRows) {
      const content = row.content.toLowerCase();
      let matched = false;
      for (const [topic, keywords] of Object.entries(topicKeywords)) {
        if (keywords.some((kw) => content.includes(kw))) {
          topicCounts.set(topic, (topicCounts.get(topic) || 0) + 1);
          matched = true;
          break; // First match wins for this message
        }
      }
      if (!matched) {
        topicCounts.set('Other', (topicCounts.get('Other') || 0) + 1);
      }
    }

    // Sort by count descending, take top 5
    const topTopics = Array.from(topicCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([topic, count]) => ({ topic, count }));

    const analytics: ConversationAnalytics = {
      totalConversations,
      contactCaptureRate,
      averageMessages,
      topTopics,
    };

    res.json(analytics);
  } catch (error) {
    console.error('Error fetching conversation analytics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ----------------------------------------------------------
// GET /api/admin/conversations/:id
// Full conversation detail with messages and contact data
// ----------------------------------------------------------
chatAdminRouter.get('/conversations/:id', requireAuth, (req, res) => {
  try {
    const { id } = req.params;
    const conversationId = Number(id);

    if (isNaN(conversationId)) {
      res.status(400).json({ error: 'Invalid conversation ID' });
      return;
    }

    // Get conversation
    const conversation = db.prepare(
      `SELECT * FROM chat_conversations WHERE id = ?`
    ).get(conversationId) as {
      id: number;
      session_id: string;
      status: 'open' | 'closed';
      closure_reason: 'timeout' | 'goodbye' | 'session_lost' | null;
      created_at: string;
      last_message_at: string;
      closed_at: string | null;
    } | undefined;

    if (!conversation) {
      res.status(404).json({ error: 'Conversation not found' });
      return;
    }

    // Get messages
    const messageRows = db.prepare(
      `SELECT id, role, content, created_at FROM chat_messages WHERE conversation_id = ? ORDER BY created_at ASC`
    ).all(conversationId) as Array<{
      id: number;
      role: 'visitor' | 'assistant';
      content: string;
      created_at: string;
    }>;

    const messages: ChatMessage[] = messageRows.map((row) => ({
      id: row.id,
      role: row.role,
      content: row.content,
      timestamp: row.created_at,
    }));

    // Get contact data
    const contactRow = db.prepare(
      `SELECT name, last_name, email, phone, company FROM chat_contacts WHERE conversation_id = ?`
    ).get(conversationId) as {
      name: string | null;
      last_name: string | null;
      email: string | null;
      phone: string | null;
      company: string | null;
    } | undefined;

    const contactData: ContactData | null = contactRow
      ? {
          name: contactRow.name,
          lastName: contactRow.last_name,
          email: contactRow.email,
          phone: contactRow.phone,
          company: contactRow.company,
        }
      : null;

    res.json({
      id: conversation.id,
      sessionId: conversation.session_id,
      status: conversation.status,
      closureReason: conversation.closure_reason,
      createdAt: conversation.created_at,
      lastMessageAt: conversation.last_message_at,
      closedAt: conversation.closed_at,
      messages,
      contactData,
    });
  } catch (error) {
    console.error('Error fetching conversation detail:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default chatAdminRouter;
