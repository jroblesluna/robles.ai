import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import AdminDominicalDetail from '../AdminDominicalDetail';
vi.mock('wouter', () => ({ useLocation: () => ['/admin/dominical/12', vi.fn()], useRoute: () => [true, { id: '12' }] }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@tanstack/react-query', () => ({ useQueryClient: () => ({ invalidateQueries: vi.fn() }) }));
vi.mock('@/components/admin/CarouselPreview', () => ({ default: () => null }));
vi.mock('@/components/admin/VideoGenerator', () => ({ default: () => null }));
vi.mock('@/components/admin/SlideEditor', () => ({ default: () => null }));
vi.mock('@/components/admin/PlatformPublishStatus', () => ({ default: () => null }));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
it('saves newly checked news starting from zero and restores both after reloading', async () => {
  const row = { id: 12, week_start: '2026-10-11', week_end: '2026-10-17', status: 'edited', last_edited_at: '2026-10-18T12:00:00Z', selected_news: [] as Array<{ slug: string }>, all_news: [
    { slug: 'first', titleEn: 'First article', titleEs: 'Primera noticia', date: '2026-10-17', categories: [] },
    { slug: 'second', titleEn: 'Second article', titleEs: 'Segunda noticia', date: '2026-10-17', categories: [] },
  ] };
  let payload: any;
  const fetchMock = vi.fn(async (_url: string, options?: any) => {
    if (options?.method === 'PUT') { payload = JSON.parse(options.body); row.selected_news = payload.selected_slugs.map((slug: string) => ({ slug })); }
    return { ok: true, json: async () => structuredClone(row) };
  });
  vi.stubGlobal('fetch', fetchMock);
  const view = render(<AdminDominicalDetail />);
  fireEvent.click(await screen.findByRole('checkbox', { name: 'Select Primera noticia' }));
  fireEvent.click(screen.getByRole('checkbox', { name: 'Select Segunda noticia' }));
  fireEvent.click(screen.getByRole('button', { name: /^Save$/ }));
  await waitFor(() => expect(payload?.selected_slugs).toEqual(['first', 'second']));
  await screen.findByRole('checkbox', { name: 'Select Primera noticia' });
  view.unmount();
  render(<AdminDominicalDetail />);
  expect(await screen.findByRole('checkbox', { name: 'Select Primera noticia' })).toBeChecked();
  expect(screen.getByRole('checkbox', { name: 'Select Segunda noticia' })).toBeChecked();
  expect(screen.queryByText(/Invalid Date/)).not.toBeInTheDocument();
});
