import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the conversationStore module
vi.mock('../services/conversationStore.js', () => ({
  getMessages: vi.fn(),
  getContact: vi.fn(),
}));

// Mock nodemailer
const mockSendMail = vi.fn();
vi.mock('nodemailer', () => ({
  default: {
    createTransport: vi.fn(() => ({
      sendMail: mockSendMail,
    })),
  },
}));

import { getMessages, getContact } from '../services/conversationStore.js';
import nodemailer from 'nodemailer';
import {
  sendConversationEmail,
  generateEmailHtml,
  buildSubject,
} from '../services/chatNotifier.js';
import type { MessageRow } from '../services/conversationStore.js';
import type { ContactData } from '../../shared/chatTypes.js';

describe('chatNotifier', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.EMAIL_USER = 'test@example.com';
    process.env.EMAIL_PASS = 'password';
    process.env.EMAIL_TO = 'admin@example.com';
  });

  describe('buildSubject()', () => {
    it('includes visitor name when available', () => {
      const contact: ContactData = {
        name: 'Antonio',
        lastName: 'Robles',
        email: 'a@b.com',
        phone: null,
        company: null,
      };
      expect(buildSubject(contact)).toBe('Chat Transcript - Antonio Robles');
    });

    it('uses first name only when no last name', () => {
      const contact: ContactData = {
        name: 'John',
        lastName: null,
        email: null,
        phone: null,
        company: null,
      };
      expect(buildSubject(contact)).toBe('Chat Transcript - John');
    });

    it('returns Anonymous when no contact data', () => {
      expect(buildSubject(null)).toBe('Chat Transcript - Anonymous');
    });

    it('returns Anonymous when contact has no name', () => {
      const contact: ContactData = {
        name: null,
        lastName: null,
        email: 'test@test.com',
        phone: null,
        company: null,
      };
      expect(buildSubject(contact)).toBe('Chat Transcript - Anonymous');
    });
  });

  describe('generateEmailHtml()', () => {
    const sampleMessages: MessageRow[] = [
      { id: 1, conversation_id: 1, role: 'visitor', content: 'Hello!', created_at: '2025-01-15T10:00:00.000Z' },
      { id: 2, conversation_id: 1, role: 'assistant', content: 'Hi there! How can I help?', created_at: '2025-01-15T10:00:05.000Z' },
      { id: 3, conversation_id: 1, role: 'visitor', content: 'Tell me about your services', created_at: '2025-01-15T10:01:00.000Z' },
    ];

    it('includes contact information when available', () => {
      const contact: ContactData = {
        name: 'Antonio',
        lastName: 'Robles',
        email: 'antonio@robles.ai',
        phone: '+1234567890',
        company: 'Robles.AI',
      };

      const html = generateEmailHtml(contact, sampleMessages);

      expect(html).toContain('Contact Information');
      expect(html).toContain('Antonio');
      expect(html).toContain('Robles');
      expect(html).toContain('antonio@robles.ai');
      expect(html).toContain('+1234567890');
      expect(html).toContain('Robles.AI');
    });

    it('shows "no contact" notice when contact is null', () => {
      const html = generateEmailHtml(null, sampleMessages);

      expect(html).toContain('No contact information captured');
      expect(html).not.toContain('Contact Information');
    });

    it('shows "no contact" notice when all contact fields are null', () => {
      const contact: ContactData = {
        name: null,
        lastName: null,
        email: null,
        phone: null,
        company: null,
      };

      const html = generateEmailHtml(contact, sampleMessages);

      expect(html).toContain('No contact information captured');
    });

    it('includes all messages in chronological order', () => {
      const html = generateEmailHtml(null, sampleMessages);

      expect(html).toContain('Hello!');
      expect(html).toContain('Hi there! How can I help?');
      expect(html).toContain('Tell me about your services');

      // Check order: visitor message comes before assistant message
      const helloIdx = html.indexOf('Hello!');
      const assistantIdx = html.indexOf('Hi there! How can I help?');
      const servicesIdx = html.indexOf('Tell me about your services');
      expect(helloIdx).toBeLessThan(assistantIdx);
      expect(assistantIdx).toBeLessThan(servicesIdx);
    });

    it('labels messages with correct role indicators', () => {
      const html = generateEmailHtml(null, sampleMessages);

      expect(html).toContain('Visitor');
      expect(html).toContain('Assistant');
    });

    it('escapes HTML special characters in message content', () => {
      const messagesWithHtml: MessageRow[] = [
        { id: 1, conversation_id: 1, role: 'visitor', content: '<script>alert("xss")</script>', created_at: '2025-01-15T10:00:00.000Z' },
      ];

      const html = generateEmailHtml(null, messagesWithHtml);

      expect(html).not.toContain('<script>');
      expect(html).toContain('&lt;script&gt;');
    });

    it('handles empty messages array', () => {
      const html = generateEmailHtml(null, []);

      expect(html).toContain('Chat Transcript');
      expect(html).toContain('Conversation Transcript');
    });
  });

  describe('sendConversationEmail()', () => {
    it('sends email with correct parameters', async () => {
      const mockMessages: MessageRow[] = [
        { id: 1, conversation_id: 5, role: 'visitor', content: 'Hi', created_at: '2025-01-15T10:00:00.000Z' },
      ];
      const mockContact: ContactData = {
        name: 'Test',
        lastName: null,
        email: 'test@test.com',
        phone: null,
        company: null,
      };

      (getMessages as ReturnType<typeof vi.fn>).mockReturnValue(mockMessages);
      (getContact as ReturnType<typeof vi.fn>).mockReturnValue(mockContact);
      mockSendMail.mockResolvedValue({ messageId: 'abc123' });

      await sendConversationEmail(5);

      expect(getMessages).toHaveBeenCalledWith(5);
      expect(getContact).toHaveBeenCalledWith(5);
      expect(nodemailer.createTransport).toHaveBeenCalledWith({
        service: 'gmail',
        auth: {
          user: 'test@example.com',
          pass: 'password',
        },
      });
      expect(mockSendMail).toHaveBeenCalledWith({
        from: 'test@example.com',
        to: 'admin@example.com',
        subject: 'Chat Transcript - Test',
        html: expect.stringContaining('Hi'),
      });
    });

    it('does not throw when email sending fails', async () => {
      (getMessages as ReturnType<typeof vi.fn>).mockReturnValue([]);
      (getContact as ReturnType<typeof vi.fn>).mockReturnValue(null);
      mockSendMail.mockRejectedValue(new Error('SMTP connection failed'));

      // Should NOT throw
      await expect(sendConversationEmail(1)).resolves.toBeUndefined();
    });

    it('does not throw when getMessages throws', async () => {
      (getMessages as ReturnType<typeof vi.fn>).mockImplementation(() => {
        throw new Error('DB error');
      });

      await expect(sendConversationEmail(1)).resolves.toBeUndefined();
    });

    it('logs success message on successful send', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      (getMessages as ReturnType<typeof vi.fn>).mockReturnValue([]);
      (getContact as ReturnType<typeof vi.fn>).mockReturnValue(null);
      mockSendMail.mockResolvedValue({});

      await sendConversationEmail(3);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Chat transcript email sent for conversation 3')
      );
      consoleSpy.mockRestore();
    });

    it('logs error on failure', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      (getMessages as ReturnType<typeof vi.fn>).mockReturnValue([]);
      (getContact as ReturnType<typeof vi.fn>).mockReturnValue(null);
      mockSendMail.mockRejectedValue(new Error('Network error'));

      await sendConversationEmail(7);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to send chat transcript email for conversation 7'),
        expect.any(Error)
      );
      consoleSpy.mockRestore();
    });
  });
});
