import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { EngineMessage } from '../services/chatEngine.js';

// ----------------------------------------------------------
// Mocks
// ----------------------------------------------------------

// Mock the db module (imported by chatEngine for getApiKey)
vi.mock('../db.js', () => ({
  default: {
    prepare: () => ({
      get: () => ({ value: 'test-api-key-123' }),
    }),
  },
}));

// Mock the chatContext module (imported by chatEngine)
vi.mock('../services/chatContext.js', () => ({
  getPageContext: vi.fn().mockResolvedValue('Mock page context'),
}));

// Mock OpenAI SDK
const mockCreate = vi.fn();

vi.mock('openai', () => {
  return {
    default: class MockOpenAI {
      chat = {
        completions: {
          create: mockCreate,
        },
      };
    },
  };
});

import { extractContactData } from '../services/chatEngine.js';

// ----------------------------------------------------------
// Test Helpers
// ----------------------------------------------------------

/**
 * Creates a mock OpenAI response with an update_contact tool call.
 */
function mockToolCallResponse(contactData: Record<string, string>) {
  return {
    choices: [
      {
        message: {
          content: null,
          tool_calls: [
            {
              id: 'call_123',
              type: 'function',
              function: {
                name: 'update_contact',
                arguments: JSON.stringify(contactData),
              },
            },
          ],
        },
      },
    ],
  };
}

/**
 * Creates a mock OpenAI response with no tool calls (no contact found).
 */
function mockNoToolCallResponse() {
  return {
    choices: [
      {
        message: {
          content: 'No contact information found.',
          tool_calls: undefined,
        },
      },
    ],
  };
}

// ----------------------------------------------------------
// Tests
// ----------------------------------------------------------

describe('extractContactData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Property 3: Contact data extraction idempotence', () => {
    /**
     * Validates: Requirements 4.2, 4.3, 5.3
     *
     * Calling contact extraction multiple times on the same history
     * produces identical results — no duplicates or corruption.
     */

    it('returns identical results when called multiple times with the same history', async () => {
      const contactData = {
        name: 'Antonio',
        lastName: 'Robles',
        email: 'antonio@robles.ai',
        phone: '+14085900153',
        company: 'Robles AI',
      };

      mockCreate.mockResolvedValue(mockToolCallResponse(contactData));

      const messages: EngineMessage[] = [
        { role: 'visitor', content: 'Hi, I\'m Antonio Robles from Robles AI.' },
        { role: 'assistant', content: 'Hello Antonio! How can I help you today?' },
        { role: 'visitor', content: 'My email is antonio@robles.ai and phone is +14085900153' },
        { role: 'assistant', content: 'Thank you for sharing your contact info!' },
      ];

      // Call extraction multiple times
      const result1 = await extractContactData(messages);
      const result2 = await extractContactData(messages);
      const result3 = await extractContactData(messages);

      // All results must be identical
      expect(result1).toEqual(result2);
      expect(result2).toEqual(result3);

      // Verify correctness of extracted data
      expect(result1).toEqual(contactData);
    });

    it('produces stable null results when no contact info present', async () => {
      mockCreate.mockResolvedValue(mockNoToolCallResponse());

      const messages: EngineMessage[] = [
        { role: 'visitor', content: 'Tell me about your AI services.' },
        { role: 'assistant', content: 'We offer ML, CV, and NLP solutions.' },
      ];

      const result1 = await extractContactData(messages);
      const result2 = await extractContactData(messages);
      const result3 = await extractContactData(messages);

      expect(result1).toBeNull();
      expect(result2).toBeNull();
      expect(result3).toBeNull();
    });

    it('produces stable results with partial contact info (name only)', async () => {
      const partialData = { name: 'Maria' };

      mockCreate.mockResolvedValue(mockToolCallResponse(partialData));

      const messages: EngineMessage[] = [
        { role: 'visitor', content: 'Hi, my name is Maria.' },
        { role: 'assistant', content: 'Hello Maria! What can I help you with?' },
      ];

      const result1 = await extractContactData(messages);
      const result2 = await extractContactData(messages);

      expect(result1).toEqual(result2);
      expect(result1).toEqual({ name: 'Maria' });
    });
  });

  describe('Contact data structure correctness', () => {
    it('extracts full contact data correctly from tool call', async () => {
      const contactData = {
        name: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '+15551234567',
        company: 'Acme Corp',
      };

      mockCreate.mockResolvedValue(mockToolCallResponse(contactData));

      const messages: EngineMessage[] = [
        { role: 'visitor', content: 'I\'m John Doe from Acme Corp. Email: john@example.com, phone: +15551234567' },
        { role: 'assistant', content: 'Great, thank you John!' },
      ];

      const result = await extractContactData(messages);

      expect(result).toEqual(contactData);
      expect(result).toHaveProperty('name', 'John');
      expect(result).toHaveProperty('lastName', 'Doe');
      expect(result).toHaveProperty('email', 'john@example.com');
      expect(result).toHaveProperty('phone', '+15551234567');
      expect(result).toHaveProperty('company', 'Acme Corp');
    });

    it('extracts partial contact data (name and email only)', async () => {
      const partialData = {
        name: 'Alice',
        email: 'alice@startup.io',
      };

      mockCreate.mockResolvedValue(mockToolCallResponse(partialData));

      const messages: EngineMessage[] = [
        { role: 'visitor', content: 'I\'m Alice, you can reach me at alice@startup.io' },
        { role: 'assistant', content: 'Thanks Alice!' },
      ];

      const result = await extractContactData(messages);

      expect(result).toEqual({ name: 'Alice', email: 'alice@startup.io' });
      // Should not contain fields that were not extracted
      expect(result).not.toHaveProperty('lastName');
      expect(result).not.toHaveProperty('phone');
      expect(result).not.toHaveProperty('company');
    });

    it('returns null when tool call returns empty fields', async () => {
      // All fields are empty strings or missing — hasData check returns falsy
      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: null,
              tool_calls: [
                {
                  id: 'call_456',
                  type: 'function',
                  function: {
                    name: 'update_contact',
                    arguments: JSON.stringify({}),
                  },
                },
              ],
            },
          },
        ],
      });

      const messages: EngineMessage[] = [
        { role: 'visitor', content: 'Just curious about your services.' },
        { role: 'assistant', content: 'Sure, we offer AI solutions!' },
      ];

      const result = await extractContactData(messages);
      expect(result).toBeNull();
    });

    it('returns null when no tool calls in response', async () => {
      mockCreate.mockResolvedValue(mockNoToolCallResponse());

      const messages: EngineMessage[] = [
        { role: 'visitor', content: 'What is deep learning?' },
        { role: 'assistant', content: 'Deep learning uses neural networks...' },
      ];

      const result = await extractContactData(messages);
      expect(result).toBeNull();
    });
  });

  describe('Error scenarios', () => {
    it('returns null when OpenAI API throws an error', async () => {
      mockCreate.mockRejectedValue(new Error('API connection failed'));

      const messages: EngineMessage[] = [
        { role: 'visitor', content: 'My name is Bob, email: bob@test.com' },
        { role: 'assistant', content: 'Thanks Bob!' },
      ];

      const result = await extractContactData(messages);
      expect(result).toBeNull();
    });

    it('returns null when API key is not configured', async () => {
      // Temporarily override db mock and env to simulate missing API key
      const { default: db } = await import('../db.js');
      const originalPrepare = db.prepare;
      (db as any).prepare = () => ({ get: () => undefined });

      const originalKey = process.env.OPENAI_API_KEY;
      delete process.env.OPENAI_API_KEY;

      const messages: EngineMessage[] = [
        { role: 'visitor', content: 'I\'m Carlos at carlos@test.com' },
        { role: 'assistant', content: 'Nice to meet you!' },
      ];

      const result = await extractContactData(messages);
      expect(result).toBeNull();

      // Restore db mock and env
      (db as any).prepare = originalPrepare;
      if (originalKey) process.env.OPENAI_API_KEY = originalKey;
    });

    it('returns null when tool call has malformed JSON arguments', async () => {
      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: null,
              tool_calls: [
                {
                  id: 'call_bad',
                  type: 'function',
                  function: {
                    name: 'update_contact',
                    arguments: '{invalid json here!!!',
                  },
                },
              ],
            },
          },
        ],
      });

      const messages: EngineMessage[] = [
        { role: 'visitor', content: 'My name is Test' },
        { role: 'assistant', content: 'Hello Test!' },
      ];

      // The function should handle malformed JSON gracefully
      const result = await extractContactData(messages);
      expect(result).toBeNull();
    });

    it('returns null on rate limit (429) error', async () => {
      const rateLimitError = new Error('Rate limit exceeded');
      (rateLimitError as any).status = 429;
      mockCreate.mockRejectedValue(rateLimitError);

      const messages: EngineMessage[] = [
        { role: 'visitor', content: 'I\'m Ana at ana@corp.com' },
        { role: 'assistant', content: 'Thank you Ana!' },
      ];

      const result = await extractContactData(messages);
      expect(result).toBeNull();
    });
  });

  describe('Message format correctness', () => {
    it('passes messages to OpenAI with correct role mapping', async () => {
      mockCreate.mockResolvedValue(mockNoToolCallResponse());

      const messages: EngineMessage[] = [
        { role: 'visitor', content: 'Hello' },
        { role: 'assistant', content: 'Hi there!' },
        { role: 'visitor', content: 'My name is Test User' },
      ];

      await extractContactData(messages);

      // Verify the mock was called with properly mapped messages
      expect(mockCreate).toHaveBeenCalledTimes(1);
      const callArgs = mockCreate.mock.calls[0][0];

      // First message should be the system prompt for extraction
      expect(callArgs.messages[0].role).toBe('system');

      // Visitor messages should be mapped to 'user'
      expect(callArgs.messages[1]).toEqual({ role: 'user', content: 'Hello' });
      expect(callArgs.messages[3]).toEqual({ role: 'user', content: 'My name is Test User' });

      // Assistant messages stay as 'assistant'
      expect(callArgs.messages[2]).toEqual({ role: 'assistant', content: 'Hi there!' });
    });

    it('includes update_contact tool in the API call', async () => {
      mockCreate.mockResolvedValue(mockNoToolCallResponse());

      const messages: EngineMessage[] = [
        { role: 'visitor', content: 'Hello' },
      ];

      await extractContactData(messages);

      const callArgs = mockCreate.mock.calls[0][0];
      expect(callArgs.tools).toBeDefined();
      expect(callArgs.tools).toHaveLength(1);
      expect(callArgs.tools[0].function.name).toBe('update_contact');
    });
  });
});
