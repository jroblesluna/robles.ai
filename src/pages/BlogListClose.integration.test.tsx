// Integration test for CLOSING the blog in-page modal (ux-overhaul bug).
//
// Companion to BlogList.integration.test.tsx. That one proves OPENING the modal
// keeps the list mounted. This one proves CLOSING the modal (and any transient
// re-render of the route during that close) does NOT re-mount BlogList nor
// re-fetch `/api/blog` — i.e. no skeleton flash / card reload.
//
// ROOT CAUSE reproduced here: BlogRoute decided list-vs-full-post by reading a
// transient `window.history.state.blogModal` marker during render. There is a
// tick during the close transition where the URL is still `/blog/:slug` but the
// `blogModal` marker is already gone. In that tick the old BlogRoute returns
// <BlogPost/>, which UNMOUNTS the live <BlogList/> (and then the next render
// mounts a fresh one), re-running its `/api/blog` fetch effect → the flash.
//
// Requirements: 12.2, 12.3 (list stays mounted across the /blog ↔ /blog/:slug
// soft navigation and on close). Design: Area 2 — 2a/2b.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react';
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
// renders the full page during the close transition, this appears — the bug.
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

// Count /api/blog LIST fetches so we can assert closing adds zero new ones.
// Each BlogList MOUNT runs the list fetch effect once, so this count also
// doubles as a BlogList-remount detector.
let blogListFetchCount = 0;

function mockFetch() {
  blogListFetchCount = 0;
  return vi.fn((input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input.toString();
    if (url.startsWith('/api/editors')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ editors: EDITORS }) } as Response);
    }
    if (url.startsWith('/api/blog?')) {
      blogListFetchCount += 1;
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ posts: POSTS, total: POSTS.length }),
      } as Response);
    }
    if (url.startsWith('/api/blog/')) {
      const slug = url.replace('/api/blog/', '');
      const match = POSTS.find((p) => p.slug === slug) ?? POSTS[0];
      return Promise.resolve({ ok: true, json: () => Promise.resolve(match) } as Response);
    }
    return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}) } as Response);
  });
}

function renderApp() {
  return render(
    <Router>
      <Switch>
        <Route path="/blog/:slug?" component={BlogRoute} />
      </Switch>
    </Router>,
  );
}

async function openModal() {
  const card = await screen.findByText('First Post');
  const anchor = card.closest('a') as HTMLAnchorElement;
  fireEvent.click(anchor, { button: 0 });
  await screen.findByRole('dialog');
  await waitFor(() =>
    expect(window.location.pathname).toBe('/blog/2025-03-28-00-00-00-first-post'),
  );
}

describe('BlogList ↔ wouter integration (closing the in-page modal)', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/blog');
    vi.stubGlobal('fetch', mockFetch());
  });

  afterEach(() => {
    cleanup();
    document.body.style.overflow = '';
    window.history.pushState({}, '', '/blog');
    vi.unstubAllGlobals();
  });

  it('a soft route change to /blog/:slug without the modal marker must NOT swap to BlogPost once the list is mounted', async () => {
    const { unmount } = renderApp();
    await openModal();

    const fetchesBeforeClose = blogListFetchCount;

    // Reproduce the fragile tick: a route re-render that lands on a `/blog/:slug`
    // pathname while the `blogModal` history-state marker is absent — the exact
    // transient the browser passes through while the in-page modal closes. The
    // OLD BlogRoute reads the markerless `history.state` DURING render and
    // returns <BlogPost/>, unmounting the live <BlogList/> (then re-mounting it
    // → the /api/blog refetch / skeleton flash). The stable fix keeps BlogList
    // mounted because the cold-load decision was frozen at first mount.
    act(() => {
      // pushState fires wouter's patched event → wouter re-renders BlogRoute at
      // the new slug pathname, with state=null (no blogModal marker).
      window.history.pushState(null, '', '/blog/2025-03-29-00-00-00-second-post');
    });

    // The full BlogPost sentinel must never appear: BlogList must stay mounted.
    expect(screen.queryByTestId('full-blog-post')).not.toBeInTheDocument();

    // And BlogList must not have re-mounted / re-fetched the list.
    await new Promise((r) => setTimeout(r, 20));
    expect(blogListFetchCount).toBe(fetchesBeforeClose);

    unmount();
  });

  it('closing with Escape returns to /blog without re-fetching /api/blog', async () => {
    const { unmount } = renderApp();
    await openModal();

    const fetchesBeforeClose = blogListFetchCount;

    fireEvent.keyDown(window, { key: 'Escape' });

    // (a) The modal closes.
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    // (b) The URL returns to /blog.
    await waitFor(() => expect(window.location.pathname).toBe('/blog'));
    // The list is still there.
    expect(screen.getByText('First Post')).toBeInTheDocument();
    // (d) The full BlogPost sentinel never appeared.
    expect(screen.queryByTestId('full-blog-post')).not.toBeInTheDocument();

    await new Promise((r) => setTimeout(r, 20));
    // (c) Closing added ZERO new /api/blog list fetches (no skeleton flash).
    expect(blogListFetchCount).toBe(fetchesBeforeClose);

    unmount();
  });

  it('closing with the X control returns to /blog without re-fetching /api/blog', async () => {
    const { unmount } = renderApp();
    await openModal();

    const fetchesBeforeClose = blogListFetchCount;

    // The close control carries aria-label key `blogModal.close` (keys verbatim).
    const closeBtn = screen.getByLabelText('blogModal.close');
    fireEvent.click(closeBtn);

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await waitFor(() => expect(window.location.pathname).toBe('/blog'));
    expect(screen.getByText('First Post')).toBeInTheDocument();
    expect(screen.queryByTestId('full-blog-post')).not.toBeInTheDocument();

    await new Promise((r) => setTimeout(r, 20));
    expect(blogListFetchCount).toBe(fetchesBeforeClose);

    unmount();
  });
});
