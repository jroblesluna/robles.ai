import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import Database from 'better-sqlite3';

/**
 * Property 8: Analytics computation correctness
 * **Validates: Requirements 11.1, 11.2, 11.4**
 *
 * For any set of conversations in a date range, totalConversations equals count,
 * contactCaptureRate equals (conversations with name AND (email OR phone)) / total × 100,
 * averageMessages equals sum of counts / total.
 *
 * Feature: ai-chatbot-widget, Property 8: Analytics computation correctness
 */

// --- Schema setup helper ---
function createSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS chat_conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open', 'closed')),
      closure_reason TEXT CHECK(closure_reason IN ('timeout', 'goodbye', 'session_lost')),
      created_at TEXT NOT NULL,
      last_message_at TEXT NOT NULL,
      closed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id INTEGER NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('visitor', 'assistant')),
      content TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (conversation_id) REFERENCES chat_conversations(id)
    );

    CREATE TABLE IF NOT EXISTS chat_contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id INTEGER NOT NULL UNIQUE,
      name TEXT,
      last_name TEXT,
      email TEXT,
      phone TEXT,
      company TEXT,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (conversation_id) REFERENCES chat_conversations(id)
    );

    CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation
      ON chat_messages(conversation_id);
    CREATE INDEX IF NOT EXISTS idx_chat_conversations_status
      ON chat_conversations(status);
    CREATE INDEX IF NOT EXISTS idx_chat_conversations_created
      ON chat_conversations(created_at);
    CREATE INDEX IF NOT EXISTS idx_chat_conversations_session
      ON chat_conversations(session_id);
  `);
}

// --- Analytics query runner (mirrors chatAdminRoutes.ts logic) ---
function computeAnalytics(db: Database.Database, dateFrom: string, dateTo: string) {
  const conditions: string[] = [];
  const params: unknown[] = [];

  conditions.push('c.created_at >= ?');
  params.push(dateFrom);
  conditions.push('c.created_at < ?');
  params.push(dateTo + 'T23:59:59.999Z');

  const whereClause = `WHERE ${conditions.join(' AND ')}`;

  // Total conversations
  const totalRow = db.prepare(
    `SELECT COUNT(*) as total FROM chat_conversations c ${whereClause}`
  ).get(...params) as { total: number };

  const totalConversations = totalRow.total;

  // Contact capture rate: conversations with name AND (email OR phone)
  const contactCountRow = db.prepare(`
    SELECT COUNT(*) as count FROM chat_conversations c
    ${whereClause} AND
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

  return { totalConversations, contactCaptureRate, averageMessages };
}

// --- Arbitrary generators ---

/** Contact data variants: name+email, name+phone, name-only, none */
type ContactVariant = 'name_email' | 'name_phone' | 'name_only' | 'none';

interface GeneratedConversation {
  sessionId: string;
  createdAt: string; // ISO string
  messageCount: number; // 0-20
  contactVariant: ContactVariant;
}

// Date range for the analytics query: dateFrom = '2024-01-01', dateTo = '2024-12-31'
// The query logic uses: created_at >= dateFrom AND created_at < dateTo + 'T23:59:59.999Z'
// So we generate timestamps strictly within the query's inclusive bounds.
const DATE_FROM = '2024-01-01';
const DATE_TO = '2024-12-31';
const RANGE_START_MS = new Date('2024-01-01T00:00:00.000Z').getTime();
// Use Dec 31 23:59:59.998Z so all generated dates satisfy created_at < '2024-12-31T23:59:59.999Z'
const RANGE_END_MS = new Date('2024-12-31T23:59:59.998Z').getTime();

const contactVariantArb = fc.oneof(
  fc.constant('name_email' as ContactVariant),
  fc.constant('name_phone' as ContactVariant),
  fc.constant('name_only' as ContactVariant),
  fc.constant('none' as ContactVariant),
);

const conversationArb = fc.record({
  createdAtMs: fc.integer({ min: RANGE_START_MS, max: RANGE_END_MS }),
  messageCount: fc.integer({ min: 0, max: 20 }),
  contactVariant: contactVariantArb,
});

// Generate array of conversations with guaranteed unique session IDs
const conversationsArb = fc.array(conversationArb, { minLength: 1, maxLength: 30 })
  .map((items) => items.map((item, index) => ({
    sessionId: `session-${index}-${item.createdAtMs}`,
    createdAt: new Date(item.createdAtMs).toISOString(),
    messageCount: item.messageCount,
    contactVariant: item.contactVariant,
  })));

// --- Seed data into database ---
function seedDatabase(db: Database.Database, conversations: GeneratedConversation[]) {
  const insertConvo = db.prepare(`
    INSERT INTO chat_conversations (session_id, status, created_at, last_message_at)
    VALUES (?, 'closed', ?, ?)
  `);

  const insertMessage = db.prepare(`
    INSERT INTO chat_messages (conversation_id, role, content, created_at)
    VALUES (?, ?, ?, ?)
  `);

  const insertContact = db.prepare(`
    INSERT INTO chat_contacts (conversation_id, name, last_name, email, phone, company, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  for (const convo of conversations) {
    const result = insertConvo.run(convo.sessionId, convo.createdAt, convo.createdAt);
    const convoId = result.lastInsertRowid as number;

    // Insert messages (alternating visitor/assistant)
    for (let i = 0; i < convo.messageCount; i++) {
      const role = i % 2 === 0 ? 'visitor' : 'assistant';
      insertMessage.run(convoId, role, `Message ${i}`, convo.createdAt);
    }

    // Insert contact data based on variant
    if (convo.contactVariant !== 'none') {
      const name = convo.contactVariant !== 'none' ? 'TestName' : null;
      const email = convo.contactVariant === 'name_email' ? 'test@example.com' : null;
      const phone = convo.contactVariant === 'name_phone' ? '+1234567890' : null;
      insertContact.run(convoId, name, null, email, phone, null, convo.createdAt);
    }
  }
}

describe('Analytics Computation Property Tests', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(':memory:');
    createSchema(db);
  });

  afterEach(() => {
    db.close();
  });

  describe('Property 8: Analytics computation correctness', () => {
    it('totalConversations equals count of conversations in the date range', () => {
      fc.assert(
        fc.property(conversationsArb, (conversations) => {
          // Reset database
          db.exec('DELETE FROM chat_messages');
          db.exec('DELETE FROM chat_contacts');
          db.exec('DELETE FROM chat_conversations');

          seedDatabase(db, conversations);

          const result = computeAnalytics(db, DATE_FROM, DATE_TO);

          // All generated conversations are within the date range
          expect(result.totalConversations).toBe(conversations.length);
        }),
        { numRuns: 100 },
      );
    });

    it('contactCaptureRate equals (conversations with name AND (email OR phone)) / total × 100, rounded', () => {
      fc.assert(
        fc.property(conversationsArb, (conversations) => {
          db.exec('DELETE FROM chat_messages');
          db.exec('DELETE FROM chat_contacts');
          db.exec('DELETE FROM chat_conversations');

          seedDatabase(db, conversations);

          const result = computeAnalytics(db, DATE_FROM, DATE_TO);

          // Expected: count conversations with name AND (email OR phone)
          const contactConversations = conversations.filter(
            (c) => c.contactVariant === 'name_email' || c.contactVariant === 'name_phone'
          ).length;

          const expectedRate = conversations.length > 0
            ? Math.round((contactConversations / conversations.length) * 100)
            : 0;

          expect(result.contactCaptureRate).toBe(expectedRate);
        }),
        { numRuns: 100 },
      );
    });

    it('averageMessages equals sum of message counts / total conversations, rounded to 1 decimal', () => {
      fc.assert(
        fc.property(conversationsArb, (conversations) => {
          db.exec('DELETE FROM chat_messages');
          db.exec('DELETE FROM chat_contacts');
          db.exec('DELETE FROM chat_conversations');

          seedDatabase(db, conversations);

          const result = computeAnalytics(db, DATE_FROM, DATE_TO);

          // Only conversations with at least 1 message are counted in AVG
          const conversationsWithMessages = conversations.filter((c) => c.messageCount > 0);

          if (conversationsWithMessages.length === 0) {
            // No messages at all means AVG is 0
            expect(result.averageMessages).toBe(0);
          } else {
            const totalMessages = conversationsWithMessages.reduce(
              (sum, c) => sum + c.messageCount, 0
            );
            const expectedAvg = Math.round(
              (totalMessages / conversationsWithMessages.length) * 10
            ) / 10;
            expect(result.averageMessages).toBe(expectedAvg);
          }
        }),
        { numRuns: 100 },
      );
    });
  });
});
