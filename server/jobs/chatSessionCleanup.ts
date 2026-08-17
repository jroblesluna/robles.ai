import cron from 'node-cron';
import {
  getOpenConversationsOlderThan,
  closeConversation,
} from '../services/conversationStore.js';
import { sendConversationEmail } from '../services/chatNotifier.js';

/**
 * Starts the chat session timeout cleanup job.
 * Runs every 5 minutes, finds open conversations with last_message_at older
 * than 1 hour, closes them with reason 'timeout', and sends email notifications.
 */
export function startChatSessionCleanup(): void {
  cron.schedule('*/5 * * * *', async () => {
    try {
      const cutoff = new Date(Date.now() - 3600 * 1000).toISOString();
      const staleConversations = getOpenConversationsOlderThan(cutoff);

      if (staleConversations.length === 0) return;

      for (const conversation of staleConversations) {
        try {
          closeConversation(conversation.id, 'timeout');
          await sendConversationEmail(conversation.id);
        } catch (err) {
          console.error(
            `[ChatCleanup] Error closing conversation ${conversation.id}:`,
            err
          );
        }
      }

      console.log(
        `[ChatCleanup] Closed ${staleConversations.length} timed-out conversation(s).`
      );
    } catch (err) {
      console.error('[ChatCleanup] Error running session cleanup job:', err);
    }
  });

  console.log('[ChatCleanup] Session timeout cleanup job scheduled (every 5 minutes).');
}
