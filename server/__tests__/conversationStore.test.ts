import { describe, it, expect, vi, beforeEach } from 'vitest';

// Use vi.hoisted to define mocks before module-level prepare() calls
const { mockGet, mockRun, mockAll, mockPrepare } = vi.hoisted(() => {
  const mockGet = vi.fn();
  const mockRun = vi.fn();
  const mockAll = vi.fn();
  const mockPrepare = vi.fn(() => ({
    get: mockGet,
    run: mockRun,
    all: mockAll,
  }));
  return { mockGet, mockRun, mockAll, mockPrepare };
});

vi.mock('../db.js', () => ({
  default: {
    prepare: (...args: any[]) => mockPrepare(...args),
  },
}));

import {
  createConversation,
  getConversationBySession,
  addMessage,
  getMessages,
  closeConversation,
  updateContact,
  getContact,
  getOpenConversationsOlderThan,
} from '../services/conversationStore.js';

describe('conversationStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createConversation()', () => {
    it('inserts a new conversation and returns the full row', () => {
      const fakeRow = {
        id: 1,
        session_id: 'abc-123',
        status: 'open',
        closure_reason: null,
        created_at: '2025-01-01T00:00:00.000Z',
        last_message_at: '2025-01-01T00:00:00.000Z',
        closed_at: null,
      };
      mockRun.mockReturnValue({ lastInsertRowid: 1 });
      mockGet.mockReturnValue(fakeRow);

      const result = createConversation('abc-123');

      expect(result).toEqual(fakeRow);
      expect(mockRun).toHaveBeenCalledWith(
        'abc-123',
        expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
        expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/)
      );
      expect(mockGet).toHaveBeenCalledWith(1);
    });
  });

  describe('getConversationBySession()', () => {
    it('returns conversation row when found', () => {
      const fakeRow = {
        id: 2,
        session_id: 'session-xyz',
        status: 'open',
        closure_reason: null,
        created_at: '2025-01-01T00:00:00.000Z',
        last_message_at: '2025-01-01T00:00:00.000Z',
        closed_at: null,
      };
      mockGet.mockReturnValue(fakeRow);

      const result = getConversationBySession('session-xyz');

      expect(result).toEqual(fakeRow);
      expect(mockGet).toHaveBeenCalledWith('session-xyz');
    });

    it('returns null when not found', () => {
      mockGet.mockReturnValue(undefined);

      const result = getConversationBySession('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('addMessage()', () => {
    it('inserts a message and updates last_message_at', () => {
      mockRun.mockReturnValue({ lastInsertRowid: 10 });

      const result = addMessage(1, 'visitor', 'Hello there');

      expect(result.id).toBe(10);
      expect(result.conversation_id).toBe(1);
      expect(result.role).toBe('visitor');
      expect(result.content).toBe('Hello there');
      expect(result.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      // run is called twice: once for insert, once for update last_message_at
      expect(mockRun).toHaveBeenCalledTimes(2);
    });

    it('stores assistant messages', () => {
      mockRun.mockReturnValue({ lastInsertRowid: 11 });

      const result = addMessage(1, 'assistant', 'Hi! How can I help?');

      expect(result.role).toBe('assistant');
      expect(result.content).toBe('Hi! How can I help?');
    });
  });

  describe('getMessages()', () => {
    it('returns all messages for a conversation ordered by created_at', () => {
      const fakeMessages = [
        { id: 1, conversation_id: 1, role: 'visitor', content: 'Hi', created_at: '2025-01-01T00:00:00.000Z' },
        { id: 2, conversation_id: 1, role: 'assistant', content: 'Hello!', created_at: '2025-01-01T00:00:01.000Z' },
      ];
      mockAll.mockReturnValue(fakeMessages);

      const result = getMessages(1);

      expect(result).toEqual(fakeMessages);
      expect(result).toHaveLength(2);
      expect(mockAll).toHaveBeenCalledWith(1);
    });

    it('returns empty array when no messages exist', () => {
      mockAll.mockReturnValue([]);

      const result = getMessages(999);

      expect(result).toEqual([]);
    });
  });

  describe('closeConversation()', () => {
    it('updates status to closed with timeout reason', () => {
      closeConversation(1, 'timeout');

      expect(mockRun).toHaveBeenCalledWith(
        'timeout',
        expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
        1
      );
    });

    it('accepts goodbye as closure reason', () => {
      closeConversation(2, 'goodbye');

      expect(mockRun).toHaveBeenCalledWith(
        'goodbye',
        expect.any(String),
        2
      );
    });

    it('accepts session_lost as closure reason', () => {
      closeConversation(3, 'session_lost');

      expect(mockRun).toHaveBeenCalledWith(
        'session_lost',
        expect.any(String),
        3
      );
    });
  });

  describe('updateContact()', () => {
    it('inserts contact data when no existing record', () => {
      mockGet.mockReturnValue(undefined);

      updateContact(1, {
        name: 'Antonio',
        lastName: 'Robles',
        email: 'antonio@example.com',
        phone: null,
        company: null,
      });

      expect(mockRun).toHaveBeenCalledWith(
        1,
        'Antonio',
        'Robles',
        'antonio@example.com',
        null,
        null,
        expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/)
      );
    });

    it('merges with existing data, keeping existing values when new values are null', () => {
      mockGet.mockReturnValue({
        name: 'Antonio',
        last_name: 'Robles',
        email: 'antonio@example.com',
        phone: null,
        company: null,
      });

      updateContact(1, {
        name: null,
        lastName: null,
        email: null,
        phone: '+1234567890',
        company: 'Robles.AI',
      });

      expect(mockRun).toHaveBeenCalledWith(
        1,
        'Antonio',             // kept from existing
        'Robles',              // kept from existing
        'antonio@example.com', // kept from existing
        '+1234567890',         // new value
        'Robles.AI',           // new value
        expect.any(String)
      );
    });

    it('overrides existing values with new non-null values', () => {
      mockGet.mockReturnValue({
        name: 'Old Name',
        last_name: null,
        email: 'old@example.com',
        phone: null,
        company: null,
      });

      updateContact(1, {
        name: 'New Name',
        lastName: null,
        email: 'new@example.com',
        phone: null,
        company: null,
      });

      expect(mockRun).toHaveBeenCalledWith(
        1,
        'New Name',
        null,
        'new@example.com',
        null,
        null,
        expect.any(String)
      );
    });
  });

  describe('getContact()', () => {
    it('returns ContactData when record exists', () => {
      mockGet.mockReturnValue({
        name: 'Antonio',
        last_name: 'Robles',
        email: 'antonio@example.com',
        phone: null,
        company: 'Robles.AI',
      });

      const result = getContact(1);

      expect(result).toEqual({
        name: 'Antonio',
        lastName: 'Robles',
        email: 'antonio@example.com',
        phone: null,
        company: 'Robles.AI',
      });
    });

    it('returns null when no contact record exists', () => {
      mockGet.mockReturnValue(undefined);

      const result = getContact(999);

      expect(result).toBeNull();
    });
  });

  describe('getOpenConversationsOlderThan()', () => {
    it('returns open conversations older than the given timestamp', () => {
      const fakeConversations = [
        { id: 1, session_id: 'old-1', status: 'open', last_message_at: '2025-01-01T00:00:00.000Z' },
        { id: 2, session_id: 'old-2', status: 'open', last_message_at: '2025-01-01T00:30:00.000Z' },
      ];
      mockAll.mockReturnValue(fakeConversations);

      const result = getOpenConversationsOlderThan('2025-01-01T01:00:00.000Z');

      expect(result).toEqual(fakeConversations);
      expect(result).toHaveLength(2);
      expect(mockAll).toHaveBeenCalledWith('2025-01-01T01:00:00.000Z');
    });

    it('returns empty array when no matching conversations', () => {
      mockAll.mockReturnValue([]);

      const result = getOpenConversationsOlderThan('2020-01-01T00:00:00.000Z');

      expect(result).toEqual([]);
    });
  });
});
