// Feature: ai-chatbot-widget, Property 7: Admin conversation list pagination and filtering
// **Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.5**

import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import * as fc from 'fast-check';
import Database from 'better-sqlite3';
import { migrateChatTables } from '../migrations/chatTables.js';

/**
 * Property 7: Admin conversation list pagination and filtering
 *
 * For any set of N conversations and query params (page, limit, dateFrom, dateTo,
 * hasContact, status), the response SHALL:
 * - Return at most `limit` items
 * - Report `total` equal to the count of conversations matching all filters
 * - Ensure all returned items match every active filter
 * - Ensure sequential pages cover all matching conversations without overlap or gaps
 */

interface ConversationData {
  sessionId: string;
  status: 'open' | 'closed';
  closureReason: 'timeout' | 'goodbye' | 'session_lost' | null;
  createdAt: string;
  lastMessageAt: string;
  messageCount: number;
  hasContact: boolean;
  contactName: string | null;
}

interface QueryParams {
  page: number;
  limit: number;
  dateFrom: string | undefined;
  dateTo: string | undefined;
  hasContact: boolean | undefined;
  status: 'open' | 'closed' | undefined;
}

interface ResultRow {
  id: number;
  status: 'open' | 'closed';
  closure_reason: string | null;
  created_at: string;
  last_message_at: string;
  message_count: number;
  visitor_name: string | null;
}

/**
 * Replicates the exact SQL query logic from chatAdminRoutes.ts for testing.
 */
function executeAdminQuery(db: InstanceType<typeof Database>, params: QueryParams) {
  const conditions: string[] = [];
  const queryParams: unknown[] = [];

  if (params.dateFrom) {
    conditions.push('c.created_at >= ?');
    queryParams.push(params.dateFrom);
  }
  if (params.dateTo) {
    conditions.push('c.created_at < ?');
    queryParams.push(params.dateTo + 'T23:59:59.999Z');
  }
  if (params.status === 'open' || params.status === 'closed') {
    conditions.push('c.status = ?');
    queryParams.push(params.status);
  }
  if (params.hasContact === true) {
    conditions.push(
      `EXISTS (SELECT 1 FROM chat_contacts cc WHERE cc.conversation_id = c.id AND cc.name IS NOT NULL)`
    );
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Normalize page and limit like the route does
  let page = params.page;
  let limit = params.limit;
  if (limit > 100) limit = 100;
  if (limit < 1) limit = 20;
  if (page < 1) page = 1;
  const offset = (page - 1) * limit;

  // Get total count
  const countRow = db.prepare(
    `SELECT COUNT(*) as total FROM chat_conversations c ${whereClause}`
  ).get(...queryParams) as { total: number };

  // Get paginated results
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
  `).all(...queryParams, limit, offset) as ResultRow[];

  return {
    conversations: rows,
    total: countRow.total,
    page,
    limit,
  };
}

// Generate a random ISO date string within a reasonable range using integer timestamps
const MIN_TS = new Date('2024-01-01T00:00:00Z').getTime();
const MAX_TS = new Date('2025-12-31T23:59:59Z').getTime();

const isoDateArb = fc.integer({ min: MIN_TS, max: MAX_TS })
  .map(ts => new Date(ts).toISOString());

// Generate conversation data
const conversationArb: fc.Arbitrary<ConversationData> = fc.record({
  sessionId: fc.uuid(),
  status: fc.constantFrom<'open' | 'closed'>('open', 'closed'),
  closureReason: fc.constantFrom<'timeout' | 'goodbye' | 'session_lost' | null>(
    'timeout', 'goodbye', 'session_lost', null
  ),
  createdAt: isoDateArb,
  lastMessageAt: isoDateArb,
  messageCount: fc.integer({ min: 1, max: 10 }),
  hasContact: fc.boolean(),
  contactName: fc.oneof(
    fc.string({ minLength: 1, maxLength: 30 }).filter(s => s.trim().length > 0),
    fc.constant(null)
  ),
});

// Generate query params
const DATE_FROM_MIN = new Date('2024-01-01T00:00:00Z').getTime();
const DATE_FROM_MAX = new Date('2025-06-30T23:59:59Z').getTime();
const DATE_TO_MIN = new Date('2024-06-01T00:00:00Z').getTime();
const DATE_TO_MAX = new Date('2025-12-31T23:59:59Z').getTime();

const queryParamsArb: fc.Arbitrary<QueryParams> = fc.record({
  page: fc.integer({ min: 1, max: 10 }),
  limit: fc.integer({ min: 1, max: 100 }),
  dateFrom: fc.oneof(
    fc.integer({ min: DATE_FROM_MIN, max: DATE_FROM_MAX })
      .map(ts => new Date(ts).toISOString()),
    fc.constant(undefined)
  ),
  dateTo: fc.oneof(
    fc.integer({ min: DATE_TO_MIN, max: DATE_TO_MAX })
      .map(ts => new Date(ts).toISOString()),
    fc.constant(undefined)
  ),
  hasContact: fc.oneof(fc.constant(true), fc.constant(undefined)),
  status: fc.oneof(
    fc.constantFrom<'open' | 'closed'>('open', 'closed'),
    fc.constant(undefined)
  ),
});

describe('Property 7: Admin conversation list pagination and filtering', () => {
  let db: InstanceType<typeof Database>;

  beforeEach(() => {
    db = new Database(':memory:');
    db.pragma('journal_mode = WAL');
    migrateChatTables(db);
  });

  afterAll(() => {
    if (db) db.close();
  });

  /**
   * Inserts test data into the in-memory database.
   */
  function seedData(conversations: ConversationData[]): void {
    const insertConv = db.prepare(
      `INSERT INTO chat_conversations (session_id, status, closure_reason, created_at, last_message_at)
       VALUES (?, ?, ?, ?, ?)`
    );
    const insertMsg = db.prepare(
      `INSERT INTO chat_messages (conversation_id, role, content, created_at)
       VALUES (?, ?, ?, ?)`
    );
    const insertContact = db.prepare(
      `INSERT INTO chat_contacts (conversation_id, name, last_name, email, phone, company, updated_at)
       VALUES (?, ?, NULL, NULL, NULL, NULL, ?)`
    );

    for (const conv of conversations) {
      const result = insertConv.run(
        conv.sessionId,
        conv.status,
        conv.status === 'closed' ? conv.closureReason : null,
        conv.createdAt,
        conv.lastMessageAt
      );
      const convId = Number(result.lastInsertRowid);

      // Insert messages
      for (let i = 0; i < conv.messageCount; i++) {
        const role = i % 2 === 0 ? 'visitor' : 'assistant';
        insertMsg.run(convId, role, `Message ${i + 1}`, conv.createdAt);
      }

      // Insert contact if hasContact is true and contactName is provided
      if (conv.hasContact && conv.contactName !== null) {
        insertContact.run(convId, conv.contactName, conv.createdAt);
      }
    }
  }

  /**
   * Determines if a conversation matches the given filters (ground truth).
   */
  function matchesFilters(conv: ConversationData, params: QueryParams): boolean {
    if (params.dateFrom && conv.createdAt < params.dateFrom) return false;
    if (params.dateTo && conv.createdAt >= params.dateTo + 'T23:59:59.999Z') return false;
    if (params.status && conv.status !== params.status) return false;
    if (params.hasContact === true && !(conv.hasContact && conv.contactName !== null)) return false;
    return true;
  }

  it('response returns at most `limit` items', () => {
    fc.assert(
      fc.property(
        fc.array(conversationArb, { minLength: 1, maxLength: 50 }),
        queryParamsArb,
        (conversations, params) => {
          // Refresh the DB
          db.exec('DELETE FROM chat_contacts');
          db.exec('DELETE FROM chat_messages');
          db.exec('DELETE FROM chat_conversations');
          seedData(conversations);

          const result = executeAdminQuery(db, params);

          // Normalize limit like route does
          let expectedLimit = params.limit;
          if (expectedLimit > 100) expectedLimit = 100;
          if (expectedLimit < 1) expectedLimit = 20;

          expect(result.conversations.length).toBeLessThanOrEqual(expectedLimit);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('total equals count of conversations matching all filters', () => {
    fc.assert(
      fc.property(
        fc.array(conversationArb, { minLength: 1, maxLength: 50 }),
        queryParamsArb,
        (conversations, params) => {
          db.exec('DELETE FROM chat_contacts');
          db.exec('DELETE FROM chat_messages');
          db.exec('DELETE FROM chat_conversations');
          seedData(conversations);

          const result = executeAdminQuery(db, params);
          const expectedTotal = conversations.filter(c => matchesFilters(c, params)).length;

          expect(result.total).toBe(expectedTotal);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('all returned items match every active filter', () => {
    fc.assert(
      fc.property(
        fc.array(conversationArb, { minLength: 1, maxLength: 50 }),
        queryParamsArb,
        (conversations, params) => {
          db.exec('DELETE FROM chat_contacts');
          db.exec('DELETE FROM chat_messages');
          db.exec('DELETE FROM chat_conversations');
          seedData(conversations);

          const result = executeAdminQuery(db, params);

          for (const row of result.conversations) {
            // Check status filter
            if (params.status) {
              expect(row.status).toBe(params.status);
            }

            // Check dateFrom filter
            if (params.dateFrom) {
              expect(row.created_at >= params.dateFrom).toBe(true);
            }

            // Check dateTo filter
            if (params.dateTo) {
              expect(row.created_at < params.dateTo + 'T23:59:59.999Z').toBe(true);
            }

            // Check hasContact filter
            if (params.hasContact === true) {
              expect(row.visitor_name).not.toBeNull();
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('sequential pages cover all matching conversations without overlap or gaps', () => {
    fc.assert(
      fc.property(
        fc.array(conversationArb, { minLength: 1, maxLength: 50 }),
        queryParamsArb,
        (conversations, params) => {
          db.exec('DELETE FROM chat_contacts');
          db.exec('DELETE FROM chat_messages');
          db.exec('DELETE FROM chat_conversations');
          seedData(conversations);

          // First get total to know how many pages
          const firstResult = executeAdminQuery(db, { ...params, page: 1 });
          const total = firstResult.total;
          const limit = firstResult.limit;
          const totalPages = Math.ceil(total / limit);

          // Collect all IDs across all pages
          const allIds: number[] = [];
          for (let page = 1; page <= totalPages; page++) {
            const pageResult = executeAdminQuery(db, { ...params, page });
            allIds.push(...pageResult.conversations.map(r => r.id));
          }

          // No duplicates (no overlap)
          const uniqueIds = new Set(allIds);
          expect(uniqueIds.size).toBe(allIds.length);

          // Total coverage (no gaps)
          expect(allIds.length).toBe(total);
        }
      ),
      { numRuns: 100 }
    );
  });
});
