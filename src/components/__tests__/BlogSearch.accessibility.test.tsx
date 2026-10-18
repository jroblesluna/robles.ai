import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import BlogSearch from '../BlogSearch';
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en' } }) }));
vi.mock('@/hooks/useSearch', () => ({ useSearch: () => ({ query: 'RAG', setQuery: vi.fn(), results: [{ slug: '2026-10-16-00-00-00-rag', language: 'en', title: 'RAG article', snippet: 'retrieval', excerpt: '', score: 1 }], isLoading: false, isLoadingMore: false, isSearchActive: true, hasMore: false, loadMore: vi.fn(), clearSearch: vi.fn() }) }));
afterEach(cleanup);
it('names the search field and provides actual links for search results', () => {
  render(<BlogSearch onSearchActive={vi.fn()} />);
  expect(screen.getByRole('searchbox', { name: 'blogSearch.label' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /RAG article/ })).toHaveAttribute('href', '/blog/2026-10-16-00-00-00-rag');
});
