import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { SlugIndexEntry } from './types.js';

/**
 * Interface for the slug-to-file index providing O(1) lookups.
 */
export interface SlugIndex {
  get(slug: string): SlugIndexEntry | undefined;
  rebuild(): Promise<void>;
  addEntry(entry: SlugIndexEntry): void;
}

/**
 * Recursively scans a directory for .json files and returns their absolute paths.
 */
async function scanJsonFiles(dir: string): Promise<string[]> {
  const results: string[] = [];
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      const nested = await scanJsonFiles(fullPath);
      results.push(...nested);
    } else if (entry.isFile() && entry.name.endsWith('.json')) {
      results.push(fullPath);
    }
  }

  return results;
}

/**
 * Parses a blog post JSON file and extracts slug index information.
 * Returns undefined if the file cannot be parsed or lacks required fields.
 */
async function parsePostFile(filePath: string): Promise<SlugIndexEntry | undefined> {
  try {
    const content = await readFile(filePath, 'utf-8');
    const data = JSON.parse(content);

    const enSlug = data?.translations?.en?.slug;
    const esSlug = data?.translations?.es?.slug;

    if (!enSlug || !esSlug) {
      return undefined;
    }

    // Extract date from the slug (first 10 characters: YYYY-MM-DD)
    const date = enSlug.slice(0, 10);

    return { filePath, enSlug, esSlug, date };
  } catch {
    return undefined;
  }
}

/**
 * Creates a SlugIndex that lazily loads and indexes all blog posts from the given directory.
 * The index maps both EN and ES slugs to the same entry for O(1) lookup.
 */
export function createSlugIndex(postsDir: string): SlugIndex {
  const slugMap = new Map<string, SlugIndexEntry>();
  let initialized = false;
  let initPromise: Promise<void> | null = null;

  async function buildIndex(): Promise<void> {
    slugMap.clear();
    const files = await scanJsonFiles(postsDir);

    for (const filePath of files) {
      const entry = await parsePostFile(filePath);
      if (entry) {
        slugMap.set(entry.enSlug, entry);
        slugMap.set(entry.esSlug, entry);
      }
    }

    initialized = true;
  }

  function ensureInitialized(): void {
    if (!initialized && !initPromise) {
      initPromise = buildIndex().finally(() => {
        initPromise = null;
      });
    }
  }

  return {
    get(slug: string): SlugIndexEntry | undefined {
      ensureInitialized();
      return slugMap.get(slug);
    },

    async rebuild(): Promise<void> {
      await buildIndex();
    },

    addEntry(entry: SlugIndexEntry): void {
      slugMap.set(entry.enSlug, entry);
      slugMap.set(entry.esSlug, entry);
    },
  };
}
