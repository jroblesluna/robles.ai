import nodemailer from 'nodemailer';
import { getMessages, getContact } from './conversationStore.js';
import type { MessageRow } from './conversationStore.js';
import type { ContactData } from '../../shared/chatTypes.js';

// ============================================================
// Chat Notifier — Sends email notification on conversation close
// with contact data header and full transcript.
// ============================================================

/**
 * Generate the HTML email body for a closed conversation.
 * Exported for testing purposes.
 */
export function generateEmailHtml(
  contact: ContactData | null,
  messages: MessageRow[]
): string {
  // Contact data header section
  let contactSection: string;
  if (contact && (contact.name || contact.lastName || contact.email || contact.phone || contact.company)) {
    const fields: string[] = [];
    if (contact.name) fields.push(`<p><strong>Name:</strong> ${escapeHtml(contact.name)}</p>`);
    if (contact.lastName) fields.push(`<p><strong>Last Name:</strong> ${escapeHtml(contact.lastName)}</p>`);
    if (contact.email) fields.push(`<p><strong>Email:</strong> ${escapeHtml(contact.email)}</p>`);
    if (contact.phone) fields.push(`<p><strong>Phone:</strong> ${escapeHtml(contact.phone)}</p>`);
    if (contact.company) fields.push(`<p><strong>Company:</strong> ${escapeHtml(contact.company)}</p>`);
    contactSection = `
      <div style="background:#f4f4f4;padding:16px;border-radius:8px;margin-bottom:24px;">
        <h2 style="margin:0 0 12px 0;font-size:16px;color:#333;">Contact Information</h2>
        ${fields.join('\n        ')}
      </div>`;
  } else {
    contactSection = `
      <div style="background:#fff3cd;padding:16px;border-radius:8px;margin-bottom:24px;">
        <p style="margin:0;color:#856404;"><strong>No contact information captured.</strong></p>
      </div>`;
  }

  // Transcript section
  const messageRows = messages.map((msg) => {
    const roleLabel = msg.role === 'visitor' ? 'Visitor' : 'Assistant';
    const roleColor = msg.role === 'visitor' ? '#2563eb' : '#16a34a';
    const timestamp = formatTimestamp(msg.created_at);
    return `
      <div style="margin-bottom:12px;padding:8px 12px;border-left:3px solid ${roleColor};background:#fafafa;border-radius:4px;">
        <p style="margin:0 0 4px 0;font-size:12px;color:#666;">
          <strong style="color:${roleColor};">${roleLabel}</strong> — ${timestamp}
        </p>
        <p style="margin:0;white-space:pre-wrap;">${escapeHtml(msg.content)}</p>
      </div>`;
  });

  return `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
      <h1 style="font-size:20px;color:#111;border-bottom:1px solid #eee;padding-bottom:12px;">
        Chat Transcript
      </h1>
      ${contactSection}
      <h2 style="font-size:16px;color:#333;margin-bottom:12px;">Conversation Transcript</h2>
      ${messageRows.join('')}
    </div>`;
}

/**
 * Build the email subject line from contact data.
 */
export function buildSubject(contact: ContactData | null): string {
  if (contact?.name) {
    const fullName = contact.lastName
      ? `${contact.name} ${contact.lastName}`
      : contact.name;
    return `Chat Transcript - ${fullName}`;
  }
  return 'Chat Transcript - Anonymous';
}

/**
 * Send a conversation email notification.
 * This function never throws — failures are logged and swallowed
 * so that session closure is never blocked by email issues.
 */
export async function sendConversationEmail(conversationId: number): Promise<void> {
  try {
    const messages = getMessages(conversationId);
    const contact = getContact(conversationId);

    const subject = buildSubject(contact);
    const html = generateEmailHtml(contact, messages);

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_TO,
      subject,
      html,
    });

    console.log(`✅ Chat transcript email sent for conversation ${conversationId}`);
  } catch (error) {
    console.error(`❌ Failed to send chat transcript email for conversation ${conversationId}:`, error);
    // Do NOT re-throw — email failures must not block session closure
  }
}

// ----------------------------------------------------------
// Helpers
// ----------------------------------------------------------

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatTimestamp(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoString;
  }
}
