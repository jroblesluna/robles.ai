import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import Courses from '../Courses';
import en from '@/i18n/locales/en/translation.json';
import es from '@/i18n/locales/es/translation.json';
import { COURSE_IDS, courseWorkload } from '@shared/courseCatalog';
const state = vi.hoisted(() => ({ language: 'en' }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ i18n: { language: state.language }, t: (key: string, options: Record<string, unknown> = {}) => {
  const locale = state.language === 'es' ? es : en;
  const value = key.split('.').reduce<any>((item, part) => item?.[part], locale) ?? key;
  return typeof value === 'string' ? value.replace(/\{\{(\w+)\}\}/g, (_: string, name: string) => String(options[name] ?? '')) : value;
} }) }));
beforeEach(() => {
  state.language = 'en'; vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true, nextStartDate: '2027-01-04' }) }));
  vi.stubGlobal('IntersectionObserver', class { observe() {} unobserve() {} disconnect() {} });
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  vi.stubGlobal('PointerEvent', class extends MouseEvent { pointerType: string; constructor(type: string, options: PointerEventInit = {}) { super(type, options); this.pointerType = options.pointerType || 'mouse'; } });
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
const open = (index = 0) => {
  render(<Courses />); const button = screen.getByRole('button', { name: `${en.courses.viewCourse}: ${en.courses.items[index].title}` });
  button.focus(); fireEvent.click(button); return { button, dialog: screen.getByRole('dialog', { name: en.courses.items[index].title }) };
};
it.each(COURSE_IDS.map((id, index) => [id, index] as const))('opens full details for %s with workload and course-specific collapsible content', (id, index) => {
  const { dialog } = open(index); const course = en.courses.items[index]; const workload = courseWorkload(id);
  expect(within(dialog).getByText(en.courses.modal.noSeats)).toBeInTheDocument();
  expect(within(dialog).getByText(`${workload.totalHours} h`, { exact: true })).toBeInTheDocument();
  expect(within(dialog).getByRole('region', { name: en.courses.modal.certificateTitle })).toBeInTheDocument();
  expect(within(dialog).getByText(en.courses.modal.sampleMark)).toBeInTheDocument();
  const first = course.modules[0]; const content = within(dialog).getByText(first.description);
  expect(content).not.toBeVisible(); fireEvent.click(within(dialog).getByText(first.title, { exact: true })); expect(content).toBeVisible();
});
it('closes with Escape, restores focus and unlocks document scrolling', () => {
  const { button } = open(); expect(document.documentElement.style.overflow).toBe('hidden');
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument(); expect(document.documentElement.style.overflow).not.toBe('hidden'); expect(button).toHaveFocus();
});
it('opens on intentional mouse hover but not touch, and does not reopen immediately after closing', () => {
  vi.useFakeTimers(); render(<Courses />); const button = screen.getAllByRole('button', { name: /View course:/ })[0];
  fireEvent.pointerEnter(button, { pointerType: 'touch' }); act(() => vi.advanceTimersByTime(550)); expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  fireEvent.pointerEnter(button, { pointerType: 'mouse' }); act(() => vi.advanceTimersByTime(499)); expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  act(() => vi.advanceTimersByTime(1)); expect(screen.getByRole('dialog')).toBeInTheDocument();
  fireEvent.keyDown(document, { key: 'Escape' }); fireEvent.pointerEnter(button, { pointerType: 'mouse' }); act(() => vi.advanceTimersByTime(600)); expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});
it('sends the selected course and email and confirms only after API success', async () => {
  let complete!: (value: any) => void;
  vi.mocked(fetch).mockReturnValue(new Promise(resolve => { complete = resolve; }));
  const { dialog } = open(2);
  fireEvent.change(within(dialog).getByRole('textbox', { name: en.courses.modal.notifyTitle }), { target: { value: 'visitor@example.org' } });
  fireEvent.submit(within(dialog).getByRole('form', { name: en.courses.modal.notifyTitle }));
  expect(within(dialog).queryByRole('status')).not.toBeInTheDocument();
  expect(JSON.parse(String(vi.mocked(fetch).mock.calls[0][1]?.body))).toEqual({ email: 'visitor@example.org', courseId: 'hugging-face-transformers', locale: 'en', website: '' });
  complete({ ok: true, json: async () => ({ success: true, nextStartDate: '2027-01-04' }) });
  await within(dialog).findByRole('status'); expect(within(dialog).getByText(en.courses.modal.notifySuccess)).toBeInTheDocument();
  expect(within(dialog).getByRole('button', { name: en.courses.modal.requestReceived })).toBeDisabled();
});
it.each(['network', 'rejected'])('keeps the email and shows an inline retry message on %s failure', async kind => {
  if (kind === 'network') vi.mocked(fetch).mockRejectedValue(new Error('offline')); else vi.mocked(fetch).mockResolvedValue({ ok: false, json: async () => ({ success: false }) } as Response);
  const { dialog } = open(); const input = within(dialog).getByRole('textbox', { name: en.courses.modal.notifyTitle });
  fireEvent.change(input, { target: { value: 'visitor@example.org' } }); fireEvent.submit(within(dialog).getByRole('form', { name: en.courses.modal.notifyTitle }));
  await within(dialog).findByRole('alert'); expect(input).toHaveValue('visitor@example.org');
  expect(within(dialog).queryByText(en.courses.modal.notifySuccess)).not.toBeInTheDocument();
});
it('provides equivalent Spanish details and notification form', () => {
  state.language = 'es'; render(<Courses />); fireEvent.click(screen.getByRole('button', { name: `${es.courses.viewCourse}: ${es.courses.items[4].title}` }));
  const dialog = screen.getByRole('dialog', { name: es.courses.items[4].title });
  expect(within(dialog).getByText('Curso sin cupo')).toBeInTheDocument();
  expect(within(dialog).getByRole('textbox', { name: es.courses.modal.notifyTitle })).toBeInTheDocument();
  expect(within(dialog).getByText('48 h')).toBeInTheDocument();
});
it('keeps course ids, duration and curriculum aligned between languages', () => {
  for (let index = 0; index < COURSE_IDS.length; index++) {
    const a = en.courses.items[index], b = es.courses.items[index];
    expect(a.id).toBe(COURSE_IDS[index]); expect(b.id).toBe(a.id);
    expect(parseInt(a.duration)).toBe(courseWorkload(COURSE_IDS[index]).weeks);
    expect(parseInt(b.duration)).toBe(parseInt(a.duration));
    expect(a.modules.length).toBeGreaterThanOrEqual(6); expect(b.modules).toHaveLength(a.modules.length);
  }
  expect(Object.keys(es.courses.modal).sort()).toEqual(Object.keys(en.courses.modal).sort());
});
