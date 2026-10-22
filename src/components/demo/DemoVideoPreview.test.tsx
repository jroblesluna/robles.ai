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
function mount() {
  const view = render(<DemoVideoPreview id="rag" title="Documents" hovered={false} reducedMotion={false} />);
  const wrapper = view.container.querySelector('[data-demo-video]')!;
  const video = view.container.querySelector('video')!;
  visible(wrapper);
  return { ...view, wrapper, video };
}
it('emits no video source in server HTML or after entering the viewport', () => {
  const html = renderToString(<DemoVideoPreview id="rag" title="Documents" hovered={false} reducedMotion={false} />);
  expect(html).not.toContain(clips.rag.src);
  const { video } = mount();
  expect(video).not.toHaveAttribute('src');
  expect(video).toHaveAttribute('preload', 'none');
  expect(HTMLMediaElement.prototype.play).not.toHaveBeenCalled();
});
it('retains explicit playback when hover media queries are unavailable', () => {
  vi.stubGlobal('matchMedia', undefined);
  const { video } = mount();
  expect(video).not.toHaveAttribute('src');
  fireEvent.click(screen.getByRole('button'));
  expect(video).toHaveAttribute('src', clips.rag.src);
});
it('loads on desktop hover, plays the whole clip without a four-second timer and stops on exit', () => {
  const { rerender, video, wrapper } = mount();
  rerender(<DemoVideoPreview id="rag" title="Documents" hovered reducedMotion={false} />);
  expect(video).toHaveAttribute('src', clips.rag.src);
  expect(HTMLMediaElement.prototype.play).toHaveBeenCalledOnce();
  fireEvent.playing(video);
  expect(wrapper).toHaveAttribute('data-state', 'playing');
  expect(video).not.toHaveAttribute('loop');
  rerender(<DemoVideoPreview id="rag" title="Documents" hovered={false} reducedMotion={false} />);
  expect(wrapper).toHaveAttribute('data-state', 'idle');
  expect(HTMLMediaElement.prototype.pause).toHaveBeenCalled();
});
it.each(['touch', 'reduced-motion', 'data-saver'])('requires explicit activation for %s', mode => {
  hover = mode !== 'touch'; saveData = mode === 'data-saver';
  const { video, wrapper, rerender } = mount();
  rerender(<DemoVideoPreview id="rag" title="Documents" hovered reducedMotion={mode === 'reduced-motion'} />);
  expect(video).not.toHaveAttribute('src');
  fireEvent.click(screen.getByRole('button'));
  expect(video).toHaveAttribute('src', clips.rag.src);
  fireEvent.playing(video);
  expect(wrapper).toHaveAttribute('data-state', 'playing');
  expect(wrapper.querySelector('a')).toBeNull();
});
it('allows only one active preview across cards and pauses when hidden or offscreen', () => {
  const view = render(<><DemoVideoPreview id="rag" title="Documents" hovered={false} reducedMotion={false} /><DemoVideoPreview id="tts" title="Voice" hovered={false} reducedMotion={false} /></>);
  const wrappers = view.container.querySelectorAll('[data-demo-video]');
  wrappers.forEach(element => visible(element));
  const buttons = screen.getAllByRole('button');
  fireEvent.click(buttons[0]);fireEvent.playing(view.container.querySelectorAll('video')[0]);
  fireEvent.click(buttons[1]);
  expect(buttons[0]).toHaveAttribute('aria-pressed', 'false');
  expect(buttons[1]).toHaveAttribute('aria-pressed', 'true');
  visible(wrappers[1], false);
  expect(buttons[1]).toHaveAttribute('aria-pressed', 'false');
  fireEvent.click(buttons[0]);hidden = true;
  fireEvent(document, new Event('visibilitychange'));
  expect(buttons[0]).toHaveAttribute('aria-pressed', 'false');
});
it('stops on the ended event and restarts only when requested again', () => {
  const { video } = mount();fireEvent.click(screen.getByRole('button'));fireEvent.playing(video);
  fireEvent.ended(video);
  expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'false');
  fireEvent.click(screen.getByRole('button'));
  expect(HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(2);
});
it('retains a poster and retry button after a media error', () => {
  const { video, wrapper } = mount();fireEvent.click(screen.getByRole('button'));fireEvent.error(video);
  expect(wrapper).toHaveAttribute('data-state', 'error');
  expect(wrapper.querySelector('img')).toHaveAttribute('src', clips.rag.poster);
  expect(screen.getByRole('status')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button'));
  expect(wrapper).toHaveAttribute('data-state', 'loading');
});
it('recovers from rejected autoplay without an automatic retry loop', async () => {
  vi.mocked(HTMLMediaElement.prototype.play).mockRejectedValueOnce(new DOMException('Gesture needed', 'NotAllowedError'));
  const { rerender, wrapper } = mount();
  rerender(<DemoVideoPreview id="rag" title="Documents" hovered reducedMotion={false} />);
  await waitFor(() => expect(wrapper).toHaveAttribute('data-state', 'idle'));
  expect(HTMLMediaElement.prototype.play).toHaveBeenCalledOnce();
  fireEvent.click(screen.getByRole('button'));
  expect(HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(2);
});
