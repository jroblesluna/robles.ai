import { useState, useCallback, useRef, type KeyboardEvent, type FormEvent } from 'react';
import { Send } from 'lucide-react';

// ============================================================
// MessageInput — Text input with send button for chat widget
// ============================================================

const MAX_MESSAGE_LENGTH = 2000;

interface MessageInputProps {
  onSend: (message: string) => void;
  isDisabled: boolean;
}

export default function MessageInput({ onSend, isDisabled }: MessageInputProps) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const trimmedValue = value.trim();
  const canSend = trimmedValue.length > 0 && !isDisabled;
  const isOverLimit = value.length > MAX_MESSAGE_LENGTH;

  const handleSubmit = useCallback(
    (e?: FormEvent) => {
      e?.preventDefault();
      if (!canSend || isOverLimit) return;

      onSend(trimmedValue);
      setValue('');

      // Reset textarea height after sending
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
      // Re-focus input
      setTimeout(() => textareaRef.current?.focus(), 0);
    },
    [canSend, isOverLimit, onSend, trimmedValue],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      // Submit on Enter (Shift+Enter inserts newline)
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit],
  );

  const handleInput = useCallback(() => {
    // Auto-resize textarea (up to ~5 lines)
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  }, []);

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-end gap-2 px-3 py-2 border-t border-gray-200 bg-white"
      aria-label="Message input"
    >
      <div className="flex-1 relative">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          placeholder="Type a message..."
          disabled={isDisabled}
          maxLength={MAX_MESSAGE_LENGTH}
          rows={1}
          className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Chat message"
          aria-describedby={isOverLimit ? 'char-limit-warning' : undefined}
        />
        {isOverLimit && (
          <span
            id="char-limit-warning"
            className="absolute -bottom-4 right-2 text-[10px] text-red-500"
            role="alert"
          >
            {value.length}/{MAX_MESSAGE_LENGTH}
          </span>
        )}
      </div>

      <button
        type="submit"
        disabled={!canSend || isOverLimit}
        className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-full bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
        aria-label="Send message"
      >
        <Send className="w-4 h-4" />
      </button>
    </form>
  );
}
