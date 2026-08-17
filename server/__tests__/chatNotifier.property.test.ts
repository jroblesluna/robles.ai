import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { generateEmailHtml, buildSubject } from '../services/chatNotifier.js';
import type { MessageRow } from '../services/conversationStore.js';
import type { ContactData } from '../../shared/chatTypes.js';

/**
 * Property 6: Email notification completeness
 *
 * For any closed conversation with M messages and optional contact data,
 * the generated email HTML contains: all M messages in chronological order
 * with their roles, all non-null contact fields in a header section (or a
 * "no contact information" notice if all fields are null), and a valid subject line.
 *
 * **Validates: Requirements 6.1, 6.2, 6.3, 6.4**
 */

// ─── Generators ────────────────────────────────────────────────────────────────

/**
 * Generate a MessageRow with random role and content.
 * Timestamps are sequential to ensure chronological ordering.
 */
function messageRowArb(index: number): fc.Arbitrary<MessageRow> {
  return fc.record({
    id: fc.constant(index + 1),
    conversation_id: fc.constant(1),
    role: fc.constantFrom('visitor' as const, 'assistant' as const),
    content: fc.string({ minLength: 1, maxLength: 200 }).filter((s) => s.trim().length > 0),
    // Sequential timestamps so order is deterministic
    created_at: fc.constant(new Date(2025, 0, 1, 0, 0, index).toISOString()),
  });
}

/**
 * Generate an array of 1–30 messages with sequential timestamps.
 */
const messagesArb: fc.Arbitrary<MessageRow[]> = fc
  .integer({ min: 1, max: 30 })
  .chain((count) =>
    fc.tuple(...Array.from({ length: count }, (_, i) => messageRowArb(i)))
  )
  .map((tupleArr) => tupleArr as MessageRow[]);

/**
 * Generate random ContactData where each field is independently null or a non-empty string.
 */
const contactDataArb: fc.Arbitrary<ContactData> = fc.record({
  name: fc.option(fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0), { nil: null }),
  lastName: fc.option(fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0), { nil: null }),
  email: fc.option(fc.string({ minLength: 5, maxLength: 50 }).filter((s) => s.trim().length > 0), { nil: null }),
  phone: fc.option(fc.string({ minLength: 3, maxLength: 20 }).filter((s) => s.trim().length > 0), { nil: null }),
  company: fc.option(fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0), { nil: null }),
});

/**
 * Generate contact data that is either a ContactData object or null.
 */
const contactOrNullArb: fc.Arbitrary<ContactData | null> = fc.oneof(
  contactDataArb,
  fc.constant(null)
);

// ─── Helpers ───────────────────────────────────────────────────────────────────

/** Escape HTML the same way chatNotifier does, for substring matching */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function allContactFieldsNull(contact: ContactData | null): boolean {
  if (!contact) return true;
  return !contact.name && !contact.lastName && !contact.email && !contact.phone && !contact.company;
}

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe('chatNotifier — Property Tests', () => {
  describe('Property 6: Email notification completeness', () => {
    it('all M messages appear in the HTML in order (content substring matching)', () => {
      fc.assert(
        fc.property(messagesArb, contactOrNullArb, (messages, contact) => {
          const html = generateEmailHtml(contact, messages);

          // Every message content appears in the HTML (escaped)
          for (const msg of messages) {
            const escapedContent = escapeHtml(msg.content);
            expect(html).toContain(escapedContent);
          }

          // Messages appear in chronological order — each subsequent message's content
          // should appear at a later position in the HTML
          let lastIndex = -1;
          for (const msg of messages) {
            const escapedContent = escapeHtml(msg.content);
            const idx = html.indexOf(escapedContent, lastIndex + 1);
            expect(idx).toBeGreaterThan(lastIndex);
            lastIndex = idx;
          }
        }),
        { numRuns: 100 }
      );
    });

    it('all non-null contact fields appear in the HTML', () => {
      fc.assert(
        fc.property(messagesArb, contactDataArb, (messages, contact) => {
          const html = generateEmailHtml(contact, messages);

          if (contact.name) {
            expect(html).toContain(escapeHtml(contact.name));
          }
          if (contact.lastName) {
            expect(html).toContain(escapeHtml(contact.lastName));
          }
          if (contact.email) {
            expect(html).toContain(escapeHtml(contact.email));
          }
          if (contact.phone) {
            expect(html).toContain(escapeHtml(contact.phone));
          }
          if (contact.company) {
            expect(html).toContain(escapeHtml(contact.company));
          }
        }),
        { numRuns: 100 }
      );
    });

    it('if ALL contact fields are null, "No contact information" notice appears', () => {
      fc.assert(
        fc.property(
          messagesArb,
          fc.constantFrom(
            null,
            { name: null, lastName: null, email: null, phone: null, company: null } as ContactData
          ),
          (messages, contact) => {
            const html = generateEmailHtml(contact, messages);

            // The HTML should contain the "no contact" notice
            expect(html.toLowerCase()).toContain('no contact information');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('subject line is non-empty and contains visitor name (or "Anonymous")', () => {
      fc.assert(
        fc.property(contactOrNullArb, (contact) => {
          const subject = buildSubject(contact);

          // Subject is always non-empty
          expect(subject.length).toBeGreaterThan(0);

          // If contact has a name, it appears in the subject
          if (contact?.name) {
            expect(subject).toContain(contact.name);
            // If lastName is also set, it should appear too
            if (contact.lastName) {
              expect(subject).toContain(contact.lastName);
            }
          } else {
            // Otherwise "Anonymous" appears
            expect(subject).toContain('Anonymous');
          }
        }),
        { numRuns: 100 }
      );
    });

    it('role labels ("Visitor", "Assistant") appear for each message', () => {
      fc.assert(
        fc.property(messagesArb, contactOrNullArb, (messages, contact) => {
          const html = generateEmailHtml(contact, messages);

          // Count expected visitor and assistant messages
          const visitorCount = messages.filter((m) => m.role === 'visitor').length;
          const assistantCount = messages.filter((m) => m.role === 'assistant').length;

          // Count occurrences of role labels in the HTML
          const visitorMatches = html.match(/Visitor/g) || [];
          const assistantMatches = html.match(/Assistant/g) || [];

          // There should be at least as many role labels as messages of that role
          expect(visitorMatches.length).toBeGreaterThanOrEqual(visitorCount);
          expect(assistantMatches.length).toBeGreaterThanOrEqual(assistantCount);
        }),
        { numRuns: 100 }
      );
    });
  });
});
