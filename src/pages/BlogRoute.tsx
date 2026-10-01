import { useRef } from 'react';
import { useParams } from 'wouter';
import BlogList from '@/pages/BlogList';
import BlogPost from '@/pages/BlogPost';
import type { BlogModalHistoryState } from '@/hooks/useBlogModalRouting';

/**
 * Single route component for `/blog` and `/blog/:slug`.
 *
 * Why one route instead of two: wouter (v3) monkey-patches `history.pushState`
 * and re-routes on it. When the in-page modal pushes a `/blog/:slug` URL (for
 * deep-link/share), a separate `/blog/:slug` route would swap wouter in to the
 * full `BlogPost` page and unmount `BlogList` (killing the modal). Mounting a
 * single route for both paths keeps the SAME `BlogList` instance (and its modal
 * `openIndex` state) alive across the `/blog → /blog/:slug` soft navigation.
 *
 * ## The cold-load decision is frozen at first mount (stable for the lifetime)
 *
 * The decision "is this a full-post cold load, or the list (+ in-page modal)?"
 * is computed exactly ONCE, when this component first mounts, and then never
 * changes for the life of the mount:
 *
 *   - First render with a `slug` AND no `blogModal` history-state marker →
 *     this is a cold load / external deep link to `/blog/:slug` → render the
 *     full `BlogPost` (server-side SEO untouched).
 *   - Otherwise (no slug, or a slug produced by the in-page modal) → render
 *     `BlogList`, and keep rendering it for every subsequent URL change.
 *
 * This is deliberate. The previous implementation re-read `window.history.state`
 * on EVERY render to decide list-vs-post. That was fragile: while the in-page
 * modal closes there is a tick where the pathname is still `/blog/:slug` but the
 * `blogModal` marker is already gone. In that tick the route rendered
 * `BlogPost`, which unmounted the live `BlogList` — and the next render mounted
 * a fresh one, re-running its `/api/blog` fetch effect (the "cards reload /
 * skeleton flash" bug). Freezing the decision means `/blog`, the modal's
 * `/blog/:slug`, and the post-close `/blog` all keep the SAME `BlogList`
 * instance mounted: no unmount, no re-fetch. The modal's visibility is driven by
 * `BlogList`'s own `openIndex` state (`useBlogModalRouting`), not by this route.
 *
 * Requirements: 11.1, 12.1, 12.2, 12.3, 12.4.
 * Design: Area 2 — 2a/2b.
 */
export default function BlogRoute() {
  const params = useParams<{ slug?: string }>();
  const slug = params.slug;

  // Freeze the cold-load decision on the first render only. A ref initializer
  // runs once per mount and is never recomputed, so later URL changes (opening
  // the modal, closing it, prev/next) cannot flip us into `BlogPost` and tear
  // down the mounted `BlogList`.
  const isColdLoadFullPostRef = useRef<boolean | null>(null);
  if (isColdLoadFullPostRef.current === null) {
    const state =
      typeof window !== 'undefined'
        ? (window.history.state as BlogModalHistoryState | null)
        : null;
    // Cold load of a shareable/deep `/blog/:slug` only when the very first
    // render has a slug and was NOT produced by the in-page modal.
    isColdLoadFullPostRef.current = Boolean(slug) && !state?.blogModal;
  }

  if (isColdLoadFullPostRef.current) {
    return <BlogPost />;
  }

  // List page (and the in-page modal lives inside it). Same instance for
  // `/blog` and every `/blog/:slug` the modal produces.
  return <BlogList />;
}
