import cron from 'node-cron';
import db from '../db.js';
import {
  getOpenConversationsOlderThan,
  closeConversation,
  getMessages,
} from '../services/conversationStore.js';
import { sendConversationEmail } from '../services/chatNotifier.js';

const BATCH_LIMIT = 50;

/**
 * Starts the chat session timeout cleanup job.
 * Runs every 5 minutes, finds open conversations with last_message_at older
 * than 1 hour, closes them with reason 'timeout', and sends email notifications.
 *
 * Empty conversations (0 messages) are deleted as orphaned sessions.
 * Only conversations with at least 1 message are closed and emailed.
 * A batch limit prevents overwhelming the email system.
 */
export function startChatSessionCleanup(): void {
  cron.schedule('*/5 * * * *', async () => {
    try {
      const cutoff = new Date(Date.now() - 3600 * 1000).toISOString();
      const staleConversations = getOpenConversationsOlderThan(cutoff);

      if (staleConversations.length === 0) return;

      // Delete empty conversations (no messages) — these are orphaned sessions
      const emptyIds = staleConversations
        .filter((c) => getMessages(c.id).length === 0)
        .map((c) => c.id);

      if (emptyIds.length > 0) {
        // Delete in batches using a transaction
        const deleteStmt = db.prepare('DELETE FROM chat_conversations WHERE id = ?');
        const deleteContactStmt = db.prepare('DELETE FROM chat_contacts WHERE conversation_id = ?');
        const deleteTransaction = db.transaction((ids: number[]) => {
          for (const id of ids) {
            deleteContactStmt.run(id);
            deleteStmt.run(id);
          }
        });
        deleteTransaction(emptyIds);
        console.log(`[ChatCleanup] Deleted ${emptyIds.length} empty orphan session(s).`);
      }

      // Process conversations WITH messages (limit batch size)
      const withMessages = staleConversations
        .filter((c) => !emptyIds.includes(c.id))
        .slice(0, BATCH_LIMIT);

      let closed = 0;
      let emailed = 0;

      for (const conversation of withMessages) {
        try {
          closeConversation(conversation.id, 'timeout');
          closed++;
          await sendConversationEmail(conversation.id);
          emailed++;
        } catch (err) {
          console.error(
            `[ChatCleanup] Error closing conversation ${conversation.id}:`,
            err
          );
        }
      }

      if (closed > 0) {
        console.log(
          `[ChatCleanup] Closed ${closed} timed-out conversation(s), sent ${emailed} email(s).`
        );
      }
    } catch (err) {
      console.error('[ChatCleanup] Error running session cleanup job:', err);
    }
  });

  console.log('[ChatCleanup] Session timeout cleanup job scheduled (every 5 minutes).');
}
