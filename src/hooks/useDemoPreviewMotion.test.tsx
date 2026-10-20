import React from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useDemoPreviewMotion } from './useDemoPreviewMotion';

let intersect: (entries: Partial<IntersectionObserverEntry>[]) => void;
const disconnect = vi.fn();
beforeEach(() => {
  vi.useFakeTimers(); disconnect.mockClear();
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true })));
  vi.stubGlobal('IntersectionObserver', class {
    constructor(callback: any) { intersect = callback; }
    observe() {} disconnect = disconnect;
  });
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); });
function Preview({ enabled = true, reduced = false }) {
  const motion = useDemoPreviewMotion(enabled, reduced);
  return <div ref={motion.target} onMouseEnter={motion.onMouseEnter} onMouseLeave={motion.onMouseLeave} data-testid="preview" data-playing={motion.playing} data-run={motion.run}>
    <button onClick={motion.replay}>Replay</button><button onClick={motion.stop}>Stop</button>
  </div>;
}
const enter = () => act(() => intersect([{ isIntersecting: true, intersectionRatio: .5 }]));
const leave = () => act(() => intersect([{ isIntersecting: false, intersectionRatio: 0 }]));
it('plays once when visible, finishes after four seconds, and permits explicit replay', () => {
  render(<Preview />); const preview = screen.getByTestId('preview');
  expect(preview).toHaveAttribute('data-playing', 'false');
  enter(); expect(preview).toHaveAttribute('data-playing', 'true');
  act(() => { vi.advanceTimersByTime(4000); });
  expect(preview).toHaveAttribute('data-playing', 'false');
  leave(); enter(); expect(preview).toHaveAttribute('data-playing', 'false');
  fireEvent.click(screen.getByText('Replay')); expect(preview).toHaveAttribute('data-playing', 'true');
  fireEvent.click(screen.getByText('Stop')); expect(preview).toHaveAttribute('data-playing', 'false');
});
it('stops when offscreen and releases observer and timer on unmount', () => {
  const view = render(<Preview />); enter(); leave();
  expect(screen.getByTestId('preview')).toHaveAttribute('data-playing', 'false');
  fireEvent.click(screen.getByText('Replay')); view.unmount();
  expect(disconnect).toHaveBeenCalled(); expect(vi.getTimerCount()).toBe(0);
});
it('does not animate or observe before the image is ready or with reduced motion', () => {
  const view = render(<Preview enabled={false} />);
  fireEvent.click(screen.getByText('Replay')); expect(vi.getTimerCount()).toBe(0);
  view.rerender(<Preview reduced />);
  fireEvent.click(screen.getByText('Replay'));
  expect(screen.getByTestId('preview')).toHaveAttribute('data-playing', 'false');
  expect(vi.getTimerCount()).toBe(0);
});
it('responds to a reduced-motion preference change during playback', () => {
  const view = render(<Preview />); enter();
  view.rerender(<Preview reduced />);
  expect(screen.getByTestId('preview')).toHaveAttribute('data-playing', 'false');
  expect(vi.getTimerCount()).toBe(0);
});

it('replays on each desktop mouse entry, stops on exit and ends without looping', () => {
  render(<Preview />); const preview = screen.getByTestId('preview');
  fireEvent.mouseEnter(preview);
  expect(preview).toHaveAttribute('data-playing', 'true');
  expect(preview).toHaveAttribute('data-run', '1');
  fireEvent.mouseLeave(preview);
  expect(preview).toHaveAttribute('data-playing', 'false');
  fireEvent.mouseEnter(preview);
  expect(preview).toHaveAttribute('data-run', '2');
  act(() => { vi.advanceTimersByTime(12000); });
  expect(preview).toHaveAttribute('data-playing', 'false');
  expect(preview).toHaveAttribute('data-run', '2');
});
it('ignores emulated mouse hover on touch devices and preserves explicit touch playback', () => {
  vi.mocked(window.matchMedia).mockReturnValue({ matches: false } as MediaQueryList);
  render(<Preview />); const preview = screen.getByTestId('preview');
  fireEvent.mouseEnter(preview);
  expect(preview).toHaveAttribute('data-playing', 'false');
  fireEvent.click(screen.getByText('Replay'));
  fireEvent.mouseLeave(preview);
  expect(preview).toHaveAttribute('data-playing', 'true');
});
it('does not start hover playback before image readiness or with reduced motion', () => {
  const view = render(<Preview enabled={false} />);
  fireEvent.mouseEnter(screen.getByTestId('preview'));
  expect(screen.getByTestId('preview')).toHaveAttribute('data-playing', 'false');
  view.rerender(<Preview reduced />);
  fireEvent.mouseLeave(screen.getByTestId('preview'));
  fireEvent.mouseEnter(screen.getByTestId('preview'));
  expect(screen.getByTestId('preview')).toHaveAttribute('data-playing', 'false');
});
