import db from '../db.js';
import type { ContactData } from '../../shared/chatTypes.js';

// ============================================================
// Conversation Store — CRUD operations for chat conversations,
// messages, and contact data.
// ============================================================

export interface ConversationRow {
  id: number;
  session_id: string;
  status: 'open' | 'closed';
  closure_reason: 'timeout' | 'goodbye' | 'session_lost' | null;
  created_at: string;
  last_message_at: string;
  closed_at: string | null;
}

export interface MessageRow {
  id: number;
  conversation_id: number;
  role: 'visitor' | 'assistant';
  content: string;
  created_at: string;
}

// ----------------------------------------------------------
// Prepared statements (lazy-initialized for performance)
// ----------------------------------------------------------

const stmts = {
  insertConversation: db.prepare(
    `INSERT INTO chat_conversations (session_id, status, created_at, last_message_at)
     VALUES (?, 'open', ?, ?)`
  ),
  getConversationById: db.prepare(
    `SELECT * FROM chat_conversations WHERE id = ?`
  ),
  getConversationBySession: db.prepare(
    `SELECT * FROM chat_conversations WHERE session_id = ?`
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
  getOpenConversationsOlderThan: db.prepare(
    `SELECT * FROM chat_conversations WHERE status = 'open' AND last_message_at < ?`
  ),
};

// ----------------------------------------------------------
// Public API
// ----------------------------------------------------------

/**
 * Create a new conversation for the given session ID.
 * Returns the full conversation row.
 */
export function createConversation(sessionId: string): ConversationRow {
  const now = new Date().toISOString();
  const result = stmts.insertConversation.run(sessionId, now, now);
  return stmts.getConversationById.get(result.lastInsertRowid) as ConversationRow;
}

/**
 * Look up a conversation by its session_id.
 * Returns the conversation row or null if not found.
 */
export function getConversationBySession(sessionId: string): ConversationRow | null {
  return (stmts.getConversationBySession.get(sessionId) as ConversationRow) ?? null;
}

/**
 * Add a message to a conversation.
 * Also updates last_message_at on the conversation.
 * Returns the inserted message row.
 */
export function addMessage(
  conversationId: number,
  role: 'visitor' | 'assistant',
  content: string
): MessageRow {
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
}

/**
 * Get all messages for a conversation, ordered by created_at ASC.
 */
export function getMessages(conversationId: number): MessageRow[] {
  return stmts.getMessages.all(conversationId) as MessageRow[];
}

/**
 * Close a conversation with a specific reason.
 * Sets status='closed', closure_reason, and closed_at to the current time.
 */
export function closeConversation(
  conversationId: number,
  reason: 'timeout' | 'goodbye' | 'session_lost'
): void {
  const now = new Date().toISOString();
  stmts.closeConversation.run(reason, now, conversationId);
}

/**
 * Upsert contact data for a conversation.
 * Only updates fields from contactData that are non-null.
 * Uses INSERT OR REPLACE with merged values from any existing record.
 */
export function updateContact(conversationId: number, contactData: ContactData): void {
  const now = new Date().toISOString();
  const existing = stmts.getContact.get(conversationId) as {
    name: string | null;
    last_name: string | null;
    email: string | null;
    phone: string | null;
    company: string | null;
  } | undefined;

  // Merge: new non-null values override existing values
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
  ).run(
    conversationId,
    merged.name,
    merged.last_name,
    merged.email,
    merged.phone,
    merged.company,
    now
  );
}

/**
 * Get contact data for a conversation.
 * Returns ContactData or null if no contact record exists.
 */
export function getContact(conversationId: number): ContactData | null {
  const row = stmts.getContact.get(conversationId) as {
    name: string | null;
    last_name: string | null;
    email: string | null;
    phone: string | null;
    company: string | null;
  } | undefined;

  if (!row) return null;

  return {
    name: row.name,
    lastName: row.last_name,
    email: row.email,
    phone: row.phone,
    company: row.company,
  };
}

/**
 * Get all open conversations whose last_message_at is older than the given timestamp.
 * Used by the session timeout cleanup job.
 */
export function getOpenConversationsOlderThan(timestamp: string): ConversationRow[] {
  return stmts.getOpenConversationsOlderThan.all(timestamp) as ConversationRow[];
}
