import { describe, it, expect, beforeEach } from 'vitest';
import fc from 'fast-check';
import Database from 'better-sqlite3';
import { migrateChatTables } from '../migrations/chatTables.js';

/**
 * Property 2: Message persistence completeness
 *
 * For any sequence of N messages stored, querying history returns exactly N
 * messages in chronological order with valid roles, content, and timestamps.
 *
 * **Validates: Requirements 5.1, 5.2, 10.1**
 */

// Strategy: We create a fresh in-memory SQLite database for each test suite run,
// apply the chat tables migration, and exercise the same SQL operations that
// conversationStore.ts uses. This validates the real CRUD logic against a real
// SQLite database without touching the production DB file.

let testDb: ReturnType<typeof Database>;

describe('conversationStore — Property Tests', () => {
  beforeEach(() => {
    testDb = new Database(':memory:');
    testDb.pragma('journal_mode = WAL');
    migrateChatTables(testDb);
  });

  // Helper: mirrors conversationStore.createConversation
  function createConversation(sessionId: string) {
    const now = new Date().toISOString();
    const result = testDb
      .prepare(
        `INSERT INTO chat_conversations (session_id, status, created_at, last_message_at)
         VALUES (?, 'open', ?, ?)`
      )
      .run(sessionId, now, now);
    return testDb
      .prepare(`SELECT * FROM chat_conversations WHERE id = ?`)
      .get(result.lastInsertRowid) as {
      id: number;
      session_id: string;
      status: string;
      created_at: string;
      last_message_at: string;
    };
  }

  // Helper: mirrors conversationStore.addMessage
  function addMessage(
    conversationId: number,
    role: 'visitor' | 'assistant',
    content: string
  ) {
    const now = new Date().toISOString();
    const result = testDb
      .prepare(
        `INSERT INTO chat_messages (conversation_id, role, content, created_at)
         VALUES (?, ?, ?, ?)`
      )
      .run(conversationId, role, content, now);
    testDb
      .prepare(`UPDATE chat_conversations SET last_message_at = ? WHERE id = ?`)
      .run(now, conversationId);
    return {
      id: Number(result.lastInsertRowid),
      conversation_id: conversationId,
      role,
      content,
      created_at: now,
    };
  }

  // Helper: mirrors conversationStore.getMessages
  function getMessages(conversationId: number) {
    return testDb
      .prepare(
        `SELECT * FROM chat_messages WHERE conversation_id = ? ORDER BY created_at ASC`
      )
      .all(conversationId) as Array<{
      id: number;
      conversation_id: number;
      role: string;
      content: string;
      created_at: string;
    }>;
  }

  // ISO 8601 regex for validation
  const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/;

  describe('Property 2: Message persistence completeness', () => {
    it('for any sequence of N messages stored, querying returns exactly N messages in chronological order with valid roles, content, and timestamps', () => {
      fc.assert(
        fc.property(
          // Generate a non-empty array of messages with random role and non-empty content
          fc.array(
            fc.record({
              role: fc.constantFrom('visitor' as const, 'assistant' as const),
              content: fc.string({ minLength: 1, maxLength: 500 }),
            }),
            { minLength: 1, maxLength: 50 }
          ),
          (messages) => {
            // Fresh DB for each property iteration
            testDb.exec('DELETE FROM chat_messages');
            testDb.exec('DELETE FROM chat_conversations');

            // Create a conversation with a unique session ID
            const sessionId = `prop-test-${Date.now()}-${Math.random()}`;
            const conversation = createConversation(sessionId);

            // Add all messages
            for (const msg of messages) {
              addMessage(conversation.id, msg.role, msg.content);
            }

            // Query messages
            const retrieved = getMessages(conversation.id);

            // Assertion 1: Exact count matches
            expect(retrieved.length).toBe(messages.length);

            // Assertion 2: Messages are in chronological order (timestamps non-decreasing)
            for (let i = 1; i < retrieved.length; i++) {
              expect(retrieved[i].created_at >= retrieved[i - 1].created_at).toBe(true);
            }

            // Assertion 3: Each message has valid role, non-empty content, and ISO 8601 timestamp
            for (let i = 0; i < retrieved.length; i++) {
              const msg = retrieved[i];

              // Valid role
              expect(['visitor', 'assistant']).toContain(msg.role);

              // Role matches what was stored
              expect(msg.role).toBe(messages[i].role);

              // Non-empty content matching input
              expect(msg.content.length).toBeGreaterThan(0);
              expect(msg.content).toBe(messages[i].content);

              // Valid ISO 8601 timestamp
              expect(msg.created_at).toMatch(iso8601Regex);

              // Valid conversation_id
              expect(msg.conversation_id).toBe(conversation.id);
            }

            // Assertion 4: No duplicates (all IDs are unique)
            const ids = retrieved.map((m) => m.id);
            expect(new Set(ids).size).toBe(ids.length);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
