import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { BlogModal, type BlogModalEditor, type FullPost } from './BlogModal';
import type { BlogListPost } from '@/lib/blogModal';

// Stub i18n: return the key so assertions can target aria-labels deterministically.
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (k: string) => k,
    i18n: { language: 'en' },
  }),
}));

// Reduced-motion off by default in tests.
vi.mock('@/hooks/useReducedMotion', () => ({
  useReducedMotion: () => false,
}));

function makePost(slug: string, title: string): BlogListPost {
  return {
    slug,
    editorId: 1,
    translations: {
      en: { title, excerpt: 'excerpt' },
      es: { title: `${title} ES`, excerpt: 'resumen' },
    },
  };
}

// Slugs carry a valid YYYY-MM-DD-HH-MM-SS prefix so the modal can derive a
// display date (as the real list endpoint provides).
const posts: BlogListPost[] = [
  makePost('2025-03-28-10-00-00-first', 'First Post'),
  makePost('2025-03-29-10-00-00-second', 'Second Post'),
  makePost('2025-03-30-10-00-00-third', 'Third Post'),
];

const editors: BlogModalEditor[] = [
  { id: 1, name: 'Ada Editor', signature: 'Thinking in gradients.' },
];

// A fetcher that resolves synchronously-ish with article content + metadata.
function makeFetcher(): (slug: string) => Promise<FullPost | null> {
  return (slug: string) =>
    Promise.resolve({
      slug,
      editorId: 1,
      date: '2025-03-28',
      categories: ['Deep Learning', 'NLP'],
      keywords: ['transformer'],
      translations: {
        en: { slug, title: `EN ${slug}`, excerpt: '', content: [{ heading: 'Section', body: 'Body paragraph one.' }] },
        es: { slug: `${slug}-es`, title: `ES ${slug}`, excerpt: '', content: [{ heading: 'Sección', body: 'Párrafo uno.' }] },
      },
    });
}

function setup(index = 0, overrides: Partial<Parameters<typeof BlogModal>[0]> = {}) {
  const onIndexChange = vi.fn();
  const onClose = vi.fn();
  const utils = render(
    <BlogModal
      posts={posts}
      index={index}
      onIndexChange={onIndexChange}
      onClose={onClose}
      fetchArticle={makeFetcher()}
      editors={editors}
      {...overrides}
    />,
  );
  return { onIndexChange, onClose, ...utils };
}

describe('BlogModal', () => {
  beforeEach(() => {
    document.body.style.overflow = '';
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('opens with the correct post title and article content', async () => {
    setup(1);
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
    // Title from the list post shows immediately; content arrives after fetch.
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Second Post');
    expect(await screen.findByText('Body paragraph one.')).toBeInTheDocument();
  });

  it('is labelled by the article h1', async () => {
    setup(0);
    const dialog = screen.getByRole('dialog');
    const labelledby = dialog.getAttribute('aria-labelledby');
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveAttribute('id', labelledby);
    await screen.findByText('Body paragraph one.'); // flush async fetch
  });

  it('closes on Escape', async () => {
    const { onClose } = setup(0);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
    await screen.findByText('Body paragraph one.');
  });

  it('closes on backdrop click', async () => {
    const { onClose } = setup(0);
    // The backdrop is the outermost element containing the dialog.
    const dialog = screen.getByRole('dialog');
    const backdrop = dialog.parentElement as HTMLElement;
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);
    await screen.findByText('Body paragraph one.');
  });

  it('closes on the Close (X) control', async () => {
    const { onClose } = setup(0);
    fireEvent.click(screen.getByLabelText('blogModal.close'));
    expect(onClose).toHaveBeenCalledTimes(1);
    await screen.findByText('Body paragraph one.');
  });

  it('locks body scroll on open and releases on unmount', () => {
    const { unmount } = setup(0);
    expect(document.body.style.overflow).toBe('hidden');
    unmount();
    expect(document.body.style.overflow).toBe('');
  });

  it('moves focus into the modal on open', async () => {
    setup(0);
    expect(screen.getByRole('dialog')).toHaveFocus();
    await screen.findByText('Body paragraph one.');
  });

  it('disables prev at the first post and next at the last post', async () => {
    const { unmount } = setup(0);
    expect(screen.getByLabelText('blogModal.prev')).toBeDisabled();
    expect(screen.getByLabelText('blogModal.next')).not.toBeDisabled();
    await screen.findByText('Body paragraph one.');
    unmount();

    setup(2);
    expect(screen.getByLabelText('blogModal.prev')).not.toBeDisabled();
    expect(screen.getByLabelText('blogModal.next')).toBeDisabled();
    await screen.findByText('Body paragraph one.');
  });

  it('prev/next call onIndexChange with the adjacent index', async () => {
    const { onIndexChange } = setup(1);
    fireEvent.click(screen.getByLabelText('blogModal.next'));
    expect(onIndexChange).toHaveBeenCalledWith(2);
    fireEvent.click(screen.getByLabelText('blogModal.prev'));
    expect(onIndexChange).toHaveBeenCalledWith(0);
    await screen.findByText('Body paragraph one.');
  });

  it('resets the article scroll to top when the index changes', () => {
    // In the new modal structure the sticky H1 is a sibling of the scroll container,
    // not inside it. The scroll container is the flex-1 overflow-y-auto div.
    // jsdom does not implement scrollTop reads back reliably, so we spy on the
    // setter to confirm the useEffect([index]) applied the reset.
    const fetchArticle = makeFetcher();
    const { rerender } = render(
      <BlogModal posts={posts} index={0} onIndexChange={() => {}} onClose={() => {}} fetchArticle={fetchArticle} />,
    );
    const dialog = screen.getByRole('dialog');
    // The scroll container is the only flex-1 overflow-y-auto element in the dialog.
    const scrollRegion = dialog.querySelector('[class*="overflow-y-auto"]') as HTMLElement;
    expect(scrollRegion).not.toBeNull();

    let resetCalled = false;
    const proto = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollTop');
    const spy = vi.spyOn(scrollRegion, 'scrollTop', 'set').mockImplementation((v) => {
      if (v === 0) resetCalled = true;
      if (proto?.set) proto.set.call(scrollRegion, v);
    });

    rerender(
      <BlogModal posts={posts} index={1} onIndexChange={() => {}} onClose={() => {}} fetchArticle={fetchArticle} />,
    );
    expect(resetCalled).toBe(true);
    spy.mockRestore();
  });

  it('open-in-new-tab anchor points at /blog/:slug with target/rel', async () => {
    setup(0);
    const anchor = screen.getByLabelText('blogModal.openInNewTab');
    expect(anchor).toHaveAttribute('href', '/blog/2025-03-28-10-00-00-first');
    expect(anchor).toHaveAttribute('target', '_blank');
    expect(anchor).toHaveAttribute('rel', 'noopener');
    await screen.findByText('Body paragraph one.');
  });

  it('renders the metadata block (categories, author, AI assistant from editors prop)', async () => {
    setup(0);
    // Author block (fixed) + AI assistant resolved via the editors prop.
    expect(await screen.findByText('blogModal.authorName')).toBeInTheDocument();
    expect(screen.getByText('Ada Editor')).toBeInTheDocument();
    expect(screen.getByText('Thinking in gradients.')).toBeInTheDocument();
    // Category pills from the fetched full post.
    expect(screen.getByText('Deep Learning')).toBeInTheDocument();
    expect(screen.getByText('NLP')).toBeInTheDocument();
  });

  it('degrades the AI-assistant block when editors are unavailable', async () => {
    setup(0, { editors: [] });
    await screen.findByText('blogModal.authorName');
    // No matching editor → assistant name/signature not shown.
    expect(screen.queryByText('Ada Editor')).toBeNull();
  });

  it('keeps the sticky title as the aria-labelledby target', async () => {
    setup(0);
    const dialog = screen.getByRole('dialog');
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveAttribute('id', dialog.getAttribute('aria-labelledby'));
    await screen.findByText('Body paragraph one.');
  });

  it('copy shows a transient copied status on success', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    setup(0);
    fireEvent.click(screen.getByLabelText('blogModal.copyLink'));

    await waitFor(() => {
      expect(writeText).toHaveBeenCalled();
      // Visible transient status text appears.
      expect(screen.getAllByText('blogModal.copied').length).toBeGreaterThan(0);
    });
  });

  it('renders a fallback input with the correct link when clipboard write fails', async () => {
    // jsdom does not run requestAnimationFrame reliably, so we assert that the
    // fallback input renders with the correct value (the visible behavior) and
    // trust that the .select() call in showFallback works in a real browser.
    const writeText = vi.fn().mockRejectedValue(new Error('denied'));
    Object.assign(navigator, { clipboard: { writeText } });

    setup(0);
    fireEvent.click(screen.getByLabelText('blogModal.copyLink'));

    const fallback = await screen.findByLabelText('blogModal.copyFallbackLabel');
    expect(fallback).toHaveAttribute('readonly');
    expect((fallback as HTMLInputElement).value).toContain('/blog/2025-03-28-10-00-00-first');
    // The input renders immediately on failure — no extra action required by the visitor.
    expect(fallback).toBeInTheDocument();
  });
});
