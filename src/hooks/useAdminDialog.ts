import { useEffect, useRef } from 'react';

/** Keyboard containment and focus restoration for the existing admin overlays. */
export function useAdminDialog(open: boolean, onClose: () => void) {
  const panel = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  useEffect(() => { close.current = onClose; }, [onClose]);
  useEffect(() => {
    if (!open || !panel.current) return;
    const previous = document.activeElement as HTMLElement | null;
    const element = panel.current;
    const scrollContainer = element.closest('main');
    const overflow = scrollContainer?.style.overflow ?? '';
    if (scrollContainer) scrollContainer.style.overflow = 'hidden';
    const controls = () => Array.from(element.querySelectorAll<HTMLElement>('button:not([disabled]),a[href],input:not([disabled]),textarea:not([disabled]),select:not([disabled]),[tabindex="0"]')).filter(node => node.getClientRects().length);
    (controls()[0] ?? element).focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); close.current(); }
      if (event.key !== 'Tab') return;
      const items = controls(), first = items[0], last = items[items.length - 1];
      if (!items.length) { event.preventDefault(); element.focus(); }
      else if (!element.contains(document.activeElement)) { event.preventDefault(); first.focus(); }
      else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', keydown);
    return () => {
      document.removeEventListener('keydown', keydown);
      if (scrollContainer) scrollContainer.style.overflow = overflow;
      if (previous?.isConnected) previous.focus();
    };
  }, [open]);
  return panel;
}
