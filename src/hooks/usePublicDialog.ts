import { useEffect, useRef } from 'react';

/** Lock the document (including touch scroll) and contain keyboard focus. */
export function usePublicDialog(onClose: () => void) {
  const panel = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  useEffect(() => { close.current = onClose; }, [onClose]);
  useEffect(() => {
    const element = panel.current;
    if (!element) return;
    const previous = document.activeElement as HTMLElement | null;
    const root = document.documentElement, body = document.body;
    const y = window.scrollY, x = window.scrollX;
    const rootOverflow = root.style.overflow;
    const properties = ['position', 'top', 'left', 'width', 'overflow', 'paddingRight'] as const;
    const saved = properties.map(property => body.style[property]);
    const gap = window.innerWidth - root.clientWidth;
    if (gap > 0) body.style.paddingRight = `${gap + Number.parseFloat(getComputedStyle(body).paddingRight || '0')}px`;
    root.style.overflow = 'hidden';
    Object.assign(body.style, { position: 'fixed', top: `${-y}px`, left: `${-x}px`, width: '100%', overflow: 'hidden' });
    const controls = () => Array.from(element.querySelectorAll<HTMLElement>('button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),video[controls],iframe,[tabindex="0"]')).filter(node => node.getClientRects().length);
    (controls()[0] ?? element).focus({ preventScroll: true });
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); close.current(); return; }
      if (event.key !== 'Tab') return;
      const items = controls(), first = items[0], last = items[items.length - 1];
      if (!first) { event.preventDefault(); element.focus({ preventScroll: true }); }
      else if (!element.contains(document.activeElement)) { event.preventDefault(); first.focus(); }
      else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', keydown);
    return () => {
      document.removeEventListener('keydown', keydown);
      properties.forEach((property, index) => { body.style[property] = saved[index]; });
      root.style.overflow = rootOverflow;
      window.scrollTo({ left: x, top: y, behavior: 'instant' });
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, []);
  return panel;
}
