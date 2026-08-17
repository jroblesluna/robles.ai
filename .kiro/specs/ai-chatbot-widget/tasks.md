# Implementation Plan: AI Chatbot Widget

## Overview

This plan implements an AI-powered chatbot widget that replaces the existing WhatsApp bubble on robles.ai. The implementation progresses from database schema and backend services, through API routes, to frontend components and admin panel integration. Each task builds on previous steps to ensure no orphaned or disconnected code.

## Tasks

- [x] 1. Database schema and core types
  - [x] 1.1 Create database migration for chat tables
    - Create `server/migrations/chatTables.ts` that adds `chat_conversations`, `chat_messages`, and `chat_contacts` tables with all indexes as specified in the design
    - Run migration from `server/db.ts` initialization
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [x] 1.2 Define shared TypeScript interfaces and types
    - Create `shared/chatTypes.ts` with all interface contracts: `ChatMessageRequest`, `ChatHistoryResponse`, `ChatMessage`, `ContactData`, `ConversationListParams`, `ConversationListResponse`, `ConversationSummary`, `ConversationAnalytics`
    - _Requirements: 5.1, 5.2, 9.5, 10.1, 11.1_

- [x] 2. Conversation Store service
  - [x] 2.1 Implement the Conversation Store CRUD module
    - Create `server/services/conversationStore.ts` with functions: `createConversation(sessionId)`, `getConversationBySession(sessionId)`, `addMessage(conversationId, role, content)`, `getMessages(conversationId)`, `closeConversation(conversationId, reason)`, `updateContact(conversationId, contactData)`, `getContact(conversationId)`, `getOpenConversationsOlderThan(timestamp)`
    - Use `better-sqlite3` with the existing `server/db.ts` database connection
    - _Requirements: 3.1, 3.5, 5.1, 5.2, 5.3, 5.4_

  - [x] 2.2 Write property tests for Conversation Store
    - **Property 2: Message persistence completeness** — For any sequence of N visitor messages stored, querying history returns exactly N visitor messages in chronological order with valid roles, content, and timestamps
    - **Validates: Requirements 5.1, 5.2, 10.1**

  - [x] 2.3 Write property tests for session expiry boundary
    - **Property 4: Session expiry boundary** — For any open conversation, if time since last_message_at exceeds 3600 seconds, the timeout cleanup closes it; otherwise it remains open
    - **Validates: Requirements 3.3**

  - [x] 2.4 Write property tests for conversation closure completeness
    - **Property 5: Conversation closure completeness** — For any conversation transitioning to closed, the DB state has: status=closed, valid closure_reason, non-null closed_at, all messages intact, and linked contact data
    - **Validates: Requirements 3.5, 5.4**

- [x] 3. Context Provider service
  - [x] 3.1 Implement the Context Provider module
    - Create `server/services/chatContext.ts` with function `getPageContext(pagePath: string): Promise<string>`
    - For `/blog/:slug` paths: read blog JSON files to extract article content
    - For `/` (homepage): return Robles.AI services/solutions/features summary
    - For `/try-*` paths: return demo descriptions
    - For other paths: return brief route-based description
    - Implement caching per session to avoid redundant context loading
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.6_

  - [x] 3.2 Write property tests for Context Provider page-awareness
    - **Property 9: Context provider page-awareness** — For any blog path where slug exists, context includes post title and body; for homepage, context includes service descriptions; for two distinct paths, context differs
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4**

- [x] 4. AI Engine service
  - [x] 4.1 Implement the AI Engine module
    - Create `server/services/chatEngine.ts` with function `generateResponse(messages, pagePath, sessionId): AsyncIterable<string>`
    - Build system prompt with three layers: base identity, contact collection directive, and dynamic page context
    - Use OpenAI streaming API (`stream: true`) for real-time token delivery
    - Include `close_conversation` tool for goodbye detection
    - Include `update_contact` tool for contact data extraction after each response
    - Implement Topic_Guard logic in the system prompt
    - Handle errors: timeout (10s), rate limit, API key missing
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 4.1, 4.2, 4.3, 4.4, 4.5_

  - [x] 4.2 Write unit tests for contact data extraction
    - **Property 3: Contact data extraction idempotence** — Calling contact extraction multiple times on the same history produces identical results, no duplicates or corruption
    - **Validates: Requirements 4.2, 4.3, 5.3**

- [x] 5. Email Notifier service
  - [x] 5.1 Implement the Email Notifier module
    - Create `server/services/chatNotifier.ts` with function `sendConversationEmail(conversationId: number): Promise<void>`
    - Generate HTML email with contact data header section (or "no contact" notice) and full transcript in chronological order
    - Use existing `nodemailer` transport and EMAIL_TO from environment
    - Handle email failures gracefully (log and continue, do not throw)
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [x] 5.2 Write property tests for email notification completeness
    - **Property 6: Email notification completeness** — For any closed conversation with M messages and optional contact data, the generated HTML contains all M messages in order with roles, all non-null contact fields (or "no contact" notice), and a valid subject
    - **Validates: Requirements 6.1, 6.2, 6.3, 6.4**

- [x] 6. Checkpoint - Backend services
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Chat API routes
  - [x] 7.1 Implement chat routes with session management and SSE streaming
    - Create `server/chatRoutes.ts` as an Express router with endpoints:
      - `POST /api/chat/session` — create session, set `chat_session` cookie (httpOnly, secure, sameSite lax, maxAge 3600s), return session ID
      - `GET /api/chat/history` — validate session cookie, return messages and contact data
      - `POST /api/chat/message` — validate session cookie, store visitor message, call AI Engine, stream response via SSE (`text/event-stream`), store assistant message, run contact extraction, refresh cookie
      - `POST /api/chat/close` — validate session cookie, close conversation with reason 'goodbye', trigger email notification
    - Implement rate limiting: 30 messages per 10-minute window per session
    - Validate message length (max 2000 chars)
    - Wire router into `server/routes.ts`
    - _Requirements: 1.1, 1.5, 3.1, 3.2, 3.3, 3.4, 3.5, 5.1, 5.2, 5.4_

  - [x] 7.2 Write property tests for session cookie round-trip identity
    - **Property 1: Session cookie round-trip identity** — Creating a session and requesting history with the returned cookie returns a conversation belonging to that session, no other session shares it
    - **Validates: Requirements 3.1, 3.2**

  - [x] 7.3 Write integration tests for chat endpoints
    - Test full request/response cycle: session creation, message sending with SSE parsing, history retrieval, session closure
    - Test rate limiting enforcement (30 messages / 10 minutes)
    - Test invalid/expired session handling (401, 410)
    - Test message validation (empty, too long)
    - _Requirements: 1.1, 1.5, 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 8. Session timeout job
  - [x] 8.1 Implement session timeout cleanup job
    - Create `server/jobs/chatSessionCleanup.ts` that runs every 5 minutes via `node-cron`
    - Query open conversations with `last_message_at` older than 1 hour
    - Close them with `closure_reason = 'timeout'`
    - Trigger email notification for each closed conversation
    - Register job in `server/index.ts`
    - _Requirements: 3.3, 3.5, 6.1_

- [x] 9. Admin API routes
  - [x] 9.1 Implement admin conversation endpoints
    - Add to `server/adminRoutes.ts` (or create `server/chatAdminRoutes.ts` and wire in):
      - `GET /api/admin/conversations` — paginated list with filters (page, limit, dateFrom, dateTo, hasContact, status), uses existing `requireAuth` middleware
      - `GET /api/admin/conversations/:id` — full conversation detail with messages and contact data
      - `GET /api/admin/conversations/analytics` — aggregated stats for date range (totalConversations, contactCaptureRate, averageMessages, topTopics)
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 10.1, 10.2, 10.3, 11.1, 11.2, 11.3, 11.4_

  - [x] 9.2 Write property tests for admin pagination and filtering
    - **Property 7: Admin conversation list pagination and filtering** — For any set of N conversations and query params, response returns at most `limit` items, `total` equals matching count, all items match filters, sequential pages cover all without overlap
    - **Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.5**

  - [x] 9.3 Write property tests for analytics computation
    - **Property 8: Analytics computation correctness** — For any set of conversations in a date range, totalConversations equals count, contactCaptureRate equals (conversations with name AND (email OR phone)) / total × 100, averageMessages equals sum of counts / total
    - **Validates: Requirements 11.1, 11.2, 11.4**

- [x] 10. Checkpoint - Backend complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Frontend chat widget components
  - [x] 11.1 Implement the `useChatSession` custom hook
    - Create `src/hooks/useChatSession.ts` managing: session cookie detection, conversation history fetching, message sending with SSE stream consumption, message state array, connection status, contact data state
    - Handle session lifecycle: create session on first message, restore on mount if cookie exists, start new session if 404/410 returned
    - Parse SSE events: `token`, `done`, `contact_update`, `error`
    - _Requirements: 3.1, 3.2, 1.1, 1.5_

  - [x] 11.2 Implement `MessageList` and `MessageInput` components
    - Create `src/components/chat/MessageList.tsx` — renders message bubbles with timestamps and sender indicators (visitor vs assistant), auto-scrolls to latest message, shows typing indicator during streaming
    - Create `src/components/chat/MessageInput.tsx` — text input with send button, handles Enter key submission, disabled state during streaming, max 2000 char limit
    - _Requirements: 7.2, 7.3_

  - [x] 11.3 Implement `ChatPanel` component
    - Create `src/components/chat/ChatPanel.tsx` — renders MessageList, MessageInput, close button, and WhatsApp button
    - WhatsApp button opens `https://wa.me/14085900153` with context-aware pre-filled message in a new tab
    - Include header with Robles.AI branding and close (X) button
    - Responsive layout for mobile and desktop
    - _Requirements: 7.2, 7.3, 7.5, 8.1, 8.2, 8.3_

  - [x] 11.4 Implement `ChatbotWidget` root component
    - Create `src/components/chat/ChatbotWidget.tsx` — renders floating bubble at bottom-right, toggles ChatPanel open/close
    - Hidden during print (`@media print { display: none }`)
    - Not rendered on `/admin/*` routes
    - Maintains same z-index positioning as the previous WhatsAppBubble
    - _Requirements: 7.1, 7.4, 7.6, 12.2_

- [x] 12. Replace WhatsApp bubble and integrate widget
  - [x] 12.1 Remove WhatsAppBubble and mount ChatbotWidget
    - Remove `src/components/WhatsAppBubble.tsx` from the codebase
    - Remove any imports/usages of WhatsAppBubble from `App.tsx` or layout components
    - Add `ChatbotWidget` to the main App layout (rendered globally except on admin routes)
    - _Requirements: 12.1, 12.2, 12.3_

- [x] 13. Admin panel — Conversations pages
  - [x] 13.1 Implement Admin Conversation List page
    - Create `src/pages/admin/AdminConversationList.tsx` — paginated table with columns: date, visitor name, status, message count
    - Add filter controls: date range picker, hasContact toggle, status dropdown
    - Add analytics tab/section showing total conversations, contact capture rate, average messages, top topics
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 11.1, 11.2, 11.3, 11.4_

  - [x] 13.2 Implement Admin Conversation Detail page
    - Create `src/pages/admin/AdminConversationDetail.tsx` — full transcript with timestamps and sender roles
    - Contact data summary section above transcript (or "no contact information" notice)
    - Back navigation to list
    - _Requirements: 10.1, 10.2, 10.3_

  - [x] 13.3 Wire admin pages into AdminLayout and routing
    - Add `Conversations` entry to the sidebar navLinks in `AdminLayout.tsx`
    - Add routes for `/admin/conversations` and `/admin/conversations/:id` in the admin router
    - _Requirements: 9.1, 10.1_

- [x] 14. Checkpoint - Frontend complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 15. Integration and final wiring
  - [x] 15.1 End-to-end wiring and error handling
    - Verify the full flow: widget opens → session created → message sent → SSE stream received → message displayed → conversation stored → session closes → email sent
    - Ensure all error states render user-friendly messages (API timeout, rate limit, service unavailable)
    - Verify cookie refresh on each message extends session by 1 hour
    - Verify admin panel loads conversations correctly with all filters
    - _Requirements: 1.1, 1.5, 3.1, 3.2, 3.3, 3.5, 6.1, 7.1_

  - [x] 15.2 Write integration tests for full chat flow
    - Test complete lifecycle: session creation → multiple messages → contact extraction → session closure → email notification
    - Test admin endpoints with auth enforcement
    - Test SSE stream token assembly
    - _Requirements: 1.1, 3.1, 3.5, 5.1, 6.1, 9.1, 10.1_

- [x] 16. Final checkpoint
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The project already has `fast-check`, `vitest`, and `supertest` installed as dev dependencies
- All backend modules use the existing `server/data/dominical.db` SQLite database
- The frontend uses `wouter` for routing, `@tanstack/react-query` for data fetching, and Tailwind CSS for styling
- The admin panel reuses the existing `requireAuth` middleware from `server/auth.ts`

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["2.1", "3.1"] },
    { "id": 2, "tasks": ["2.2", "2.3", "2.4", "3.2", "4.1", "5.1"] },
    { "id": 3, "tasks": ["4.2", "5.2", "7.1", "8.1"] },
    { "id": 4, "tasks": ["7.2", "7.3", "9.1"] },
    { "id": 5, "tasks": ["9.2", "9.3", "11.1"] },
    { "id": 6, "tasks": ["11.2", "11.3"] },
    { "id": 7, "tasks": ["11.4", "12.1"] },
    { "id": 8, "tasks": ["13.1", "13.2"] },
    { "id": 9, "tasks": ["13.3", "15.1"] },
    { "id": 10, "tasks": ["15.2"] }
  ]
}
```
