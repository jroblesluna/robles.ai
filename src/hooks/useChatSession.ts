import { useState, useEffect, useCallback, useRef } from 'react';
import type { ChatMessage, ContactData } from '../../shared/chatTypes.js';

// ============================================================
// useChatSession — Custom hook for managing the chatbot session
// Handles session lifecycle, message state, and SSE streaming.
// ============================================================

export type ConnectionStatus = 'idle' | 'loading' | 'streaming' | 'error';
export type ConversationStatus = 'none' | 'open' | 'closed';

export interface UseChatSessionResult {
  messages: ChatMessage[];
  contactData: ContactData | null;
  status: ConnectionStatus;
  conversationStatus: ConversationStatus;
  error: string | null;
  sendMessage: (message: string, pagePath: string) => Promise<void>;
  closeSession: () => Promise<void>;
  startNewSession: () => void;
}

export function useChatSession(): UseChatSessionResult {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [contactData, setContactData] = useState<ContactData | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>('idle');
  const [conversationStatus, setConversationStatus] = useState<ConversationStatus>('none');
  const [error, setError] = useState<string | null>(null);

  // Track whether we have an active session (server sets httpOnly cookie, so we track state locally)
  const hasSessionRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  // On mount, attempt to restore an existing session by fetching history
  useEffect(() => {
    restoreSession();
    return () => {
      if (abortRef.current) {
        abortRef.current.abort();
      }
    };
  }, []);

  async function restoreSession(): Promise<void> {
    try {
      const res = await fetch('/api/chat/history', { credentials: 'include' });

      if (res.ok) {
        const data = await res.json();
        hasSessionRef.current = true;
        setMessages(data.messages || []);
        setContactData(data.contactData || null);
        setConversationStatus(data.status === 'closed' ? 'closed' : 'open');
      } else if (res.status === 401 || res.status === 404) {
        // No active session — visitor hasn't chatted yet
        hasSessionRef.current = false;
        setConversationStatus('none');
      } else if (res.status === 410) {
        // Session closed/expired — start fresh
        hasSessionRef.current = false;
        setConversationStatus('closed');
      }
    } catch {
      // Network error during restore — silently start fresh
      hasSessionRef.current = false;
      setConversationStatus('none');
    }
  }

  async function createSession(): Promise<boolean> {
    try {
      const res = await fetch('/api/chat/session', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });

      if (res.ok) {
        hasSessionRef.current = true;
        setConversationStatus('open');
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  const sendMessage = useCallback(async (message: string, pagePath: string): Promise<void> => {
    if (!message.trim()) return;

    setError(null);

    // If no session exists, create one first
    if (!hasSessionRef.current) {
      setStatus('loading');
      const created = await createSession();
      if (!created) {
        setStatus('error');
        setError('Failed to start a new session. Please try again.');
        return;
      }
    }

    // Optimistically add the visitor message to the UI
    const visitorMessage: ChatMessage = {
      id: Date.now(), // temporary ID until server confirms
      role: 'visitor',
      content: message,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, visitorMessage]);
    setStatus('streaming');

    // Abort any previous streaming request
    if (abortRef.current) {
      abortRef.current.abort();
    }
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch('/api/chat/message', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, pagePath }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        const errorMsg = errorData?.error || 'Failed to send message.';

        // If session is invalid, reset and let user retry
        if (res.status === 401 || res.status === 404 || res.status === 410) {
          hasSessionRef.current = false;
          setConversationStatus(res.status === 410 ? 'closed' : 'none');
        }

        setStatus('error');
        setError(errorMsg);
        return;
      }

      // Parse SSE stream from the response body
      await consumeSSEStream(res, controller.signal);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setStatus('error');
      setError('Something went wrong. Please try again.');
    }
  }, []);

  async function consumeSSEStream(res: Response, signal: AbortSignal): Promise<void> {
    const reader = res.body?.getReader();
    if (!reader) {
      setStatus('error');
      setError('Unable to read response stream.');
      return;
    }

    const decoder = new TextDecoder();
    let buffer = '';
    let streamedContent = '';

    // Add a placeholder assistant message for streaming tokens
    const streamingId = Date.now() + 1;
    const streamingMessage: ChatMessage = {
      id: streamingId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, streamingMessage]);

    try {
      while (true) {
        if (signal.aborted) break;

        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process complete SSE lines
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6); // Remove 'data: ' prefix
          if (!jsonStr.trim()) continue;

          try {
            const event = JSON.parse(jsonStr);
            handleSSEEvent(event, streamingId, streamedContent, (content) => {
              streamedContent = content;
            });
          } catch {
            // Skip malformed JSON lines
          }
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setStatus('error');
      setError('Connection lost. Please try again.');
    } finally {
      reader.releaseLock();
    }
  }

  function handleSSEEvent(
    event: { type: string; content?: string; messageId?: number | null; data?: Partial<ContactData>; message?: string },
    streamingId: number,
    currentContent: string,
    setContent: (content: string) => void,
  ): void {
    switch (event.type) {
      case 'token': {
        const newContent = currentContent + (event.content || '');
        setContent(newContent);
        // Update the streaming message in place
        setMessages((prev) =>
          prev.map((m) => (m.id === streamingId ? { ...m, content: newContent } : m)),
        );
        break;
      }

      case 'done': {
        // Finalize the streaming message with the server-assigned ID
        if (event.messageId != null) {
          setMessages((prev) =>
            prev.map((m) => (m.id === streamingId ? { ...m, id: event.messageId! } : m)),
          );
        }
        setStatus('idle');
        break;
      }

      case 'contact_update': {
        if (event.data) {
          setContactData((prev) => ({
            name: event.data?.name ?? prev?.name ?? null,
            lastName: event.data?.lastName ?? prev?.lastName ?? null,
            email: event.data?.email ?? prev?.email ?? null,
            phone: event.data?.phone ?? prev?.phone ?? null,
            company: event.data?.company ?? prev?.company ?? null,
          }));
        }
        break;
      }

      case 'close': {
        setConversationStatus('closed');
        setStatus('idle');
        break;
      }

      case 'error': {
        setStatus('error');
        setError(event.message || 'An error occurred.');
        break;
      }
    }
  }

  const closeSession = useCallback(async (): Promise<void> => {
    if (!hasSessionRef.current) return;

    try {
      const res = await fetch('/api/chat/close', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });

      if (res.ok) {
        setConversationStatus('closed');
        hasSessionRef.current = false;
      }
    } catch {
      // Best effort — don't surface errors for close
    }
  }, []);

  const startNewSession = useCallback((): void => {
    // Reset all state for a fresh session
    hasSessionRef.current = false;
    setMessages([]);
    setContactData(null);
    setStatus('idle');
    setConversationStatus('none');
    setError(null);
  }, []);

  return {
    messages,
    contactData,
    status,
    conversationStatus,
    error,
    sendMessage,
    closeSession,
    startNewSession,
  };
}
