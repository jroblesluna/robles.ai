import { useState, useCallback, useRef, useEffect, type KeyboardEvent, type FormEvent } from 'react';
import { Send, Mic, Square, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSpeechInput } from '@/hooks/useSpeechInput';

function appendTranscript(current: string, addition: string): string {
  const add = addition.trim();
  if (!add) return current;
  if (!current.trim()) return add;
  return /\s$/.test(current) ? current + add : `${current} ${add}`;
}

// ============================================================
// MessageInput — Text input with send button for chat widget
// ============================================================

const MAX_MESSAGE_LENGTH = 2000;
const MAX_VISIBLE_LINES = 2;

interface MessageInputProps {
  onSend: (message: string) => void;
  onEscape?: () => void;
  isDisabled: boolean;
  onTyping?: () => void;
}

export default function MessageInput({ onSend, isDisabled, onTyping, onEscape }: MessageInputProps) {
  const { t, i18n } = useTranslation();
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const prevDisabledRef = useRef(isDisabled);

  const speech = useSpeechInput({
    lang: i18n.language?.startsWith('es') ? 'es-ES' : 'en-US',
    onResult: (text) => {
      setValue((prev) => appendTranscript(prev, text).slice(0, MAX_MESSAGE_LENGTH));
      onTyping?.();
    },
  });

  // Runs on every value change (typed or dictated). scrollHeight excludes the
  // border, so it's added back; otherwise a one-line box overflows by 2px and
  // shows a scrollbar.
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    const style = getComputedStyle(textarea);
    const border = textarea.offsetHeight - textarea.clientHeight;
    const padding = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
    const max = parseFloat(style.lineHeight) * MAX_VISIBLE_LINES + padding + border;
    const full = textarea.scrollHeight + border;
    textarea.style.height = `${Math.min(full, max)}px`;
    textarea.style.overflowY = full > max ? 'auto' : 'hidden';
    // Keep the newest dictated words in view.
    if (speech.listening) textarea.scrollTop = textarea.scrollHeight;
  }, [value]);

  // Auto-focus on mount (when panel opens)
  useEffect(() => {
    setTimeout(() => textareaRef.current?.focus(), 100);
  }, []);

  // Re-focus when streaming ends (isDisabled goes true → false)
  useEffect(() => {
    if (prevDisabledRef.current && !isDisabled) {
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
    prevDisabledRef.current = isDisabled;
  }, [isDisabled]);

  const trimmedValue = value.trim();
  const canSend = trimmedValue.length > 0 && !isDisabled;
  const isOverLimit = value.length > MAX_MESSAGE_LENGTH;

  const handleSubmit = useCallback(
    (e?: FormEvent) => {
      e?.preventDefault();
      if (!canSend || isOverLimit) return;

      speech.stop();
      onSend(trimmedValue);
      setValue('');
      // Re-focus input
      setTimeout(() => textareaRef.current?.focus(), 0);
    },
    [canSend, isOverLimit, onSend, trimmedValue, speech.stop],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      // Submit on Enter (Shift+Enter inserts newline)
      if (e.key === 'Escape') { e.preventDefault(); onEscape?.(); return; }
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit],
  );

  return (
    <form
      onSubmit={handleSubmit}
      className="px-3 py-2 border-t border-gray-200 bg-white"
      aria-label="Message input"
    >
      <div className="flex items-end gap-2">
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              onTyping?.();
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            disabled={isDisabled}
            maxLength={MAX_MESSAGE_LENGTH}
            rows={1}
            className="block w-full resize-none overflow-hidden rounded-xl border border-gray-200 bg-gray-50 px-3 py-[7px] text-sm leading-5 text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
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

        {speech.supported && (
          <button
            type="button"
            onClick={speech.toggle}
            disabled={isDisabled || speech.busy}
            title={t(speech.listening ? 'chatInput.mic_stop' : 'chatInput.mic_start')}
            aria-label={t(speech.listening ? 'chatInput.mic_stop' : 'chatInput.mic_start')}
            aria-pressed={speech.listening}
            aria-busy={speech.busy}
            className={`flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:cursor-not-allowed ${
              speech.listening || speech.busy
                ? 'bg-red-50 text-red-600 hover:bg-red-100'
                : 'text-gray-400 hover:bg-gray-100 hover:text-gray-700'
            } ${isDisabled ? 'opacity-40' : ''}`}
          >
            {speech.busy ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : speech.listening ? (
              <Square className="w-3.5 h-3.5 fill-current" />
            ) : (
              <Mic className="w-4 h-4" />
            )}
          </button>
        )}

        <button
          type="submit"
          disabled={!canSend || isOverLimit}
          className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-full bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
          aria-label="Send message"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>

      {speech.listening || speech.busy ? (
        <p className="mt-1.5 flex items-center gap-1.5 px-1 text-[11px] text-red-600" aria-live="polite">
          <span className={`h-1.5 w-1.5 shrink-0 rounded-full bg-red-500 ${speech.busy ? 'opacity-50' : 'animate-pulse'}`} />
          <span className="truncate">
            {speech.state === 'starting'
              ? t('chatInput.mic_starting')
              : speech.state === 'stopping'
                ? t('chatInput.mic_stopping')
                : speech.interim || t('chatInput.mic_listening')}
          </span>
        </p>
      ) : speech.state === 'denied' || speech.state === 'error' ? (
        <p className="mt-1.5 px-1 text-[11px] text-red-600" role="alert">
          {t(speech.state === 'denied' ? 'chatInput.mic_denied' : 'chatInput.mic_error')}
        </p>
      ) : null}
    </form>
  );
}
