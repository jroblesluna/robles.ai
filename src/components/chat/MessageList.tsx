import { useEffect, useRef } from 'react';
import type { ChatMessage } from '../../../shared/chatTypes.js';

// ============================================================
// MessageList — Renders chat message bubbles with auto-scroll
// ============================================================

interface MessageListProps {
  messages: ChatMessage[];
  isStreaming: boolean;
}

const WHATSAPP_NUMBER = '14085900153';

/** Renders message content, replacing markers with interactive buttons */
function MessageContent({ content }: { content: string }) {
  const hasWhatsApp = content.includes('[WHATSAPP_BUTTON]');
  const hasSocial = content.includes('[SOCIAL_LINKS]');
  const hasClose = content.includes('[CLOSE_CHAT]');

  if (!hasWhatsApp && !hasSocial && !hasClose) {
    return <p className="whitespace-pre-wrap break-words">{content}</p>;
  }

  // Remove markers and get clean text
  const cleanText = content
    .replace('[WHATSAPP_BUTTON]', '')
    .replace('[SOCIAL_LINKS]', '')
    .replace('[CLOSE_CHAT]', '')
    .trim();

  const waUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent('Hi! I was chatting on robles.ai and would like to continue the conversation.')}`;

  return (
    <div className="break-words">
      {cleanText && <p className="whitespace-pre-wrap mb-2">{cleanText}</p>}

      {hasWhatsApp && (
        <a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 mt-1 px-3 py-1.5 rounded-lg bg-green-500 hover:bg-green-600 text-white text-xs font-medium transition-colors shadow-sm no-underline"
          onClick={(e) => e.stopPropagation()}
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
            <path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.5.5 0 00.612.638l4.72-1.288A11.944 11.944 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.344 0-4.534-.68-6.392-1.85a.5.5 0 00-.395-.063l-3.206.874.718-2.86a.5.5 0 00-.061-.403A9.945 9.945 0 012 12C2 6.486 6.486 2 12 2s10 4.486 10 10-4.486 10-10 10z"/>
          </svg>
          WhatsApp
        </a>
      )}

      {hasSocial && (
        <div className="flex flex-wrap gap-2 mt-2">
          <a
            href="https://www.facebook.com/RoblesAITech"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1877F2] hover:bg-[#1565C0] text-white text-xs font-medium transition-colors shadow-sm no-underline"
            onClick={(e) => e.stopPropagation()}
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
            Facebook
          </a>
          <a
            href="https://www.instagram.com/robles.ai/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#F58529] via-[#DD2A7B] to-[#8134AF] hover:opacity-90 text-white text-xs font-medium transition-colors shadow-sm no-underline"
            onClick={(e) => e.stopPropagation()}
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
            </svg>
            Instagram
          </a>
          <a
            href="https://www.linkedin.com/in/antonio-robles-luna/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0A66C2] hover:bg-[#004182] text-white text-xs font-medium transition-colors shadow-sm no-underline"
            onClick={(e) => e.stopPropagation()}
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
            </svg>
            LinkedIn
          </a>
        </div>
      )}
    </div>
  );
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
            className={`flex items-end gap-1.5 ${isVisitor ? 'justify-end' : 'justify-start'}`}
          >
            {!isVisitor && (
              <div
                className="w-8 h-8 rounded-full flex-shrink-0"
                style={{
                  backgroundImage: 'url(/robly-avatar/robly-idle.svg)',
                  backgroundSize: '180% 180%',
                  backgroundPosition: 'center top',
                  backgroundRepeat: 'no-repeat',
                }}
                aria-hidden="true"
              />
            )}
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm leading-relaxed shadow-sm ${
                isVisitor
                  ? 'bg-blue-600 text-white rounded-br-sm'
                  : 'bg-gray-100 text-gray-800 rounded-bl-sm'
              }`}
            >
              <MessageContent content={msg.content} />
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
        <div className="flex items-end gap-1.5 justify-start">
          <div
            className="w-8 h-8 rounded-full flex-shrink-0"
            style={{
              backgroundImage: 'url(/robly-avatar/robly-thinking.svg)',
              backgroundSize: '180% 180%',
              backgroundPosition: 'center top',
              backgroundRepeat: 'no-repeat',
            }}
            aria-hidden="true"
          />
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
