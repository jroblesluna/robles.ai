# Requirements Document

## Introduction

Fix the timestamp positioning in the WhatsApp chat bubble widget (`WhatsAppBubble.tsx`). Currently, the timestamp appears outside or below the white message bubble. The timestamp must render inside the white bubble at the bottom-right corner, matching the native WhatsApp message layout where text wraps around the time indicator.

## Glossary

- **Chat_Bubble**: The white rounded container (`div.bg-white.rounded-lg`) that displays the greeting message text and timestamp inside the WhatsApp widget popup.
- **Timestamp**: The time indicator element displaying the current time in `HH:MM` format, positioned at the bottom-right of the Chat_Bubble.
- **Widget**: The `WhatsAppBubble` React component that renders a floating WhatsApp chat interface in the bottom-right corner of the page.

## Requirements

### Requirement 1

**User Story:** As a site visitor, I want the timestamp to appear inside the white message bubble at the bottom-right corner, so that the chat widget looks like a real WhatsApp conversation.

#### Acceptance Criteria

1. THE Chat_Bubble SHALL render the Timestamp element visually inside the white bubble container, at the bottom-right corner of the message area.
2. THE Chat_Bubble SHALL display the greeting text and the Timestamp within the same bounded white container without the Timestamp overflowing or rendering outside the container boundary.
3. THE Timestamp SHALL appear inline at the bottom-right of the message content, allowing the preceding text to wrap around the Timestamp space (matching native WhatsApp message layout).

### Requirement 2

**User Story:** As a site visitor, I want the timestamp to be styled consistently with WhatsApp's native design, so that the widget feels authentic.

#### Acceptance Criteria

1. THE Timestamp SHALL display the current time in `HH:MM` format using a small font size (10px or equivalent).
2. THE Timestamp SHALL use a muted gray color to differentiate the time from the message text.
3. THE Timestamp SHALL maintain a small vertical margin or padding from the bottom edge of the Chat_Bubble to avoid appearing cramped.

### Requirement 3

**User Story:** As a developer, I want the fix to use standard CSS/Tailwind techniques without breaking existing widget behavior, so that the component remains maintainable.

#### Acceptance Criteria

1. WHEN the Chat_Bubble is rendered, THE Widget SHALL preserve all existing functionality including the popup animation, dismiss behavior, and WhatsApp link action.
2. THE Chat_Bubble SHALL remain responsive and render correctly at the fixed width of 288px (w-72) defined by the widget container.
3. IF the greeting text is longer than one line, THEN THE Chat_Bubble SHALL expand vertically to accommodate the text while keeping the Timestamp at the bottom-right of the content area.
