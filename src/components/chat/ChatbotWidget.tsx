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

// Entrance sequence timing (ms) — bubble is visible immediately on mount
const NOTIFICATION_DELAY = 3_000; // Phase 3→4: typing dots at 3s
const GREETING_DELAY = 5_000; // Phase 4→5: greeting text at 5s

// Persists whether the panel is open across reloads and tabs
const CHAT_OPEN_STORAGE_KEY = 'robly-chat-open';

type EntrancePhase = 'hidden' | 'bubble' | 'blinking' | 'typing' | 'greeting';
export type RobotMood = 'idle' | 'listening' | 'thinking' | 'speaking';

/** Robly avatar — switches SVG based on mood */
function RobotAvatar({ mood }: { mood: RobotMood }) {
  return (
    <img
      src={`/robly-avatar/robly-${mood}.svg`}
      alt="Robly AI assistant"
      className="w-20 h-20 sm:w-24 sm:h-24 md:w-[120px] md:h-[120px]"
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

export default function ChatbotWidget({ hideForMobileMenu = false }: { hideForMobileMenu?: boolean }) {
  const [location] = useLocation();
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(() => {
    try {
      return localStorage.getItem(CHAT_OPEN_STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  });

  // Persist open/closed state, and keep it in sync across tabs
  useEffect(() => {
    try {
      localStorage.setItem(CHAT_OPEN_STORAGE_KEY, isOpen ? '1' : '0');
    } catch {
      // localStorage unavailable (private mode, disabled) — state just won't persist
    }
  }, [isOpen]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === CHAT_OPEN_STORAGE_KEY) {
        setIsOpen(e.newValue === '1');
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);
  // Bubble is visible immediately on every page load/reload; only the
  // proactive notification balloon (typing/greeting) is delayed below.
  const [phase, setPhase] = useState<EntrancePhase>('bubble');
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

  // Track hover over any card/button on the page — bot "listens" while the chat is closed.
  // Debounced so quickly passing the cursor over several elements doesn't flicker the mood.
  const [isHoveringInteractive, setIsHoveringInteractive] = useState(false);
  useEffect(() => {
    let hoverTimer: ReturnType<typeof setTimeout> | null = null;
    const isInteractive = (target: EventTarget | null) =>
      target instanceof HTMLElement &&
      target.closest(
        'button, a, [role="button"], [class*="card" i], [class*="hover:shadow" i], [class*="hover:-translate" i], [class*="hover:scale" i]',
      );
    const handleMouseOver = (e: MouseEvent) => {
      if (!isInteractive(e.target)) return;
      if (hoverTimer) clearTimeout(hoverTimer);
      hoverTimer = setTimeout(() => setIsHoveringInteractive(true), 350);
    };
    const handleMouseOut = (e: MouseEvent) => {
      if (!isInteractive(e.target)) return;
      if (hoverTimer) clearTimeout(hoverTimer);
      hoverTimer = setTimeout(() => setIsHoveringInteractive(false), 350);
    };
    document.addEventListener('mouseover', handleMouseOver);
    document.addEventListener('mouseout', handleMouseOut);
    return () => {
      document.removeEventListener('mouseover', handleMouseOver);
      document.removeEventListener('mouseout', handleMouseOut);
      if (hoverTimer) clearTimeout(hoverTimer);
    };
  }, []);

  // Compute mood with proper priority
  const currentMood: RobotMood = (() => {
    if (status === 'streaming' || speakingHoldover) return 'speaking';
    if (status === 'loading') return 'thinking';
    if (isOpen && isUserTyping) return 'listening';
    if (!isOpen && isHoveringInteractive) return 'listening';
    return 'idle';
  })();

  // Queue the proactive notification balloon (typing → greeting) when there's
  // no existing session. The bubble itself is already visible from mount.
  useEffect(() => {
    if (hasExistingSession) return;

    const t2 = setTimeout(() => setPhase('typing'), NOTIFICATION_DELAY);
    const t3 = setTimeout(() => setPhase('greeting'), GREETING_DELAY);

    timersRef.current = [t2, t3];

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

      <div className={`fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 flex-col items-end gap-3 print:hidden ${hideForMobileMenu ? "hidden md:flex" : "flex"}`}>
        {/* Chat panel — mascot lives in its header, animated, in-flow with the conversation */}
        <AnimatePresence>
          {isOpen && (
            <ChatPanel
              mood={currentMood}
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
        {/* popLayout: pull the balloon out of flow the instant it starts exiting,
            so its exit animation doesn't inflate the flex container's height while
            the (much taller) chat panel is mounting — that combo caused the panel
            to visibly jump up and then drop as the balloon collapsed away. */}
        <AnimatePresence mode="popLayout">
          {showNotification && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{
                opacity: 1,
                scale: 1,
                // Soft bounce that decays over time, then rests before the next loop
                y: [10, -12, 0, -8, 0, -5, 0, -3, 0, -1, 0, 0],
              }}
              exit={{ opacity: 0, y: 10, scale: 0.9, transition: { duration: 0.2 } }}
              transition={{
                opacity: { duration: 0.3 },
                scale: { type: 'spring', stiffness: 300, damping: 25 },
                y: {
                  duration: 2.4,
                  times: [0, 0.12, 0.22, 0.34, 0.46, 0.58, 0.7, 0.8, 0.88, 0.94, 0.98, 1],
                  ease: 'easeOut',
                  repeat: Infinity,
                  repeatDelay: 5,
                },
              }}
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

        {/* Floating bubble button — visible only while the panel is closed;
            once open, the peeking mascot above takes over its spot. */}
        <AnimatePresence>
          {!isOpen && phase !== 'hidden' && (
            <motion.button
              onClick={handleBubbleClick}
              initial={{ scale: 0 }}
              animate={{ scale: 1, transition: { duration: 0.1, ease: 'easeOut' } }}
              exit={{ opacity: 0, transition: { duration: 0 } }}
              className="flex items-center justify-center hover:scale-105 transition-transform cursor-pointer"
              aria-label="Open chat"
            >
              <RobotAvatar mood={currentMood} />
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
