import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import Contact from '../Contact';
import en from '@/i18n/locales/en/translation.json';
const mocks = vi.hoisted(() => ({ api: vi.fn(), lead: vi.fn(), toast: vi.fn() }));
vi.mock('@/lib/queryClient', () => ({ apiRequest: mocks.api }));
vi.mock('@/lib/analytics', () => ({ trackContactLead: mocks.lead }));
vi.mock('@/hooks/use-toast', () => ({ toast: mocks.toast }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({
  t: (key: string) => key.split('.').reduce<any>((value, part) => value?.[part], en) ?? key,
}) }));
beforeEach(() => {
  vi.clearAllMocks();
  Element.prototype.scrollIntoView = vi.fn();
  vi.stubGlobal('IntersectionObserver', class {
    observe() {}
    unobserve() {}
    disconnect() {}
  });
  vi.stubGlobal('ResizeObserver', class {
    observe() {}
    unobserve() {}
    disconnect() {}
  });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
function fillInquiry() {
  render(<Contact />);
  const fields = screen.getAllByRole('textbox');
  fireEvent.change(fields[0], { target: { value: 'QA Visitor' } });
  fireEvent.change(fields[1], { target: { value: 'visitor@example.org' } });
  fireEvent.change(fields[3], { target: { value: 'Please discuss an AI implementation.' } });
  return fields;
}
it('emits exactly one lead only after the server confirms success', async () => {
  let complete!: (value: unknown) => void;
  mocks.api.mockReturnValue(new Promise(resolve => { complete = resolve; }));
  const fields = fillInquiry();
  fireEvent.submit(fields[0].closest('form')!);
  await waitFor(() => expect(mocks.api).toHaveBeenCalledOnce());
  expect(mocks.lead).not.toHaveBeenCalled();
  complete({ json: async () => ({ success: true }) });
  await waitFor(() => expect(mocks.lead).toHaveBeenCalledOnce());
  expect(mocks.lead).toHaveBeenCalledWith();
  expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'success' }));
  await waitFor(() => expect(fields[0]).toHaveValue(''));
});
it('does not call the API or count a lead for invalid input', async () => {
  render(<Contact />);
  fireEvent.submit(screen.getAllByRole('textbox')[0].closest('form')!);
  await waitFor(() => expect(screen.getAllByRole('textbox')[0]).toHaveAttribute('aria-invalid', 'true'));
  expect(mocks.api).not.toHaveBeenCalled();
  expect(mocks.lead).not.toHaveBeenCalled();
});
it.each(['network', 'rejected', 'invalid-json'])('does not count a lead on %s failure', async failure => {
  if (failure === 'network') mocks.api.mockRejectedValue(new Error('Unavailable'));
  else mocks.api.mockResolvedValue({ json: async () => {
    if (failure === 'invalid-json') throw new Error('Invalid response');
    return { success: false };
  } });
  const fields = fillInquiry();
  fireEvent.submit(fields[0].closest('form')!);
  await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive' })));
  expect(mocks.lead).not.toHaveBeenCalled();
  expect(fields[0]).toHaveValue('QA Visitor');
});
it('accepts a goal without a message and folds the goal into subject and message', async () => {
  mocks.api.mockResolvedValue({ json: async () => ({ success: true }) });
  render(<Contact />);
  const fields = screen.getAllByRole('textbox');
  fireEvent.change(fields[0], { target: { value: 'QA Visitor' } });
  fireEvent.change(fields[1], { target: { value: 'visitor@example.org' } });
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'documents' } });
  fireEvent.submit(fields[0].closest('form')!);
  await waitFor(() => expect(mocks.api).toHaveBeenCalledOnce());
  const payload = mocks.api.mock.calls[0][2];
  expect(payload.subject).toBe('Website Inquiry — Documents & data entry');
  expect(payload.message).toBe('Interested in: Documents & data entry');
  await waitFor(() => expect(mocks.lead).toHaveBeenCalledOnce());
});
it('asks for a goal or a message when both are empty', async () => {
  render(<Contact />);
  const fields = screen.getAllByRole('textbox');
  fireEvent.change(fields[0], { target: { value: 'QA Visitor' } });
  fireEvent.change(fields[1], { target: { value: 'visitor@example.org' } });
  fireEvent.submit(fields[0].closest('form')!);
  await waitFor(() => expect(screen.getByText(/Choose an option or write a short message/)).toBeInTheDocument());
  expect(mocks.api).not.toHaveBeenCalled();
});
