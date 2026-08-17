import { useEffect, useRef } from 'react';
import type { ChatMessage } from '../../../shared/chatTypes.js';

// ============================================================
// MessageList — Renders chat message bubbles with auto-scroll
// ============================================================

interface MessageListProps {
  messages: ChatMessage[];
  isStreaming: boolean;
}

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function MessageList({ messages, isStreaming }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the latest message whenever messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Show typing indicator when streaming and the last assistant message has empty content
  const showTypingIndicator =
    isStreaming &&
    messages.length > 0 &&
    messages[messages.length - 1].role === 'assistant' &&
    messages[messages.length - 1].content === '';

  if (messages.length === 0) {
    return (
      <div
        className="flex-1 flex items-center justify-center p-4 text-gray-400 text-sm"
        role="log"
        aria-label="Chat messages"
      >
        Send a message to start the conversation.
      </div>
    );
  }

  return (
    <div
      className="flex-1 overflow-y-auto px-4 py-3 space-y-3"
      role="log"
      aria-label="Chat messages"
      aria-live="polite"
    >
      {messages.map((msg) => {
        const isVisitor = msg.role === 'visitor';

        // Don't render the empty placeholder — show typing indicator instead
        if (msg.role === 'assistant' && msg.content === '' && isStreaming) {
          return null;
        }

        return (
          <div
            key={msg.id}
            className={`flex ${isVisitor ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm leading-relaxed shadow-sm ${
                isVisitor
                  ? 'bg-blue-600 text-white rounded-br-sm'
                  : 'bg-gray-100 text-gray-800 rounded-bl-sm'
              }`}
            >
              <p className="whitespace-pre-wrap break-words">{msg.content}</p>
              <span
                className={`block text-[10px] mt-1 text-right ${
                  isVisitor ? 'text-blue-200' : 'text-gray-400'
                }`}
                aria-label={`Sent at ${formatTimestamp(msg.timestamp)}`}
              >
                {formatTimestamp(msg.timestamp)}
              </span>
            </div>
          </div>
        );
      })}

      {/* Typing indicator */}
      {showTypingIndicator && (
        <div className="flex justify-start">
          <div
            className="bg-gray-100 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm"
            role="status"
            aria-label="Assistant is typing"
          >
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
            </div>
          </div>
        </div>
      )}

      {/* Scroll anchor */}
      <div ref={bottomRef} aria-hidden="true" />
    </div>
  );
}
