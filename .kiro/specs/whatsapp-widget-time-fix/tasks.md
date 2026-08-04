# Implementation Plan: WhatsApp Widget Timestamp Fix

## Overview

Update the chat body markup in `WhatsAppBubble.tsx` to use the standard WhatsApp timestamp positioning technique: replace the `<p>` with a `<span>`, add an invisible inline spacer, and absolutely position the timestamp at the bottom-right of the bubble.

## Tasks

- [x] 1. Fix timestamp positioning in WhatsAppBubble chat body
  - [x] 1.1 Update chat bubble markup to use inline layout with absolute timestamp
    - In `src/components/WhatsAppBubble.tsx`, replace the current chat body bubble content (the `<p>` and `float-right` timestamp) with the new structure:
      - Change `<p className="text-gray-800 text-sm">` to `<span className="text-gray-800 text-sm">`
      - Inside the span, after `{greeting}`, add an invisible spacer: `<span className="inline-block w-[58px] h-[1px] opacity-0" aria-hidden="true">&nbsp;</span>`
      - Replace the existing `float-right` timestamp span with an absolutely positioned one: `<span className="absolute bottom-1 right-2 text-[10px] text-gray-400 leading-none">`
    - Ensure the parent bubble div already has `relative` in its classes (it does)
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 3.1, 3.2, 3.3_

- [x] 2. Checkpoint - Verify the fix renders correctly
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- This is a single-file CSS/JSX change with no logic modifications
- The existing `relative` class on the bubble container is already present
- All component behavior (animations, dismiss, links) remains untouched
- No new dependencies or files are introduced

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] }
  ]
}
```
