import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useChatSession } from '../useChatSession.js';

// Helper to create a mock fetch response
function mockResponse(status: number, body?: unknown, options?: { stream?: boolean }) {
  if (options?.stream) {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        if (Array.isArray(body)) {
          for (const line of body) {
            controller.enqueue(encoder.encode(line));
          }
        }
        controller.close();
      },
    });
    return {
      ok: status >= 200 && status < 300,
      status,
      headers: new Headers({ 'Content-Type': 'text/event-stream' }),
      body: stream,
      json: () => Promise.resolve(body),
    } as unknown as Response;
  }
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as unknown as Response;
}

describe('useChatSession', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    global.fetch = fetchMock;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('initializes with default state and attempts to restore session', async () => {
    // No active session
    fetchMock.mockResolvedValueOnce(mockResponse(401, { error: 'No session found' }));

    const { result } = renderHook(() => useChatSession());

    await waitFor(() => {
      expect(result.current.conversationStatus).toBe('none');
    });

    expect(result.current.messages).toEqual([]);
    expect(result.current.contactData).toBeNull();
    expect(result.current.status).toBe('idle');
    expect(result.current.error).toBeNull();
  });

  it('restores existing session with messages on mount', async () => {
    const historyResponse = {
      messages: [
        { id: 1, role: 'visitor', content: 'Hello', timestamp: '2025-01-01T00:00:00Z' },
        { id: 2, role: 'assistant', content: 'Hi there!', timestamp: '2025-01-01T00:00:01Z' },
      ],
      contactData: { name: 'Antonio', lastName: null, email: 'test@test.com', phone: null, company: null },
      status: 'open',
    };

    fetchMock.mockResolvedValueOnce(mockResponse(200, historyResponse));

    const { result } = renderHook(() => useChatSession());

    await waitFor(() => {
      expect(result.current.messages).toHaveLength(2);
    });

    expect(result.current.conversationStatus).toBe('open');
    expect(result.current.contactData?.name).toBe('Antonio');
    expect(result.current.contactData?.email).toBe('test@test.com');
  });

  it('handles closed session (410) on restore', async () => {
    fetchMock.mockResolvedValueOnce(mockResponse(410, { error: 'Conversation is closed' }));

    const { result } = renderHook(() => useChatSession());

    await waitFor(() => {
      expect(result.current.conversationStatus).toBe('closed');
    });
  });

  it('creates a new session before sending the first message', async () => {
    // Restore returns 401 (no session)
    fetchMock.mockResolvedValueOnce(mockResponse(401, { error: 'No session found' }));

    const { result } = renderHook(() => useChatSession());

    await waitFor(() => {
      expect(result.current.conversationStatus).toBe('none');
    });

    // Mock session creation and message SSE
    fetchMock
      .mockResolvedValueOnce(mockResponse(201, { sessionId: 'abc-123', conversationId: 1 }))
      .mockResolvedValueOnce(
        mockResponse(200, [
          'data: {"type":"token","content":"Hello"}\n\n',
          'data: {"type":"token","content":" there!"}\n\n',
          'data: {"type":"done","messageId":2}\n\n',
        ], { stream: true }),
      );

    await act(async () => {
      await result.current.sendMessage('Hi', '/');
    });

    // Should have created session (2nd fetch call) then sent message (3rd fetch call)
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[1][0]).toBe('/api/chat/session');
    expect(fetchMock.mock.calls[2][0]).toBe('/api/chat/message');
  });

  it('streams tokens and finalizes assistant message', async () => {
    // Restore returns 401 (no session)
    fetchMock.mockResolvedValueOnce(mockResponse(401, { error: 'No session found' }));

    const { result } = renderHook(() => useChatSession());

    await waitFor(() => {
      expect(result.current.conversationStatus).toBe('none');
    });

    // Session creation + SSE stream
    fetchMock
      .mockResolvedValueOnce(mockResponse(201, { sessionId: 'abc-123', conversationId: 1 }))
      .mockResolvedValueOnce(
        mockResponse(200, [
          'data: {"type":"token","content":"Hello"}\n\n',
          'data: {"type":"token","content":" world!"}\n\n',
          'data: {"type":"done","messageId":5}\n\n',
        ], { stream: true }),
      );

    await act(async () => {
      await result.current.sendMessage('Hi', '/');
    });

    // Should have visitor message + assistant message
    expect(result.current.messages).toHaveLength(2);
    expect(result.current.messages[0].role).toBe('visitor');
    expect(result.current.messages[0].content).toBe('Hi');
    expect(result.current.messages[1].role).toBe('assistant');
    expect(result.current.messages[1].content).toBe('Hello world!');
    expect(result.current.messages[1].id).toBe(5);
    expect(result.current.status).toBe('idle');
  });

  it('handles contact_update SSE event', async () => {
    fetchMock.mockResolvedValueOnce(mockResponse(401, { error: 'No session found' }));

    const { result } = renderHook(() => useChatSession());

    await waitFor(() => {
      expect(result.current.conversationStatus).toBe('none');
    });

    fetchMock
      .mockResolvedValueOnce(mockResponse(201, { sessionId: 'abc', conversationId: 1 }))
      .mockResolvedValueOnce(
        mockResponse(200, [
          'data: {"type":"token","content":"Nice to meet you!"}\n\n',
          'data: {"type":"done","messageId":3}\n\n',
          'data: {"type":"contact_update","data":{"name":"Antonio","email":"a@b.com"}}\n\n',
        ], { stream: true }),
      );

    await act(async () => {
      await result.current.sendMessage('My name is Antonio, email is a@b.com', '/');
    });

    expect(result.current.contactData?.name).toBe('Antonio');
    expect(result.current.contactData?.email).toBe('a@b.com');
  });

  it('handles close SSE event', async () => {
    fetchMock.mockResolvedValueOnce(mockResponse(401, { error: 'No session found' }));

    const { result } = renderHook(() => useChatSession());

    await waitFor(() => {
      expect(result.current.conversationStatus).toBe('none');
    });

    fetchMock
      .mockResolvedValueOnce(mockResponse(201, { sessionId: 'abc', conversationId: 1 }))
      .mockResolvedValueOnce(
        mockResponse(200, [
          'data: {"type":"token","content":"Goodbye!"}\n\n',
          'data: {"type":"done","messageId":4}\n\n',
          'data: {"type":"close"}\n\n',
        ], { stream: true }),
      );

    await act(async () => {
      await result.current.sendMessage('Bye!', '/');
    });

    expect(result.current.conversationStatus).toBe('closed');
  });

  it('handles error SSE event', async () => {
    fetchMock.mockResolvedValueOnce(mockResponse(401, { error: 'No session found' }));

    const { result } = renderHook(() => useChatSession());

    await waitFor(() => {
      expect(result.current.conversationStatus).toBe('none');
    });

    fetchMock
      .mockResolvedValueOnce(mockResponse(201, { sessionId: 'abc', conversationId: 1 }))
      .mockResolvedValueOnce(
        mockResponse(200, [
          'data: {"type":"error","message":"Something went wrong."}\n\n',
        ], { stream: true }),
      );

    await act(async () => {
      await result.current.sendMessage('Hello', '/');
    });

    expect(result.current.status).toBe('error');
    expect(result.current.error).toBe('Something went wrong.');
  });

  it('closeSession calls the close endpoint', async () => {
    // Restore with open session
    fetchMock.mockResolvedValueOnce(
      mockResponse(200, { messages: [], contactData: null, status: 'open' }),
    );

    const { result } = renderHook(() => useChatSession());

    await waitFor(() => {
      expect(result.current.conversationStatus).toBe('open');
    });

    fetchMock.mockResolvedValueOnce(mockResponse(200, { success: true }));

    await act(async () => {
      await result.current.closeSession();
    });

    expect(result.current.conversationStatus).toBe('closed');
    expect(fetchMock.mock.calls[1][0]).toBe('/api/chat/close');
  });

  it('startNewSession resets all state', async () => {
    // Restore with open session and messages
    fetchMock.mockResolvedValueOnce(
      mockResponse(200, {
        messages: [{ id: 1, role: 'visitor', content: 'Hi', timestamp: '2025-01-01T00:00:00Z' }],
        contactData: { name: 'Test', lastName: null, email: null, phone: null, company: null },
        status: 'open',
      }),
    );

    const { result } = renderHook(() => useChatSession());

    await waitFor(() => {
      expect(result.current.messages).toHaveLength(1);
    });

    act(() => {
      result.current.startNewSession();
    });

    expect(result.current.messages).toEqual([]);
    expect(result.current.contactData).toBeNull();
    expect(result.current.status).toBe('idle');
    expect(result.current.conversationStatus).toBe('none');
    expect(result.current.error).toBeNull();
  });

  it('does not send empty messages', async () => {
    fetchMock.mockResolvedValueOnce(mockResponse(401, { error: 'No session found' }));

    const { result } = renderHook(() => useChatSession());

    await waitFor(() => {
      expect(result.current.conversationStatus).toBe('none');
    });

    await act(async () => {
      await result.current.sendMessage('   ', '/');
    });

    // Should not have called session creation or message endpoint
    expect(fetchMock).toHaveBeenCalledTimes(1); // Only the restore call
  });

  it('handles session creation failure', async () => {
    fetchMock.mockResolvedValueOnce(mockResponse(401, { error: 'No session found' }));

    const { result } = renderHook(() => useChatSession());

    await waitFor(() => {
      expect(result.current.conversationStatus).toBe('none');
    });

    // Session creation fails
    fetchMock.mockResolvedValueOnce(mockResponse(500, { error: 'Server error' }));

    await act(async () => {
      await result.current.sendMessage('Hello', '/');
    });

    expect(result.current.status).toBe('error');
    expect(result.current.error).toBe('Failed to start a new session. Please try again.');
  });
});
