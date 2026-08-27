import { useCallback, useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { X, MessageSquare, RotateCcw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'wouter';
import type { ChatMessage, ContactData } from '../../../shared/chatTypes.js';
import type { ConnectionStatus, ConversationStatus } from '../../hooks/useChatSession.js';
import type { RobotMood } from './ChatbotWidget.js';
import MessageList from './MessageList.js';
import MessageInput from './MessageInput.js';

// ============================================================
// ChatPanel — Full conversation view for the AI chatbot widget
// Renders header, message list, input, WhatsApp button, and
// handles closed conversation state with a countdown transition.
// ============================================================

const WHATSAPP_NUMBER = '14085900153';

interface ChatPanelProps {
  mood: RobotMood;
  messages: ChatMessage[];
  contactData: ContactData | null;
  status: ConnectionStatus;
  conversationStatus: ConversationStatus;
  error: string | null;
  onSendMessage: (message: string, pagePath: string) => Promise<void>;
  onClose: () => void;
  onCloseSession: () => Promise<void>;
  onStartNewSession: () => void;
  onUserTyping?: () => void;
  pagePath: string;
}

/**
 * Returns a context-aware WhatsApp pre-filled message based on the current route.
 */
function useWhatsAppMessage(): string {
  const { t } = useTranslation();
  const [location] = useLocation();

  let contextKey = 'default';
  if (location === '/get-started') contextKey = 'landing';
  else if (location === '/') contextKey = 'home';
  else if (location.startsWith('/blog')) contextKey = 'blog';
  else if (location === '/careers' || location === '/apply') contextKey = 'careers';
  else if (location.startsWith('/try-')) contextKey = 'demos';

  return t(`whatsappWidget.${contextKey}.message`);
}

export default function ChatPanel({
  mood,
  messages,
  contactData,
  status,
  conversationStatus,
  error,
  onSendMessage,
  onClose,
  onCloseSession,
  onStartNewSession,
  onUserTyping,
  pagePath,
}: ChatPanelProps) {
  const whatsappMessage = useWhatsAppMessage();
  const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(whatsappMessage)}`;

  const handleSend = useCallback(
    (message: string) => {
      onSendMessage(message, pagePath);
    },
    [onSendMessage, pagePath],
  );

  const isClosed = conversationStatus === 'closed';
  const isInputDisabled = status === 'loading' || status === 'streaming' || isClosed;

  // Issue 4: Countdown before showing closed view
  const [closingCountdown, setClosingCountdown] = useState<number | null>(null);
  const [showClosedView, setShowClosedView] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isClosed && messages.length > 0 && !showClosedView) {
      setClosingCountdown(20);
      intervalRef.current = setInterval(() => {
        setClosingCountdown((prev) => {
          if (prev === null || prev <= 1) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            setShowClosedView(true);
            return null;
          }
          return prev - 1;
        });
      }, 1000);
      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    }
    // If closed but no messages, show closed view immediately
    if (isClosed && messages.length === 0) {
      setShowClosedView(true);
    }
  }, [isClosed, messages.length, showClosedView]);

  // Reset when starting a new session
  useEffect(() => {
    if (!isClosed) {
      setShowClosedView(false);
      setClosingCountdown(null);
    }
  }, [isClosed]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.95 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="
        flex flex-col bg-white rounded-2xl shadow-2xl overflow-hidden
        w-[calc(100vw-2rem)] h-[calc(100vh-6rem)]
        sm:w-[400px] sm:h-[500px]
      "
      role="dialog"
      aria-label="Chat with Robles.AI"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-800 text-white flex-shrink-0">
        <div className="flex items-center gap-2">
          <img
            src={`/robly-avatar/robly-${mood}.svg`}
            alt="Robly AI assistant"
            className="w-9 h-9 -ml-1 flex-shrink-0"
          />
          <span className="font-semibold text-sm">Robles.AI</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-full hover:bg-white/20 transition-colors"
          aria-label="Close chat panel"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Message area */}
      {isClosed && showClosedView ? (
        <ClosedConversationView onStartNew={onStartNewSession} />
      ) : (
        <>
          <MessageList messages={messages} isStreaming={status === 'streaming'} />
          {/* Countdown banner when closing */}
          {closingCountdown !== null && (
            <div className="px-4 py-2 bg-blue-50 border-t border-blue-100 text-blue-700 text-xs font-medium flex items-center gap-2 flex-shrink-0">
              <div className="relative w-4 h-4 flex-shrink-0">
                <svg className="w-4 h-4 -rotate-90" viewBox="0 0 16 16">
                  <circle
                    cx="8"
                    cy="8"
                    r="6"
                    fill="none"
                    stroke="#DBEAFE"
                    strokeWidth="2"
                  />
                  <circle
                    cx="8"
                    cy="8"
                    r="6"
                    fill="none"
                    stroke="#3B82F6"
                    strokeWidth="2"
                    strokeDasharray={`${(closingCountdown / 20) * 37.7} 37.7`}
                    className="transition-all duration-1000 ease-linear"
                  />
                </svg>
              </div>
              <span className="flex-1">Chat closing in {closingCountdown}s...</span><button onClick={() => { if (intervalRef.current) clearInterval(intervalRef.current); setClosingCountdown(null); onStartNewSession(); }} className="ml-2 px-2 py-0.5 rounded-md bg-blue-600 text-white text-[11px] font-medium hover:bg-blue-700 transition-colors">Continue chatting</button>
            </div>
          )}
        </>
      )}

      {/* Error message */}
      {error && (
        <div className="px-4 py-2 bg-red-50 border-t border-red-100 text-red-600 text-xs flex-shrink-0">
          {error}
        </div>
      )}

      {/* Input area */}
      {!isClosed && <MessageInput onSend={handleSend} isDisabled={isInputDisabled} onTyping={onUserTyping} onEscape={onClose} />}

      {/* Footer actions: WhatsApp + Close session */}
      <div className="flex items-center justify-between px-3 py-2 border-t border-gray-100 bg-gray-50 flex-shrink-0">
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-gray-600 hover:text-green-600 transition-colors"
          aria-label="Continue on WhatsApp"
        >
          <WhatsAppIcon className="w-4 h-4" />
          <span>WhatsApp</span>
        </a>

        {conversationStatus === 'open' && (
          <button
            onClick={onCloseSession}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="End conversation"
          >
            End chat
          </button>
        )}
      </div>
    </motion.div>
  );
}

// ============================================================
// Subcomponents
// ============================================================

function ClosedConversationView({ onStartNew }: { onStartNew: () => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center gap-4">
      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
        <MessageSquare className="w-6 h-6 text-gray-400" />
      </div>
      <div>
        <p className="text-sm font-medium text-gray-700">Conversation ended</p>
        <p className="text-xs text-gray-400 mt-1">Thank you for chatting with us!</p>
      </div>
      <button
        onClick={onStartNew}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
        aria-label="Start a new conversation"
      >
        <RotateCcw className="w-4 h-4" />
        Start new conversation
      </button>
    </div>
  );
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.5.5 0 00.612.638l4.72-1.288A11.944 11.944 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.344 0-4.534-.68-6.392-1.85a.5.5 0 00-.395-.063l-3.206.874.718-2.86a.5.5 0 00-.061-.403A9.945 9.945 0 012 12C2 6.486 6.486 2 12 2s10 4.486 10 10-4.486 10-10 10z" />
    </svg>
  );
}
