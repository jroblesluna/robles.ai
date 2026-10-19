import { useState } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useAdminDialog } from '../useAdminDialog';
afterEach(cleanup);
it('closes with Escape and restores the opener and scrolling', () => {
  function Fixture() {
    const [open, setOpen] = useState(false);
    const panel = useAdminDialog(open, () => setOpen(false));
    return <main><button onClick={() => setOpen(true)}>Open editor</button>{open && <div ref={panel} role="dialog" tabIndex={-1}><button onClick={() => setOpen(false)}>Close editor</button></div>}</main>;
  }
  render(<Fixture />);
  const opener = screen.getByText('Open editor'); opener.focus(); fireEvent.click(opener);
  expect(document.querySelector('main')?.style.overflow).toBe('hidden');
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(opener).toHaveFocus();
  expect(document.querySelector('main')?.style.overflow).toBe('');
});
