import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createSlugIndex } from '../slugIndex.js';
import type { SlugIndexEntry } from '../types.js';

/**
 * Property 4: Language resolution from slug
 * **Validates: Requirements 1.6**
 *
 * For any post with distinct EN/ES slugs, both slugs resolve to the same SlugIndexEntry.
 *
 * Feature: seo-improvements, Property 4: Language resolution from slug
 */

/** Arbitrary for generating a valid slug string (date-prefixed, lowercase alphanumeric with dashes). */
const slugArb = fc
  .tuple(
    fc.integer({ min: 2020, max: 2030 }),
    fc.integer({ min: 1, max: 12 }),
    fc.integer({ min: 1, max: 28 }),
    fc.integer({ min: 0, max: 23 }),
    fc.integer({ min: 0, max: 59 }),
    fc.integer({ min: 0, max: 59 }),
    fc.array(fc.stringMatching(/^[a-z][a-z0-9]{1,12}$/), { minLength: 2, maxLength: 6 }),
  )
  .map(([year, month, day, hour, min, sec, words]) => {
    const mm = String(month).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    const hh = String(hour).padStart(2, '0');
    const mi = String(min).padStart(2, '0');
    const ss = String(sec).padStart(2, '0');
    return `${year}-${mm}-${dd}-${hh}-${mi}-${ss}-${words.join('-')}`;
  });

/** Arbitrary for SlugIndexEntry with distinct EN and ES slugs. */
const slugIndexEntryArb = fc
  .tuple(slugArb, slugArb, fc.stringMatching(/^\/[a-z\/]{3,30}\.json$/))
  .filter(([enSlug, esSlug]) => enSlug !== esSlug)
  .map(([enSlug, esSlug, filePath]): SlugIndexEntry => ({
    filePath,
    enSlug,
    esSlug,
    date: enSlug.slice(0, 10),
  }));

describe('SlugIndex Property Tests', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'slugindex-test-'));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('Property 4: both EN and ES slugs resolve to the same SlugIndexEntry', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(slugIndexEntryArb, { minLength: 1, maxLength: 20 }),
        async (entries) => {
          // Create a fresh slug index backed by the empty temp dir
          const index = createSlugIndex(tempDir);

          // Initialize the index first (scans empty dir, sets initialized = true)
          // so that subsequent get() calls don't trigger a rebuild that clears the map
          await index.rebuild();

          // Add all entries via the public addEntry API
          for (const entry of entries) {
            index.addEntry(entry);
          }

          // Verify: for each entry, both EN and ES slugs resolve to the exact same entry
          for (const entry of entries) {
            const byEn = index.get(entry.enSlug);
            const byEs = index.get(entry.esSlug);

            expect(byEn).toBeDefined();
            expect(byEs).toBeDefined();
            expect(byEn).toStrictEqual(byEs);
            expect(byEn).toStrictEqual(entry);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
