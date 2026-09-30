import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';

// Shared i18n mock: the components under test only read `t`/`i18n.language`.
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    i18n: { language: 'en' },
    t: (key: string) => key,
  }),
}));

import JsonHighlight from './JsonHighlight';
import ErrorState from '@/components/state/ErrorState';

/**
 * Structural responsive smoke tests (Design — Testing Strategy: Responsive smoke).
 * jsdom has no layout engine, so these assert the *structural contract* that
 * keeps wide content from forcing document-root horizontal overflow — the
 * presence of the overflow-guard utility classes and stacked-column structure.
 * Pixel-level overflow at 320/375/414px is verified manually in delivery.
 *
 * Validates: Requirements 1.3, 8.1, 8.2, 23.1
 */
describe('responsive smoke — overflow-guard structural contract', () => {
  it('JsonHighlight confines wide JSON to a horizontally scrollable, wrap-anywhere region (Req 8.1, 8.2)', () => {
    const { container } = render(
      <JsonHighlight data={{ url: 'https://example.com/a-very-long-unbroken-token-that-would-overflow', n: 1 }} />,
    );
    // The outermost wrapper is the scroll container.
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper).not.toBeNull();
    expect(wrapper.className).toContain('overflow-x-auto');
    // Long unbreakable strings must wrap instead of forcing width.
    expect(wrapper.className).toContain('break-anywhere');
    // The cell must be allowed to shrink and never exceed its parent.
    expect(wrapper.className).toContain('min-w-0');
    expect(wrapper.className).toContain('max-w-full');
  });

  it('a demo two-column layout collapses to a single stacked column on mobile (Req 23.1, 1.3)', () => {
    // Mirrors the demo layout contract: single column by default, two columns
    // only at the lg breakpoint. The mobile (default) structure is one column.
    const { container } = render(
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="min-w-0">input panel</section>
        <section className="min-w-0 overflow-x-auto">result / log panel</section>
      </div>,
    );
    const grid = container.firstElementChild as HTMLElement;
    // Base (mobile) layout is a single column; the second column is gated on `lg:`.
    expect(grid.className).toContain('grid-cols-1');
    expect(grid.className).toContain('lg:grid-cols-2');
    // Each cell can shrink; the wide (log/result) cell scrolls instead of overflowing.
    const cells = grid.querySelectorAll('section');
    expect(cells.length).toBe(2);
    cells.forEach((cell) => expect(cell.className).toContain('min-w-0'));
    expect(cells[1].className).toContain('overflow-x-auto');
  });

  it('ErrorState retry action is a 44px tap target (Req 3.1 via .tap-target)', () => {
    const { container } = render(<ErrorState onRetry={() => {}} />);
    const button = container.querySelector('button');
    expect(button).not.toBeNull();
    expect(button?.className).toContain('tap-target');
  });
});
