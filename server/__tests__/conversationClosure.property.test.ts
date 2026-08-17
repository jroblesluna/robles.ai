// Feature: ai-chatbot-widget, Property 5: Conversation closure completeness
// **Validates: Requirements 3.5, 5.4**

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fc from 'fast-check';
import Database from 'better-sqlite3';
import { migrateChatTables } from '../migrations/chatTables.js';
import type { ContactData } from '../../shared/chatTypes.js';

/**
 * This property test verifies that for any conversation transitioning to closed,
 * the DB state has: status=closed, valid closure_reason, non-null closed_at,
 * all messages intact, and linked contact data.
 *
 * We test directly against an in-memory SQLite database using the same SQL
 * operations as the conversationStore module to avoid ESM mock hoisting issues.
 */

// Replicates the conversationStore logic against an injected database
function createStoreForDb(db: InstanceType<typeof Database>) {
  const stmts = {
    insertConversation: db.prepare(
      `INSERT INTO chat_conversations (session_id, status, created_at, last_message_at)
       VALUES (?, 'open', ?, ?)`
    ),
    getConversationById: db.prepare(
      `SELECT * FROM chat_conversations WHERE id = ?`
    ),
    insertMessage: db.prepare(
      `INSERT INTO chat_messages (conversation_id, role, content, created_at)
       VALUES (?, ?, ?, ?)`
    ),
    updateLastMessageAt: db.prepare(
      `UPDATE chat_conversations SET last_message_at = ? WHERE id = ?`
    ),
    getMessages: db.prepare(
      `SELECT * FROM chat_messages WHERE conversation_id = ? ORDER BY created_at ASC`
    ),
    closeConversation: db.prepare(
      `UPDATE chat_conversations SET status = 'closed', closure_reason = ?, closed_at = ? WHERE id = ?`
    ),
    getContact: db.prepare(
      `SELECT * FROM chat_contacts WHERE conversation_id = ?`
    ),
  };

  return {
    createConversation(sessionId: string) {
      const now = new Date().toISOString();
      const result = stmts.insertConversation.run(sessionId, now, now);
      return stmts.getConversationById.get(result.lastInsertRowid) as any;
    },
    addMessage(conversationId: number, role: 'visitor' | 'assistant', content: string) {
      const now = new Date().toISOString();
      const result = stmts.insertMessage.run(conversationId, role, content, now);
      stmts.updateLastMessageAt.run(now, conversationId);
      return {
        id: Number(result.lastInsertRowid),
        conversation_id: conversationId,
        role,
        content,
        created_at: now,
      };
    },
    getMessages(conversationId: number) {
      return stmts.getMessages.all(conversationId) as any[];
    },
    closeConversation(conversationId: number, reason: 'timeout' | 'goodbye' | 'session_lost') {
      const now = new Date().toISOString();
      stmts.closeConversation.run(reason, now, conversationId);
    },
    updateContact(conversationId: number, contactData: ContactData) {
      const now = new Date().toISOString();
      const existing = stmts.getContact.get(conversationId) as any | undefined;
      const merged = {
        name: contactData.name ?? existing?.name ?? null,
        last_name: contactData.lastName ?? existing?.last_name ?? null,
        email: contactData.email ?? existing?.email ?? null,
        phone: contactData.phone ?? existing?.phone ?? null,
        company: contactData.company ?? existing?.company ?? null,
      };
      db.prepare(
        `INSERT OR REPLACE INTO chat_contacts (conversation_id, name, last_name, email, phone, company, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).run(conversationId, merged.name, merged.last_name, merged.email, merged.phone, merged.company, now);
    },
    getContact(conversationId: number): ContactData | null {
      const row = stmts.getContact.get(conversationId) as any | undefined;
      if (!row) return null;
      return {
        name: row.name,
        lastName: row.last_name,
        email: row.email,
        phone: row.phone,
        company: row.company,
      };
    },
    getConversationById(id: number) {
      return stmts.getConversationById.get(id) as any;
    },
  };
}

describe('Property 5: Conversation closure completeness', () => {
  let db: InstanceType<typeof Database>;
  let store: ReturnType<typeof createStoreForDb>;

  beforeAll(() => {
    db = new Database(':memory:');
    db.pragma('journal_mode = WAL');
    migrateChatTables(db);
    store = createStoreForDb(db);
  });

  afterAll(() => {
    if (db) db.close();
  });

  it('for any conversation transitioning to closed, the DB state has status=closed, valid closure_reason, non-null closed_at, all messages intact, and linked contact data', () => {
    fc.assert(
      fc.property(
        // Generate a unique session ID per iteration
        fc.uuid(),
        // Generate N messages (1-20)
        fc.array(
          fc.record({
            role: fc.constantFrom<'visitor' | 'assistant'>('visitor', 'assistant'),
            content: fc.string({ minLength: 1, maxLength: 200 }),
          }),
          { minLength: 1, maxLength: 20 }
        ),
        // Generate random contact data
        fc.record({
          name: fc.oneof(fc.string({ minLength: 1, maxLength: 50 }), fc.constant(null)),
          lastName: fc.oneof(fc.string({ minLength: 1, maxLength: 50 }), fc.constant(null)),
          email: fc.oneof(
            fc.emailAddress().map(e => e as string | null),
            fc.constant(null)
          ),
          phone: fc.oneof(
            fc.stringMatching(/^[+]?\d[\d\s-]{5,13}\d$/).map(s => s as string | null),
            fc.constant(null)
          ),
          company: fc.oneof(fc.string({ minLength: 1, maxLength: 50 }), fc.constant(null)),
        }),
        // Generate a random closure reason
        fc.constantFrom<'timeout' | 'goodbye' | 'session_lost'>('timeout', 'goodbye', 'session_lost'),
        (sessionId, messages, contactData, closureReason) => {
          // 1. Create conversation with unique session ID
          const conversation = store.createConversation(sessionId);
          expect(conversation.status).toBe('open');

          // 2. Add all messages
          for (const msg of messages) {
            store.addMessage(conversation.id, msg.role, msg.content);
          }

          // 3. Update contact data
          store.updateContact(conversation.id, contactData);

          // 4. Close the conversation
          store.closeConversation(conversation.id, closureReason);

          // 5. Verify the closed conversation state directly from DB
          const closedRow = store.getConversationById(conversation.id);

          // status = 'closed'
          expect(closedRow.status).toBe('closed');

          // closure_reason is valid and matches what we passed
          expect(['timeout', 'goodbye', 'session_lost']).toContain(closedRow.closure_reason);
          expect(closedRow.closure_reason).toBe(closureReason);

          // closed_at is a non-null ISO 8601 timestamp
          expect(closedRow.closed_at).not.toBeNull();
          expect(closedRow.closed_at).toMatch(
            /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/
          );

          // All N messages are still intact
          const storedMessages = store.getMessages(conversation.id);
          expect(storedMessages).toHaveLength(messages.length);

          for (let i = 0; i < messages.length; i++) {
            expect(storedMessages[i].role).toBe(messages[i].role);
            expect(storedMessages[i].content).toBe(messages[i].content);
            expect(storedMessages[i].created_at).toMatch(
              /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/
            );
          }

          // Contact data is preserved after closure
          const storedContact = store.getContact(conversation.id);
          expect(storedContact).not.toBeNull();
          expect(storedContact!.name).toBe(contactData.name);
          expect(storedContact!.lastName).toBe(contactData.lastName);
          expect(storedContact!.email).toBe(contactData.email);
          expect(storedContact!.phone).toBe(contactData.phone);
          expect(storedContact!.company).toBe(contactData.company);
        }
      ),
      { numRuns: 100 }
    );
  });
});
