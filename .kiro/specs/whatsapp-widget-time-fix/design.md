# Design Document

## Introduction

This document describes the architectural approach to fix the timestamp positioning inside the WhatsApp chat bubble widget (`WhatsAppBubble.tsx`). The current implementation uses `float-right` on the timestamp, which causes it to either render outside the bubble or break the natural text flow. The fix applies the standard WhatsApp timestamp technique: an invisible inline spacer reserves space at the end of the text, and the timestamp is absolutely positioned at the bottom-right of the bubble.

## Architecture Overview

The fix is contained entirely within the "Chat body" section of the `WhatsAppBubble` component. No new components or files are needed. The change modifies only the JSX structure and Tailwind classes inside the white message bubble (`div.bg-white.rounded-lg`).

### Layout Technique

The native WhatsApp approach uses three elements working together:

1. **Container** — The white bubble gets `position: relative` so it becomes the positioning anchor.
2. **Invisible Spacer** — An inline `<span>` placed after the text content with a fixed width matching the timestamp's width plus a small gap. It's invisible (`opacity-0`) but occupies inline space, causing the text to wrap around it.
3. **Absolute Timestamp** — The real timestamp is positioned `absolute` at `bottom-right` of the container, overlapping the space reserved by the spacer.

This ensures:
- Short messages show the timestamp to the right of the text on the same line.
- Long messages wrap naturally, and the timestamp sits at the bottom-right after the last line.

## Components

### Modified Component: `WhatsAppBubble.tsx`

Only the chat body bubble markup changes. The component's state logic, hooks, animations, and event handlers remain untouched.

#### Current Structure (problematic)

```tsx
<div className="bg-white rounded-lg px-3 py-2 shadow-sm max-w-[85%] relative">
  <p className="text-gray-800 text-sm">{greeting}</p>
  <span className="text-[10px] text-gray-400 float-right mt-1">
    {time}
  </span>
</div>
```

#### New Structure (fix)

```tsx
<div className="bg-white rounded-lg px-3 py-2 shadow-sm max-w-[85%] relative">
  <span className="text-gray-800 text-sm">
    {greeting}
    {/* Invisible spacer to reserve space for the timestamp */}
    <span className="inline-block w-[58px] h-[1px] opacity-0" aria-hidden="true">
      &nbsp;
    </span>
  </span>
  {/* Absolutely positioned timestamp at bottom-right */}
  <span className="absolute bottom-1 right-2 text-[10px] text-gray-400 leading-none">
    {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
  </span>
</div>
```

### Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| Use `<span>` wrapper instead of `<p>` for text | A `<span>` allows the spacer to sit inline with the greeting text, enabling natural text wrapping around the reserved space. A `<p>` tag would force block layout. |
| Spacer width of 58px | Accommodates the timestamp width (~40px for "HH:MM" at 10px font) plus 18px gap so text doesn't touch the time. |
| `aria-hidden="true"` on spacer | The spacer is purely visual and should be ignored by screen readers. |
| `absolute` positioning with `bottom-1 right-2` | Places the timestamp 4px from the bottom and 8px from the right edge of the bubble, matching WhatsApp's native spacing. |
| `leading-none` on timestamp | Prevents extra line-height from pushing the timestamp away from the bottom edge. |

## Interfaces

No new interfaces or APIs are introduced. The component's public interface remains unchanged:

```tsx
export default function WhatsAppBubble(): JSX.Element
```

No props, no exported types. The component is self-contained.

## Data Models

No data model changes. The component uses:
- `greeting: string` — from the `useWhatsAppContext()` hook
- `Date.toLocaleTimeString()` — for the formatted time

## Error Handling

- **Empty greeting**: If `greeting` is an empty string, the spacer still renders and the timestamp displays alone in the bubble. This is acceptable behavior.
- **Locale time format**: `toLocaleTimeString` with `hour: "2-digit", minute: "2-digit"` always produces a valid time string regardless of locale, ensuring the timestamp fits within the reserved space.

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Timestamp format is always HH:MM

*For any* valid JavaScript Date object, formatting it with `toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })` SHALL produce a string that matches the pattern of exactly two groups of digits separated by a colon or locale-appropriate separator (e.g., `"09:41"`, `"14:30"`), with total character length no greater than 5-6 characters.

**Validates: Requirements 2.1**
