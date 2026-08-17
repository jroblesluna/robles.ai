import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import Database from 'better-sqlite3';
import { migrateChatTables } from '../migrations/chatTables.js';

/**
 * Property 4: Session expiry boundary
 * **Validates: Requirements 3.3**
 *
 * For any open conversation, if the difference between the current time and
 * last_message_at exceeds 3600 seconds, the timeout cleanup closes it;
 * otherwise it remains open.
 *
 * This test validates the QUERY behavior of `getOpenConversationsOlderThan`:
 * conversations with last_message_at < cutoff appear in results, others do not.
 */

const TIMEOUT_SECONDS = 3600;

// --- Helpers ---

function createTestDb() {
  const db = new Database(':memory:');
  migrateChatTables(db);
  return db;
}

function insertOpenConversation(
  db: InstanceType<typeof Database>,
  sessionId: string,
  lastMessageAt: string,
): number {
  const stmt = db.prepare(
    `INSERT INTO chat_conversations (session_id, status, created_at, last_message_at)
     VALUES (?, 'open', ?, ?)`
  );
  const result = stmt.run(sessionId, lastMessageAt, lastMessageAt);
  return Number(result.lastInsertRowid);
}

function insertClosedConversation(
  db: InstanceType<typeof Database>,
  sessionId: string,
  lastMessageAt: string,
): number {
  const stmt = db.prepare(
    `INSERT INTO chat_conversations (session_id, status, closure_reason, created_at, last_message_at, closed_at)
     VALUES (?, 'closed', 'timeout', ?, ?, ?)`
  );
  const result = stmt.run(sessionId, lastMessageAt, lastMessageAt, lastMessageAt);
  return Number(result.lastInsertRowid);
}

function getOpenConversationsOlderThan(
  db: InstanceType<typeof Database>,
  timestamp: string,
) {
  return db
    .prepare(`SELECT * FROM chat_conversations WHERE status = 'open' AND last_message_at < ?`)
    .all(timestamp) as Array<{
    id: number;
    session_id: string;
    status: string;
    last_message_at: string;
  }>;
}

// --- Custom Arbitraries ---

/** Arbitrary for a base timestamp (Unix seconds) within a reasonable range. */
const baseTimestampArb = fc.integer({ min: 1_700_000_000, max: 1_800_000_000 });

/** Arbitrary for a time offset in seconds relative to the timeout boundary. */
const offsetArb = fc.integer({ min: -7200, max: 7200 });

/** Arbitrary for a unique session ID (UUID-like). */
const sessionIdArb = fc
  .tuple(
    fc.stringMatching(/^[0-9a-f]{8}$/),
    fc.stringMatching(/^[0-9a-f]{4}$/),
    fc.stringMatching(/^[0-9a-f]{4}$/),
    fc.stringMatching(/^[0-9a-f]{4}$/),
    fc.stringMatching(/^[0-9a-f]{12}$/),
  )
  .map(([a, b, c, d, e]) => `${a}-${b}-${c}-${d}-${e}`);

/**
 * Generates a scenario: a "current time" and a list of conversations
 * with various last_message_at timestamps, some expired and some not.
 */
const scenarioArb = fc
  .tuple(
    baseTimestampArb,
    fc.array(
      fc.tuple(sessionIdArb, offsetArb, fc.boolean()),
      { minLength: 1, maxLength: 20 },
    ),
  )
  .map(([currentTimeSec, entries]) => {
    // Deduplicate session IDs
    const seen = new Set<string>();
    const conversations = entries
      .filter(([sid]) => {
        if (seen.has(sid)) return false;
        seen.add(sid);
        return true;
      })
      .map(([sessionId, offset, isClosed]) => {
        // offset relative to the boundary:
        // lastMessageAt = currentTime - TIMEOUT_SECONDS + offset
        // If offset > 0, the conversation is within the timeout (should NOT expire)
        // If offset < 0, the conversation exceeds the timeout (should expire)
        // If offset === 0, it's exactly at the boundary (should NOT expire, since query uses strict <)
        const lastMessageAtSec = currentTimeSec - TIMEOUT_SECONDS + offset;
        return {
          sessionId,
          lastMessageAtSec,
          isClosed, // whether to insert as already closed
          offset,
        };
      });

    return {
      currentTimeSec,
      conversations,
    };
  });

// --- Property Tests ---

describe('Session Expiry Boundary — Property 4', () => {
  let db: InstanceType<typeof Database>;

  beforeEach(() => {
    db = createTestDb();
  });

  afterEach(() => {
    db.close();
  });

  it('conversations with last_message_at older than 3600s before current time are returned by the timeout query; others are not', () => {
    fc.assert(
      fc.property(scenarioArb, (scenario) => {
        const { currentTimeSec, conversations } = scenario;

        // The cutoff timestamp: currentTime - 3600 seconds
        const cutoffSec = currentTimeSec - TIMEOUT_SECONDS;
        const cutoffIso = new Date(cutoffSec * 1000).toISOString();

        // Insert conversations
        const insertedOpen: Array<{
          id: number;
          sessionId: string;
          lastMessageAtSec: number;
          offset: number;
        }> = [];

        for (const conv of conversations) {
          const lastMessageAtIso = new Date(conv.lastMessageAtSec * 1000).toISOString();

          if (conv.isClosed) {
            // Closed conversations should NEVER appear in the timeout query
            insertClosedConversation(db, conv.sessionId, lastMessageAtIso);
          } else {
            const id = insertOpenConversation(db, conv.sessionId, lastMessageAtIso);
            insertedOpen.push({
              id,
              sessionId: conv.sessionId,
              lastMessageAtSec: conv.lastMessageAtSec,
              offset: conv.offset,
            });
          }
        }

        // Execute the timeout query
        const results = getOpenConversationsOlderThan(db, cutoffIso);
        const resultIds = new Set(results.map((r) => r.id));

        // Verify boundary behavior for each open conversation
        for (const conv of insertedOpen) {
          const shouldBeExpired = conv.lastMessageAtSec < cutoffSec;

          if (shouldBeExpired) {
            // The conversation's last_message_at is strictly before the cutoff
            // → it should appear in results
            expect(resultIds.has(conv.id)).toBe(true);
          } else {
            // The conversation's last_message_at is at or after the cutoff
            // → it should NOT appear in results
            expect(resultIds.has(conv.id)).toBe(false);
          }
        }

        // All results should be open conversations only
        for (const result of results) {
          expect(result.status).toBe('open');
        }

        // No closed conversation should appear in results
        const closedSessionIds = conversations
          .filter((c) => c.isClosed)
          .map((c) => c.sessionId);
        for (const result of results) {
          expect(closedSessionIds).not.toContain(result.session_id);
        }

        // Clean up for next iteration
        db.exec('DELETE FROM chat_conversations');
      }),
      { numRuns: 100 },
    );
  });

  it('exactly-at-boundary conversations (diff === 3600s) are NOT selected for timeout', () => {
    fc.assert(
      fc.property(baseTimestampArb, sessionIdArb, (currentTimeSec, sessionId) => {
        // Place last_message_at exactly 3600s before current time
        const lastMessageAtSec = currentTimeSec - TIMEOUT_SECONDS;
        const lastMessageAtIso = new Date(lastMessageAtSec * 1000).toISOString();
        const cutoffIso = new Date(lastMessageAtSec * 1000).toISOString();

        insertOpenConversation(db, sessionId, lastMessageAtIso);

        // The cutoff is currentTime - 3600s, which equals last_message_at
        // Query uses strict < so exact boundary should NOT be selected
        const results = getOpenConversationsOlderThan(db, cutoffIso);

        expect(results.length).toBe(0);

        // Clean up
        db.exec('DELETE FROM chat_conversations');
      }),
      { numRuns: 100 },
    );
  });

  it('conversations 1 second past the boundary ARE selected for timeout', () => {
    fc.assert(
      fc.property(baseTimestampArb, sessionIdArb, (currentTimeSec, sessionId) => {
        // Place last_message_at exactly 3601s before current time (1s past boundary)
        const lastMessageAtSec = currentTimeSec - TIMEOUT_SECONDS - 1;
        const lastMessageAtIso = new Date(lastMessageAtSec * 1000).toISOString();

        // Cutoff is currentTime - 3600s
        const cutoffSec = currentTimeSec - TIMEOUT_SECONDS;
        const cutoffIso = new Date(cutoffSec * 1000).toISOString();

        const id = insertOpenConversation(db, sessionId, lastMessageAtIso);

        const results = getOpenConversationsOlderThan(db, cutoffIso);

        expect(results.length).toBe(1);
        expect(results[0].id).toBe(id);
        expect(results[0].session_id).toBe(sessionId);

        // Clean up
        db.exec('DELETE FROM chat_conversations');
      }),
      { numRuns: 100 },
    );
  });
});
