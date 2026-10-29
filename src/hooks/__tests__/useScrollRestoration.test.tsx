import { render, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { useScrollRestoration } from '../useScrollRestoration';

function Page() {
  useScrollRestoration('/');
  return <section id="case-studies" />;
}

afterEach(() => window.history.replaceState(null, '', '/'));

it('glides to the #hash section instead of jumping to the top when arriving from another page', async () => {
  window.history.replaceState(null, '', '/#case-studies');
  const scrollIntoView = vi.fn();
  Element.prototype.scrollIntoView = scrollIntoView;
  window.scrollTo = vi.fn() as typeof window.scrollTo;

  render(<Page />);

  // Waits for the layout to settle first, then a single smooth scroll.
  await waitFor(() => expect(scrollIntoView).toHaveBeenCalledWith({ block: 'start', behavior: 'smooth' }));
  expect(scrollIntoView).toHaveBeenCalledTimes(1);
  expect(window.scrollTo).not.toHaveBeenCalledWith(expect.objectContaining({ top: 0 }));
});
