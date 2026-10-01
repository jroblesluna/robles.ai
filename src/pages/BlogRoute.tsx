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
 * Cold load / external deep-link to `/blog/:slug` still renders the full
 * `BlogPost` (server-side SEO untouched): those entries have no `blogModal`
 * history-state marker, so we fall through to `BlogPost`.
 *
 * Requirements: 11.1, 12.1, 12.2, 12.3, 12.4.
 * Design: Area 2 — 2a/2b.
 */
export default function BlogRoute() {
  const params = useParams<{ slug?: string }>();
  const slug = params.slug;

  // No slug → the list page.
  if (!slug) {
    return <BlogList />;
  }

  // A `/blog/:slug` URL that was produced by the in-page modal carries the
  // `blogModal` history-state marker. In that case keep rendering the list
  // (its modal is what the user is looking at). Any other `/blog/:slug` entry
  // is a cold load or a shared/deep link → render the full post.
  const state =
    typeof window !== 'undefined'
      ? (window.history.state as BlogModalHistoryState | null)
      : null;

  if (state?.blogModal) {
    return <BlogList />;
  }

  return <BlogPost />;
}
