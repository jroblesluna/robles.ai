// Integration test for the blog in-page modal viewer (ux-overhaul).
//
// Unlike the isolated unit tests (useBlogModalRouting / BlogModal / blogModal),
// this test renders the REAL BlogList inside the REAL wouter <Switch> with both
// the `/blog` and `/blog/:slug` routes, exactly like App.tsx. It reproduces the
// browser bug: a plain left-click on a card must open the in-page modal and must
// NOT swap wouter to the full BlogPost page.
//
// Requirements: 11.1, 12.1, 12.2 (click opens modal in-page, URL updates, list
// stays mounted). Design: Area 2 — 2a/2b.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { Router, Switch, Route } from 'wouter';
import BlogRoute from './BlogRoute';

// Return i18n keys verbatim so modal aria-labels are deterministic.
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (k: string) => k,
    i18n: { language: 'en' },
  }),
}));

vi.mock('@/hooks/useReducedMotion', () => ({
  useReducedMotion: () => false,
}));

// Replace the heavy full BlogPost page with a sentinel: if BlogRoute ever
// renders the full page (instead of keeping the list + modal), this appears —
// which is precisely the bug.
vi.mock('./BlogPost', () => ({
  default: () => <div data-testid="full-blog-post">FULL BLOG POST PAGE</div>,
}));

const EDITORS = [
  { id: 1, name: 'Ada Lovelace', signature: 'AL', specialty: 'Deep Learning', colorPalette: ['#a855f7'] },
];

const POSTS = [
  {
    slug: '2025-03-28-00-00-00-first-post',
    date: '2025-03-28',
    editorId: 1,
    translations: {
      en: { title: 'First Post', excerpt: 'First excerpt', content: [{ heading: 'H', body: 'Body one.' }] },
      es: { title: 'Primer Post', excerpt: 'Primer resumen', content: [{ heading: 'H', body: 'Cuerpo uno.' }] },
    },
  },
  {
    slug: '2025-03-29-00-00-00-second-post',
    date: '2025-03-29',
    editorId: 1,
    translations: {
      en: { title: 'Second Post', excerpt: 'Second excerpt', content: [{ heading: 'H', body: 'Body two.' }] },
      es: { title: 'Segundo Post', excerpt: 'Segundo resumen', content: [{ heading: 'H', body: 'Cuerpo dos.' }] },
    },
  },
];

function mockFetch() {
  return vi.fn((input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input.toString();
    if (url.startsWith('/api/editors')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ editors: EDITORS }) } as Response);
    }
    if (url.startsWith('/api/blog?')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ posts: POSTS, total: POSTS.length }),
      } as Response);
    }
    if (url.startsWith('/api/blog/')) {
      // Full article fetch by the modal.
      const slug = url.replace('/api/blog/', '');
      const match = POSTS.find((p) => p.slug === slug) ?? POSTS[0];
      return Promise.resolve({ ok: true, json: () => Promise.resolve(match) } as Response);
    }
    return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}) } as Response);
  });
}

function renderApp() {
  // Mirror App.tsx: both routes present, default (browser) wouter location hook
  // so the real history pushState patch applies.
  return render(
    <Router>
      <Switch>
        <Route path="/blog/:slug?" component={BlogRoute} />
      </Switch>
    </Router>,
  );
}

describe('BlogList ↔ wouter integration (in-page modal)', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/blog');
    vi.stubGlobal('fetch', mockFetch());
  });

  afterEach(() => {
    // Unmount everything (runs BlogModal's cleanup effects) BEFORE resetting
    // shared globals, so this test leaves the jsdom environment pristine for
    // the next file: no open modal, body overflow restored, URL back on /blog.
    cleanup();
    document.body.style.overflow = '';
    window.history.pushState({}, '', '/blog');
    vi.unstubAllGlobals();
  });

  it('plain left-click on a card opens the in-page modal and does NOT navigate to BlogPost', async () => {
    const { unmount } = renderApp();

    // Wait for the list to render its cards.
    const card = await screen.findByText('First Post');
    const anchor = card.closest('a') as HTMLAnchorElement;
    expect(anchor).toBeTruthy();

    // Plain left-click (button 0, no modifiers).
    fireEvent.click(anchor, { button: 0 });

    // The modal dialog must appear in-page...
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toBeInTheDocument();

    // ...and wouter must NOT have swapped to the full BlogPost page.
    expect(screen.queryByTestId('full-blog-post')).not.toBeInTheDocument();

    // The URL still updates for deep-linking/share.
    await waitFor(() => expect(window.location.pathname).toBe('/blog/2025-03-28-00-00-00-first-post'));

    // Explicitly tear down so the open modal's effects (body-scroll lock,
    // window listeners, pending rAF) don't leak into sibling test files.
    unmount();
  });

  it('cold load of /blog/:slug still renders the full BlogPost route', () => {
    window.history.pushState({}, '', '/blog/2025-03-28-00-00-00-first-post');
    renderApp();
    expect(screen.getByTestId('full-blog-post')).toBeInTheDocument();
  });
});
