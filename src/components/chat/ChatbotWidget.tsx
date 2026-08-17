import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare } from 'lucide-react';
import { useLocation } from 'wouter';
import { useChatSession } from '../../hooks/useChatSession.js';
import ChatPanel from './ChatPanel.js';

// ============================================================
// ChatbotWidget — Root floating widget component
// Renders the chat bubble + panel. Hidden on admin routes and
// during print.
// ============================================================

export default function ChatbotWidget() {
  const [location] = useLocation();
  const [isOpen, setIsOpen] = useState(false);

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

  // Do not render on admin routes
  if (location.startsWith('/admin')) {
    return null;
  }

  const handleOpen = useCallback(() => setIsOpen(true), []);
  const handleClose = useCallback(() => setIsOpen(false), []);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3 print:hidden">
      {/* Chat panel */}
      <AnimatePresence>
        {isOpen && (
          <ChatPanel
            messages={messages}
            contactData={contactData}
            status={status}
            conversationStatus={conversationStatus}
            error={error}
            onSendMessage={sendMessage}
            onClose={handleClose}
            onCloseSession={closeSession}
            onStartNewSession={startNewSession}
            pagePath={location}
          />
        )}
      </AnimatePresence>

      {/* Floating bubble button */}
      {!isOpen && (
        <motion.button
          onClick={handleOpen}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 1, type: 'spring', stiffness: 200 }}
          className="w-14 h-14 rounded-full bg-purple-600 hover:bg-purple-700 shadow-lg flex items-center justify-center transition-colors"
          aria-label="Open chat"
        >
          <MessageSquare className="w-7 h-7 text-white" />
        </motion.button>
      )}
    </div>
  );
}
