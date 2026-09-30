import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useReducedMotion } from '../useReducedMotion';

/**
 * DOM tests for useReducedMotion (Design: Testing Strategy — Example-based / DOM tests).
 * Validates: Requirements 20.1
 */

type ChangeListener = (event: MediaQueryListEvent) => void;

function installMatchMedia(initialMatches: boolean) {
  const listeners = new Set<ChangeListener>();
  const mql = {
    matches: initialMatches,
    media: '(prefers-reduced-motion: reduce)',
    addEventListener: (_type: string, cb: ChangeListener) => listeners.add(cb),
    removeEventListener: (_type: string, cb: ChangeListener) => listeners.delete(cb),
    // legacy API kept so the hook's fallback path is also valid
    addListener: (cb: ChangeListener) => listeners.add(cb),
    removeListener: (cb: ChangeListener) => listeners.delete(cb),
    dispatchEvent: () => true,
  } as unknown as MediaQueryList;

  const matchMedia = vi.fn().mockReturnValue(mql);
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: matchMedia,
  });

  return {
    matchMedia,
    fire(matches: boolean) {
      (mql as unknown as { matches: boolean }).matches = matches;
      listeners.forEach((cb) => cb({ matches } as MediaQueryListEvent));
    },
  };
}

describe('useReducedMotion', () => {
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: originalMatchMedia,
    });
  });

  it('returns the initial matchMedia value (reduce requested)', () => {
    installMatchMedia(true);
    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(true);
  });

  it('returns false when reduce is not requested', () => {
    installMatchMedia(false);
    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(false);
  });

  it('updates when the media query change event fires', () => {
    const mm = installMatchMedia(false);
    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(false);

    act(() => mm.fire(true));
    expect(result.current).toBe(true);

    act(() => mm.fire(false));
    expect(result.current).toBe(false);
  });

  it('defaults to false when matchMedia is unavailable', () => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: undefined,
    });
    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(false);
  });
});
