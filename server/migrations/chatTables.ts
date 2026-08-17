import type Database from 'better-sqlite3';

/**
 * Creates the chat-related tables and indexes for the AI chatbot widget.
 * Safe to call multiple times — uses IF NOT EXISTS.
 */
export function migrateChatTables(db: Database.Database): void {
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
