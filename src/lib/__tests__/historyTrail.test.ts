import { beforeEach, expect, it } from 'vitest';
import { recordVisit } from '../historyTrail';

beforeEach(() => sessionStorage.clear());

it('mirrors real stack positions, revisits in place and drops the forward branch', async () => {
  window.history.replaceState(null, '', '/blog');
  const list = recordVisit('Hub');
  window.history.pushState(null, '', '/demos'); // unrecorded page in between
  window.history.pushState(null, '', '/blog/a');
  const a = recordVisit('A', { blogPost: true });

  expect(a.current - list.current).toBe(2); // exact history.go offset
  expect(a.items.map((c) => c.title)).toEqual(['Hub', 'A']);
  expect(window.history.state).toMatchObject({ blogPost: true, trailPos: a.current });

  // Reload / revisit of the same entry keeps one crumb.
  expect(recordVisit('A').items.map((c) => c.title)).toEqual(['Hub', 'A']);

  // Back to the list, then a new entry: everything after the list is dropped.
  const popped = new Promise((resolve) => window.addEventListener('popstate', resolve, { once: true }));
  window.history.go(list.current - a.current);
  await popped;
  expect(recordVisit('Hub').current).toBe(list.current);
  window.history.pushState(null, '', '/blog/b');
  const b = recordVisit('B');
  expect(b.items.map((c) => c.title)).toEqual(['Hub', 'B']);
});
