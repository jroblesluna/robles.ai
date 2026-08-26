import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useLocation } from 'wouter';
import { useTranslation } from 'react-i18next';
import { useChatSession } from '../../hooks/useChatSession.js';
import ChatPanel from './ChatPanel.js';

// ============================================================
// ChatbotWidget — Root floating widget component
// Renders the chat bubble + panel with a multi-phase timed
// entrance sequence. Hidden on admin routes and during print.
// ============================================================

// Entrance sequence timing (ms)
const BUBBLE_DELAY = 10_000; // Phase 1→2: bubble appears at 10s
const NOTIFICATION_DELAY = 20_000; // Phase 3→4: typing dots at 20s
const GREETING_DELAY = 22_000; // Phase 4→5: greeting text at 22s

type EntrancePhase = 'hidden' | 'bubble' | 'blinking' | 'typing' | 'greeting';
type RobotMood = 'idle' | 'listening' | 'thinking' | 'speaking';

/** Robly avatar — switches SVG based on mood */
function RobotAvatar({ mood }: { mood: RobotMood }) {
  return (
    <img
      src={`/robly-avatar/robly-${mood}.svg`}
      alt="Robly AI assistant"
      className="w-[120px] h-[120px]"
    />
  );
}

/** Three bouncing dots typing indicator */
function TypingDots() {
  return (
    <span className="inline-flex items-center gap-[3px]">
      <span className="typing-dot w-2 h-2 rounded-full bg-blue-500" style={{ animationDelay: '0ms' }} />
      <span className="typing-dot w-2 h-2 rounded-full bg-blue-500" style={{ animationDelay: '150ms' }} />
      <span className="typing-dot w-2 h-2 rounded-full bg-blue-500" style={{ animationDelay: '300ms' }} />
    </span>
  );
}

export default function ChatbotWidget() {
  const [location] = useLocation();
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [phase, setPhase] = useState<EntrancePhase>('hidden');
  const [notificationDismissed, setNotificationDismissed] = useState(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const {
    messages,
    contactData,
    status,
    conversationStatus,
    error,
    sendMessage,
    closeSession,
    startNewSession,
  } = useChatSession();

  // Determine if an existing session is present (messages restored from cookie)
  const hasExistingSession = messages.length > 0 || conversationStatus === 'open' || conversationStatus === 'closed';

  // --- Mood state tracking with timing delays ---
  const [isUserTyping, setIsUserTyping] = useState(false);
  const [speakingHoldover, setSpeakingHoldover] = useState(false);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const speakingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevStatusRef = useRef(status);

  // Track when user types — stays true for 3s after last keystroke
  const handleUserTyping = useCallback(() => {
    setIsUserTyping(true);
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => setIsUserTyping(false), 3000);
  }, []);

  // Track speaking holdover — stays true for 3s after streaming ends
  useEffect(() => {
    if (prevStatusRef.current === 'streaming' && status !== 'streaming') {
      setSpeakingHoldover(true);
      speakingTimerRef.current = setTimeout(() => setSpeakingHoldover(false), 3000);
    }
    prevStatusRef.current = status;
    return () => {
      if (speakingTimerRef.current) clearTimeout(speakingTimerRef.current);
    };
  }, [status]);

  // Cleanup typing timer on unmount
  useEffect(() => {
    return () => {
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    };
  }, []);

  // Compute mood with proper priority
  const currentMood: RobotMood = (() => {
    if (status === 'streaming' || speakingHoldover) return 'speaking';
    if (status === 'loading') return 'thinking';
    if (isOpen && isUserTyping) return 'listening';
    return 'idle';
  })();

  // Start the entrance sequence when there's no existing session
  useEffect(() => {
    // If user already has a session, skip the entrance sequence entirely
    if (hasExistingSession) {
      setPhase('bubble');
      return;
    }

    const t1 = setTimeout(() => setPhase('bubble'), BUBBLE_DELAY);
    const t2 = setTimeout(() => setPhase('typing'), NOTIFICATION_DELAY);
    const t3 = setTimeout(() => setPhase('greeting'), GREETING_DELAY);

    timersRef.current = [t1, t2, t3];

    return () => {
      timersRef.current.forEach(clearTimeout);
    };
  }, [hasExistingSession]);

  // Do not render on admin routes
  if (location.startsWith('/admin')) {
    return null;
  }

  const handleClose = useCallback(() => setIsOpen(false), []);

  const handleBubbleClick = useCallback(() => {
    if (isOpen) {
      setIsOpen(false);
    } else {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
      setIsOpen(true);
    }
  }, [isOpen]);

  const handleNotificationClick = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    setIsOpen(true);
  }, []);

  const handleDismissNotification = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setNotificationDismissed(true);
  }, []);

  // Compute the greeting text for the notification
  const greetingText = t('chatbotWidget.greeting');

  // Build messages array with injected greeting if needed
  const effectiveMessages = (() => {
    // If the greeting phase completed and user hasn't chatted yet, inject greeting as first assistant message
    if (phase === 'greeting' && messages.length === 0) {
      return [
        {
          id: -1, // synthetic ID
          role: 'assistant' as const,
          content: greetingText,
          timestamp: new Date().toISOString(),
        },
      ];
    }
    // If panel was opened after greeting with no existing messages, include the greeting
    if (isOpen && messages.length === 0 && !hasExistingSession) {
      return [
        {
          id: -1,
          role: 'assistant' as const,
          content: greetingText,
          timestamp: new Date().toISOString(),
        },
      ];
    }
    return messages;
  })();

  // Show notification balloon (typing or greeting)
  const showNotification = !notificationDismissed && !isOpen && (phase === 'typing' || phase === 'greeting');

  return (
    <>
      {/* CSS for typing dots animation */}
      <style>{`
        @keyframes bounce-dot {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-4px); }
        }
        .typing-dot {
          animation: bounce-dot 1.2s infinite;
        }
      `}</style>

      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3 print:hidden">
        {/* Chat panel */}
        <AnimatePresence>
          {isOpen && (
            <ChatPanel
              messages={effectiveMessages}
              contactData={contactData}
              status={status}
              conversationStatus={conversationStatus}
              error={error}
              onSendMessage={sendMessage}
              onClose={handleClose}
              onCloseSession={closeSession}
              onStartNewSession={startNewSession}
              onUserTyping={handleUserTyping}
              pagePath={location}
            />
          )}
        </AnimatePresence>

        {/* Notification balloon (typing dots → greeting message) */}
        <AnimatePresence>
          {showNotification && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              onClick={handleNotificationClick}
              className="relative bg-white rounded-xl shadow-lg px-4 py-3 max-w-[250px] cursor-pointer"
              role="status"
              aria-live="polite"
            >
              {/* Dismiss X button */}
              <button
                onClick={handleDismissNotification}
                className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition-colors"
                aria-label="Dismiss notification"
              >
                <X className="w-3 h-3 text-gray-600" />
              </button>

              {/* Content: typing dots or greeting text */}
              {phase === 'typing' ? (
                <TypingDots />
              ) : (
                <p className="text-sm text-gray-800 leading-snug">
                  {greetingText}
                </p>
              )}

              {/* Arrow/triangle pointing down to bubble */}
              <div className="absolute -bottom-2 right-5 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-white" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating bubble button — ALWAYS visible (toggles panel open/close) */}
        <AnimatePresence>
          {phase !== 'hidden' && (
            <motion.button
              onClick={handleBubbleClick}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              className="flex items-center justify-center hover:scale-105 transition-transform cursor-pointer"
              aria-label={isOpen ? 'Close chat' : 'Open chat'}
            >
              <RobotAvatar mood={currentMood} />
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
