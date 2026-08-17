// ============================================================
// AI Chatbot Widget — Shared Type Definitions
// ============================================================

// POST /api/chat/message request body
export interface ChatMessageRequest {
  message: string;
  pagePath: string; // current page route, e.g. "/blog/ai-in-healthcare"
}

// Individual chat message
export interface ChatMessage {
  id: number;
  role: 'visitor' | 'assistant';
  content: string;
  timestamp: string; // ISO 8601
}

// Contact data extracted from conversation
export interface ContactData {
  name: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
}

// GET /api/chat/history response
export interface ChatHistoryResponse {
  messages: ChatMessage[];
  contactData: ContactData | null;
  status: 'open' | 'closed';
}

// GET /api/admin/conversations query params
export interface ConversationListParams {
  page?: number;        // default 1
  limit?: number;       // default 20, max 100
  dateFrom?: string;    // ISO date
  dateTo?: string;      // ISO date
  hasContact?: boolean; // filter to only conversations with contact data
  status?: 'open' | 'closed';
}

// Conversation summary for list views
export interface ConversationSummary {
  id: number;
  visitorName: string | null;
  status: 'open' | 'closed';
  closureReason: 'timeout' | 'goodbye' | 'session_lost' | null;
  messageCount: number;
  createdAt: string;
  lastMessageAt: string;
}

// GET /api/admin/conversations response
export interface ConversationListResponse {
  conversations: ConversationSummary[];
  total: number;
  page: number;
  limit: number;
}

// GET /api/admin/conversations/analytics response
export interface ConversationAnalytics {
  totalConversations: number;
  contactCaptureRate: number; // 0-100
  averageMessages: number;
  topTopics: { topic: string; count: number }[];
}
