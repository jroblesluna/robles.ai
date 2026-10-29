// History-based breadcrumbs that mirror the tab's real history stack.
// Each recorded entry stores its stack position in `history.state.trailPos`
// (a fresh push is always the last entry, so its position is
// history.length - 1). A crumb click is then an exact history.go(offset),
// even when unrecorded pages sit between two crumbs.
// ponytail: browsers cap history.length (~50 in Chrome); past that, positions
// collide and the trail restarts from the newest entries.

const KEY = 'robles-history-trail';
const MAX_ITEMS = 8;

export interface Crumb {
  pos: number;
  url: string;
  title: string;
}

export interface Trail {
  items: Crumb[];
  /** Stack position of the current entry. */
  current: number;
}

function readItems(): Crumb[] {
  try {
    const items = JSON.parse(sessionStorage.getItem(KEY) || '[]');
    if (Array.isArray(items)) return items.filter((c) => typeof c?.pos === 'number');
  } catch { /* storage blocked or corrupt: start a new trail */ }
  return [];
}

/**
 * Records the current history entry and returns the trail. `marker` is merged
 * into `history.state` (e.g. `{ blogPost: true }`) so routes can recognise
 * the entry when the user comes back to it.
 */
export function recordVisit(title: string, marker: Record<string, unknown> = {}): Trail {
  const url = window.location.pathname + window.location.search;
  const state = (window.history.state ?? {}) as Record<string, unknown>;
  const known = typeof state.trailPos === 'number';
  const pos = known ? (state.trailPos as number) : window.history.length - 1;
  try {
    // No URL argument: the entry keeps its URL, only the state changes.
    window.history.replaceState({ ...state, ...marker, trailPos: pos }, '');
  } catch { /* sandboxed history: crumbs still render, offsets may be off */ }

  // A new entry discards the forward branch, exactly like the browser does.
  const items = readItems()
    .filter((c) => (known ? c.pos !== pos : c.pos < pos))
    .concat({ pos, url, title })
    .sort((a, b) => a.pos - b.pos)
    .slice(-MAX_ITEMS);
  try {
    sessionStorage.setItem(KEY, JSON.stringify(items));
  } catch { /* breadcrumbs are a convenience; ignore storage failures */ }
  return { items, current: pos };
}
