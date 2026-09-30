import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useBlogModalRouting } from './useBlogModalRouting';
import type { BlogListPost } from '@/lib/blogModal';

function makePost(slug: string): BlogListPost {
  return {
    slug,
    editorId: 1,
    translations: {
      en: { title: `EN ${slug}`, excerpt: '' },
      es: { title: `ES ${slug}`, excerpt: '' },
    },
  };
}

const posts: BlogListPost[] = [
  makePost('first-post'),
  makePost('second-post'),
  makePost('third-post'),
];

describe('useBlogModalRouting', () => {
  beforeEach(() => {
    // Start each test on a clean /blog entry.
    window.history.pushState(null, '', '/blog');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('openAt pushes /blog/:slug and opens the modal at that index', () => {
    const pushSpy = vi.spyOn(window.history, 'pushState');
    const { result } = renderHook(() => useBlogModalRouting(posts));

    expect(result.current.openIndex).toBeNull();

    act(() => result.current.openAt(1));

    expect(result.current.openIndex).toBe(1);
    expect(window.location.pathname).toBe('/blog/second-post');
    expect(pushSpy).toHaveBeenCalledWith(
      { blogModal: true },
      '',
      '/blog/second-post',
    );
  });

  it('goToIndex replaces the URL (does not push a new entry) for prev/next', () => {
    const { result } = renderHook(() => useBlogModalRouting(posts));

    act(() => result.current.openAt(0));
    expect(window.location.pathname).toBe('/blog/first-post');

    const replaceSpy = vi.spyOn(window.history, 'replaceState');
    const pushSpy = vi.spyOn(window.history, 'pushState');

    act(() => result.current.goToIndex(1));

    expect(result.current.openIndex).toBe(1);
    expect(window.location.pathname).toBe('/blog/second-post');
    expect(replaceSpy).toHaveBeenCalledWith(
      { blogModal: true },
      '',
      '/blog/second-post',
    );
    expect(pushSpy).not.toHaveBeenCalled();
  });

  it('close clears openIndex and unwinds the pushed entry back to /blog', () => {
    const { result } = renderHook(() => useBlogModalRouting(posts));

    act(() => result.current.openAt(2));
    expect(window.location.pathname).toBe('/blog/third-post');

    // Because openAt pushed the top entry, close() unwinds it via history.back()
    // (rather than pushing a fresh /blog entry), landing back on /blog.
    const backSpy = vi.spyOn(window.history, 'back');

    act(() => result.current.close());

    expect(result.current.openIndex).toBeNull();
    expect(backSpy).toHaveBeenCalledTimes(1);
  });



  it('a simulated popstate (browser Back) closes the modal', () => {
    const { result } = renderHook(() => useBlogModalRouting(posts));

    act(() => result.current.openAt(1));
    expect(result.current.openIndex).toBe(1);

    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate'));
    });

    expect(result.current.openIndex).toBeNull();
  });
});
