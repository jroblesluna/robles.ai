import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { BlogModal, type FullPost } from './BlogModal';
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

const posts: BlogListPost[] = [
  makePost('first', 'First Post'),
  makePost('second', 'Second Post'),
  makePost('third', 'Third Post'),
];

// A fetcher that resolves synchronously-ish with article content per slug.
function makeFetcher(): (slug: string) => Promise<FullPost | null> {
  return (slug: string) =>
    Promise.resolve({
      slug,
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
    const fetchArticle = makeFetcher();
    const { rerender } = render(
      <BlogModal posts={posts} index={0} onIndexChange={() => {}} onClose={() => {}} fetchArticle={fetchArticle} />,
    );
    const scrollRegion = screen.getByRole('heading', { level: 1 }).parentElement as HTMLElement;
    scrollRegion.scrollTop = 500;
    rerender(
      <BlogModal posts={posts} index={1} onIndexChange={() => {}} onClose={() => {}} fetchArticle={fetchArticle} />,
    );
    expect(scrollRegion.scrollTop).toBe(0);
  });

  it('open-in-new-tab anchor points at /blog/:slug with target/rel', async () => {
    setup(0);
    const anchor = screen.getByLabelText('blogModal.openInNewTab');
    expect(anchor).toHaveAttribute('href', '/blog/first');
    expect(anchor).toHaveAttribute('target', '_blank');
    expect(anchor).toHaveAttribute('rel', 'noopener');
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

  it('renders and selects a fallback input when clipboard fails', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('denied'));
    Object.assign(navigator, { clipboard: { writeText } });
    const selectSpy = vi.spyOn(HTMLInputElement.prototype, 'select');

    setup(0);
    fireEvent.click(screen.getByLabelText('blogModal.copyLink'));

    const fallback = await screen.findByLabelText('blogModal.copyFallbackLabel');
    expect(fallback).toHaveAttribute('readonly');
    expect((fallback as HTMLInputElement).value).toContain('/blog/first');

    await waitFor(() => {
      expect(selectSpy).toHaveBeenCalled();
    });
  });
});
