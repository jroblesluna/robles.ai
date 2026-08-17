# Requirements Document

## Introduction

This feature replaces the existing WhatsApp bubble widget with an AI-powered chatbot widget on the robles.ai website. The chatbot uses GPT-4o-mini to engage visitors in contextual conversations about Robles.AI services, AI/ML topics, and the currently displayed page content. It naturally collects visitor contact data and stores all conversations in the database for admin review, while offering WhatsApp as an alternative communication channel.

## Glossary

- **Chatbot_Widget**: The floating UI component rendered at the bottom-right of the viewport that provides the chat interface to visitors
- **Chat_Panel**: The expanded conversation view that opens when a visitor clicks the Chatbot_Widget bubble
- **Conversation**: A complete sequence of messages exchanged between a visitor and the AI within a single session
- **Session**: A visitor's active chatbot session, identified and persisted via a browser cookie
- **Context_Provider**: The server-side module responsible for assembling page-specific content to supply as context to the AI model
- **Contact_Data**: Visitor information collected during conversation: name (required), last name (optional), email or phone (at least one required), company (optional)
- **Conversation_Store**: The SQLite database tables that persist conversations, messages, and captured contact data
- **Admin_Conversations_Panel**: The admin panel section for viewing and filtering stored conversations
- **AI_Engine**: The server-side module that interfaces with the OpenAI API (GPT-4o-mini) to generate chatbot responses
- **Topic_Guard**: The system prompt logic that constrains AI responses to relevant topics and redirects off-topic queries

## Requirements

### Requirement 1: AI Response Generation

**User Story:** As a visitor, I want to chat with an AI assistant on robles.ai, so that I can get answers about Robles.AI services and AI/ML topics without waiting for a human.

#### Acceptance Criteria

1. WHEN a visitor sends a message, THE AI_Engine SHALL generate a response using the OpenAI GPT-4o-mini model within 10 seconds
2. WHEN a visitor asks about Robles.AI services, AI/ML topics, or content on the current page, THE AI_Engine SHALL provide a relevant, informative response based on the supplied context
3. WHEN a visitor asks about a topic unrelated to Robles.AI services, AI/ML, or current page content, THE Topic_Guard SHALL respond with a polite redirection toward relevant topics
4. THE AI_Engine SHALL orient conversations toward the visitor providing their contact data without using pushy or aggressive phrasing
5. IF the OpenAI API returns an error or times out, THEN THE AI_Engine SHALL display a user-friendly error message and allow the visitor to retry

---

### Requirement 2: Page Context Awareness

**User Story:** As a visitor, I want the chatbot to understand the page I'm currently viewing, so that it can give me relevant answers about the content I'm reading.

#### Acceptance Criteria

1. WHEN a visitor is on a `/blog/:slug` page and sends a message referencing page content, THE Context_Provider SHALL include the full article content as context for the AI_Engine
2. WHEN a visitor is on the homepage (`/`) and sends a message referencing page content, THE Context_Provider SHALL include Robles.AI services, features, and solutions descriptions as context
3. WHEN a visitor is on any other page and sends a message referencing page content, THE Context_Provider SHALL include the visible content of that section as context
4. WHEN a visitor navigates to a different page during an active session, THE Context_Provider SHALL update the page context to reflect the newly displayed page
5. WHEN a visitor asks about news or articles, THE AI_Engine SHALL route the visitor to blog search results and discuss relevant articles
6. THE Context_Provider SHALL load page context only when the visitor asks a question that references page content or news, not preemptively on every message

---

### Requirement 3: Conversation Session Persistence

**User Story:** As a visitor, I want my conversation to persist if I refresh the page or open a new tab, so that I don't lose my chat history.

#### Acceptance Criteria

1. THE Chatbot_Widget SHALL maintain a single conversation per visitor across all browser tabs using a session cookie
2. WHEN a visitor refreshes the page or opens the site in a new tab, THE Chatbot_Widget SHALL restore the existing conversation history from the session
3. WHEN 1 hour has elapsed since the last message or cookie update, THE Session SHALL expire and the conversation SHALL close
4. WHEN a visitor explicitly says goodbye or indicates they want to end the conversation, THE Session SHALL close
5. WHEN a Session closes for any reason (timeout, goodbye, or session loss), THE Conversation_Store SHALL save the complete conversation and any captured contact data

---

### Requirement 4: Contact Data Collection

**User Story:** As a business owner, I want the chatbot to naturally collect visitor contact information during conversations, so that I can follow up on leads.

#### Acceptance Criteria

1. THE AI_Engine SHALL naturally weave requests for Contact_Data into the conversation flow without interrupting the user experience
2. THE AI_Engine SHALL collect the visitor's name as a required field before the session ends
3. THE AI_Engine SHALL collect at least one of email or phone number from the visitor before the session ends
4. WHERE the visitor provides their last name or company name, THE AI_Engine SHALL capture and store those optional fields
5. IF the visitor declines to provide contact information, THEN THE AI_Engine SHALL accept the refusal gracefully and continue the conversation without repeated requests

---

### Requirement 5: Conversation Storage

**User Story:** As a business owner, I want all chatbot conversations stored in the database, so that I can review them later regardless of whether contact data was captured.

#### Acceptance Criteria

1. THE Conversation_Store SHALL persist every conversation in the SQLite database, including conversations where no contact data was captured
2. THE Conversation_Store SHALL store each message with its sender role (visitor or assistant), content, and timestamp
3. THE Conversation_Store SHALL store captured Contact_Data linked to its corresponding conversation
4. WHEN a conversation session closes, THE Conversation_Store SHALL mark the conversation status as closed with a closure reason (timeout, goodbye, or session_lost)

---

### Requirement 6: Email Notification on Conversation End

**User Story:** As a business owner, I want to receive an email notification when a chatbot conversation ends, so that I can review leads and follow up promptly.

#### Acceptance Criteria

1. WHEN a conversation session closes, THE AI_Engine SHALL send an email notification to the EMAIL_TO address configured for the contact form
2. THE email notification SHALL include captured Contact_Data (name, last name, email, phone, company) as a header section
3. THE email notification SHALL include the full conversation transcript below the contact data header
4. IF no Contact_Data was captured during the conversation, THEN THE email notification SHALL indicate that no contact information was provided and still include the full transcript

---

### Requirement 7: Chat Widget UI

**User Story:** As a visitor, I want an intuitive floating chat widget that I can open and close easily, so that I can communicate with Robles.AI without navigating away from the page.

#### Acceptance Criteria

1. THE Chatbot_Widget SHALL render as a floating bubble positioned at the bottom-right corner of the viewport
2. WHEN a visitor clicks the chat bubble, THE Chat_Panel SHALL expand to show the conversation interface
3. THE Chat_Panel SHALL be responsive and functional on both mobile and desktop screen sizes
4. WHILE a print media query is active, THE Chatbot_Widget SHALL be hidden (display: none)
5. THE Chat_Panel SHALL include a visible button or link that opens the WhatsApp contact URL (`https://wa.me/14085900153`) in a new tab
6. WHILE the visitor is on an admin route (`/admin/*`), THE Chatbot_Widget SHALL not be rendered

---

### Requirement 8: WhatsApp Alternative Channel

**User Story:** As a visitor, I want the option to switch to WhatsApp during a chatbot conversation, so that I can continue the conversation on my preferred platform.

#### Acceptance Criteria

1. THE Chat_Panel SHALL display a WhatsApp button that is visible at all times within the chat interface
2. WHEN a visitor clicks the WhatsApp button, THE Chatbot_Widget SHALL open the WhatsApp link (`https://wa.me/14085900153`) with a pre-filled context-aware message in a new tab
3. THE WhatsApp button SHALL use the same context-aware message logic currently implemented in the WhatsAppBubble component

---

### Requirement 9: Admin Panel — Conversation List

**User Story:** As an administrator, I want to view a list of all chatbot conversations with filtering options, so that I can find and review specific interactions.

#### Acceptance Criteria

1. THE Admin_Conversations_Panel SHALL display a paginated list of all stored conversations
2. THE Admin_Conversations_Panel SHALL provide date range filters to narrow conversations by their creation date
3. THE Admin_Conversations_Panel SHALL provide a filter to show only conversations where Contact_Data was captured
4. THE Admin_Conversations_Panel SHALL provide a filter by conversation status (open, closed)
5. THE Admin_Conversations_Panel SHALL display for each conversation: date, visitor name (if captured), status, and message count

---

### Requirement 10: Admin Panel — Conversation Detail

**User Story:** As an administrator, I want to view the full transcript and contact data for any conversation, so that I can understand the visitor's needs and follow up.

#### Acceptance Criteria

1. WHEN an administrator selects a conversation from the list, THE Admin_Conversations_Panel SHALL display the full message transcript with timestamps and sender roles
2. THE Admin_Conversations_Panel SHALL display all captured Contact_Data (name, last name, email, phone, company) in a summary section above the transcript
3. IF no Contact_Data was captured, THEN THE Admin_Conversations_Panel SHALL display a notice indicating no contact information was collected

---

### Requirement 11: Admin Panel — Conversation Analytics

**User Story:** As an administrator, I want to see analytics about chatbot usage, so that I can measure engagement and lead capture effectiveness.

#### Acceptance Criteria

1. THE Admin_Conversations_Panel SHALL display the total number of conversations for a selected date range
2. THE Admin_Conversations_Panel SHALL display the contact data capture rate (percentage of conversations where at least name and one contact method were collected)
3. THE Admin_Conversations_Panel SHALL display the most frequently consulted topics based on conversation content
4. THE Admin_Conversations_Panel SHALL display the average number of messages per conversation

---

### Requirement 12: Existing WhatsApp Widget Replacement

**User Story:** As a developer, I want the new chatbot widget to replace the existing WhatsApp bubble cleanly, so that there is no duplicate floating widget.

#### Acceptance Criteria

1. WHEN the Chatbot_Widget is deployed, THE WhatsAppBubble component (`src/components/WhatsAppBubble.tsx`) SHALL be removed from the application
2. THE Chatbot_Widget SHALL maintain the same bottom-right positioning and z-index behavior as the previous WhatsAppBubble component
3. THE Chatbot_Widget SHALL preserve the WhatsApp contact option as a button within the Chat_Panel interface
