import React from 'react';
import { renderToString } from 'react-dom/server';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { DemoVideoPreview } from './DemoVideoPreview';
import clips from '@/data/demoClips.json';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
const intersections = new Map<Element, (entries: Partial<IntersectionObserverEntry>[]) => void>();
let hover = true;
let saveData = false;
let hidden = false;
beforeEach(() => {
  hover = true; saveData = false; hidden = false; intersections.clear();
  vi.spyOn(document, 'hidden', 'get').mockImplementation(() => hidden);
  Object.defineProperty(navigator, 'connection', { configurable: true, value: { get saveData() { return saveData; }, addEventListener: vi.fn(), removeEventListener: vi.fn() } });
  vi.stubGlobal('matchMedia', vi.fn(() => ({ get matches() { return hover; }, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
  vi.stubGlobal('IntersectionObserver', class {
    constructor(private callback: (entries: Partial<IntersectionObserverEntry>[]) => void) {}
    observe(element: Element) { intersections.set(element, this.callback); }
    disconnect() {}
  });
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
  vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => {});
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); delete (navigator as any).connection; });
function visible(element: Element, inView = true) {
  act(() => intersections.get(element)!([{ isIntersecting: inView, intersectionRatio: inView ? .5 : 0 }]));
}
const preview = (props: Partial<{ hovered: boolean; pressed: boolean; reducedMotion: boolean }> = {}) =>
  <DemoVideoPreview id="rag" hovered={false} pressed={false} reducedMotion={false} {...props} />;
function mount() {
  const view = render(preview());
  const wrapper = view.container.querySelector('[data-demo-video]')!;
  const video = view.container.querySelector('video')!;
  visible(wrapper);
  return { ...view, wrapper, video };
}
it('emits no video source in server HTML or after entering the viewport', () => {
  const html = renderToString(preview());
  expect(html).not.toContain(clips.rag.src);
  const { video } = mount();
  expect(video).not.toHaveAttribute('src');
  expect(video).toHaveAttribute('preload', 'none');
  expect(HTMLMediaElement.prototype.play).not.toHaveBeenCalled();
});
it('has no controls of its own: the whole card is the link', () => {
  const { container } = mount();
  expect(container.querySelector('button, a')).toBeNull();
});
it('loads on desktop hover, loops and returns to the poster on exit', () => {
  const { rerender, video, wrapper } = mount();
  rerender(preview({ hovered: true }));
  expect(video).toHaveAttribute('src', clips.rag.src);
  expect(video).toHaveAttribute('loop');
  expect(HTMLMediaElement.prototype.play).toHaveBeenCalledOnce();
  fireEvent.playing(video);
  expect(wrapper).toHaveAttribute('data-state', 'playing');
  rerender(preview());
  expect(wrapper).toHaveAttribute('data-state', 'idle');
  expect(video.className).toContain('opacity-0');
  expect(HTMLMediaElement.prototype.pause).toHaveBeenCalled();
});
it.each(['touch', 'reduced-motion', 'data-saver'])('ignores hover but plays while held for %s', mode => {
  hover = mode !== 'touch'; saveData = mode === 'data-saver';
  const reducedMotion = mode === 'reduced-motion';
  const { video, wrapper, rerender } = mount();
  rerender(preview({ hovered: true, reducedMotion }));
  expect(video).not.toHaveAttribute('src');
  rerender(preview({ pressed: true, reducedMotion }));
  expect(video).toHaveAttribute('src', clips.rag.src);
  fireEvent.playing(video);
  expect(wrapper).toHaveAttribute('data-state', 'playing');
  rerender(preview({ reducedMotion }));
  expect(wrapper).toHaveAttribute('data-state', 'idle');
});
it('stops offscreen and when the page is hidden', () => {
  const { rerender, video, wrapper } = mount();
  rerender(preview({ hovered: true }));fireEvent.playing(video);
  visible(wrapper, false);
  expect(wrapper).toHaveAttribute('data-state', 'idle');
  visible(wrapper);fireEvent.playing(video);
  hidden = true;
  fireEvent(document, new Event('visibilitychange'));
  expect(wrapper).toHaveAttribute('data-state', 'idle');
});
it('keeps the poster after a media error and retries on the next hover', () => {
  const { video, wrapper, rerender } = mount();
  rerender(preview({ hovered: true }));fireEvent.error(video);
  expect(wrapper).toHaveAttribute('data-state', 'error');
  expect(wrapper.querySelector('img')).toHaveAttribute('src', clips.rag.poster);
  expect(screen.getByRole('status')).toBeInTheDocument();
  rerender(preview());
  rerender(preview({ hovered: true }));
  expect(wrapper).toHaveAttribute('data-state', 'loading');
});
it('recovers from rejected autoplay without an automatic retry loop', async () => {
  vi.mocked(HTMLMediaElement.prototype.play).mockRejectedValueOnce(new DOMException('Gesture needed', 'NotAllowedError'));
  const { rerender, wrapper } = mount();
  rerender(preview({ hovered: true }));
  await waitFor(() => expect(wrapper).toHaveAttribute('data-state', 'idle'));
  expect(HTMLMediaElement.prototype.play).toHaveBeenCalledOnce();
  rerender(preview());
  rerender(preview({ hovered: true }));
  expect(HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(2);
});
