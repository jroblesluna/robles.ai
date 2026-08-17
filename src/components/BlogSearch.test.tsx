import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock wouter
const mockSetLocation = vi.fn();
vi.mock('wouter', () => ({
  useLocation: () => ['/', mockSetLocation],
}));

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    i18n: { language: 'en' },
    t: (key: string) => key,
  }),
}));

// Mock useSearch hook
const mockUseSearch = vi.fn();
vi.mock('@/hooks/useSearch', () => ({
  useSearch: () => mockUseSearch(),
}));

import BlogSearch from './BlogSearch';

function defaultSearchState(overrides = {}) {
  return {
    query: '',
    setQuery: vi.fn(),
    results: [],
    total: 0,
    isLoading: false,
    isSearchActive: false,
    clearSearch: vi.fn(),
    ...overrides,
  };
}

describe('BlogSearch — Property 15: Search result cards render required fields', () => {
  /**
   * **Validates: Requirements 5.9**
   *
   * Property 15: Search result cards render required fields
   * For any search result returned from the API, the rendered search result card
   * SHALL display the post title, a highlight snippet with visible <mark> tag
   * emphasis, and the post date.
   */

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the title of each search result', () => {
    mockUseSearch.mockReturnValue(
      defaultSearchState({
        query: 'ai',
        isSearchActive: true,
        results: [
          {
            slug: '2025-06-15-10-00-00-advances-in-ai',
            language: 'en',
            title: 'Advances in Artificial Intelligence',
            excerpt: 'A deep look at recent AI developments.',
            snippet: 'Recent <mark>AI</mark> developments have reshaped...',
            score: -5.2,
          },
          {
            slug: '2025-06-14-08-30-00-machine-learning-trends',
            language: 'en',
            title: 'Machine Learning Trends 2025',
            excerpt: 'ML is evolving fast.',
            snippet: 'The field of <mark>AI</mark> and ML continues to grow...',
            score: -3.1,
          },
        ],
        total: 2,
      })
    );

    render(<BlogSearch onSearchActive={vi.fn()} />);

    expect(screen.getByText('Advances in Artificial Intelligence')).toBeInTheDocument();
    expect(screen.getByText('Machine Learning Trends 2025')).toBeInTheDocument();
  });

  it('renders highlighted snippets with <mark> tags rendered as DOM elements', () => {
    mockUseSearch.mockReturnValue(
      defaultSearchState({
        query: 'robotics',
        isSearchActive: true,
        results: [
          {
            slug: '2025-05-20-12-00-00-robotics-revolution',
            language: 'en',
            title: 'The Robotics Revolution',
            excerpt: 'Robots are changing manufacturing.',
            snippet: 'The <mark>robotics</mark> industry is booming with new <mark>robotics</mark> applications...',
            score: -4.0,
          },
        ],
        total: 1,
      })
    );

    render(<BlogSearch onSearchActive={vi.fn()} />);

    // Verify mark elements are rendered in the DOM
    const markElements = document.querySelectorAll('mark');
    expect(markElements.length).toBeGreaterThanOrEqual(1);
    // Verify the highlighted text content
    const markTexts = Array.from(markElements).map((el) => el.textContent);
    expect(markTexts).toContain('robotics');
  });

  it('renders the post date extracted from the slug', () => {
    mockUseSearch.mockReturnValue(
      defaultSearchState({
        query: 'edge computing',
        isSearchActive: true,
        results: [
          {
            slug: '2025-03-28-14-30-00-edge-computing-advances',
            language: 'en',
            title: 'Edge Computing Advances',
            excerpt: 'Edge is the future.',
            snippet: '<mark>Edge</mark> <mark>computing</mark> is growing rapidly...',
            score: -6.0,
          },
        ],
        total: 1,
      })
    );

    render(<BlogSearch onSearchActive={vi.fn()} />);

    // The date is formatted from the slug: 2025-03-28T14:30:00Z
    // In en-US format it would be something like "March 28, 2025 at 02:30 PM ..."
    // We check that year, month, and day fragments are present
    const dateText = screen.getByText(/March/);
    expect(dateText).toBeInTheDocument();
    expect(dateText.textContent).toContain('28');
    expect(dateText.textContent).toContain('2025');
  });

  it('renders all three required fields (title, snippet, date) together on each card', () => {
    const result = {
      slug: '2025-01-10-09-00-00-deep-learning-intro',
      language: 'en' as const,
      title: 'Introduction to Deep Learning',
      excerpt: 'DL basics explained.',
      snippet: '<mark>Deep</mark> learning models use neural networks...',
      score: -2.5,
    };

    mockUseSearch.mockReturnValue(
      defaultSearchState({
        query: 'deep learning',
        isSearchActive: true,
        results: [result],
        total: 1,
      })
    );

    render(<BlogSearch onSearchActive={vi.fn()} />);

    // Title is rendered
    expect(screen.getByText('Introduction to Deep Learning')).toBeInTheDocument();

    // Snippet is rendered with mark tag
    const markElements = document.querySelectorAll('mark');
    expect(markElements.length).toBeGreaterThanOrEqual(1);
    expect(markElements[0].textContent).toBe('Deep');

    // Date is rendered (January 10, 2025 in en-US)
    const dateText = screen.getByText(/January/);
    expect(dateText).toBeInTheDocument();
    expect(dateText.textContent).toContain('10');
    expect(dateText.textContent).toContain('2025');
  });

  it('does not render result cards when search is not active', () => {
    mockUseSearch.mockReturnValue(defaultSearchState());

    render(<BlogSearch onSearchActive={vi.fn()} />);

    // No cards should be rendered
    expect(document.querySelectorAll('mark').length).toBe(0);
    expect(screen.queryByRole('button', { name: /Introduction/ })).not.toBeInTheDocument();
  });

  it('renders result cards as clickable elements', () => {
    mockUseSearch.mockReturnValue(
      defaultSearchState({
        query: 'neural',
        isSearchActive: true,
        results: [
          {
            slug: '2025-04-01-06-00-00-neural-networks-explained',
            language: 'en',
            title: 'Neural Networks Explained',
            excerpt: 'Understanding neural nets.',
            snippet: '<mark>Neural</mark> networks are the foundation...',
            score: -3.8,
          },
        ],
        total: 1,
      })
    );

    render(<BlogSearch onSearchActive={vi.fn()} />);

    // Each result card should be a button element (clickable)
    const card = screen.getByRole('button', { name: /Neural Networks Explained/ });
    expect(card).toBeInTheDocument();
  });
});
