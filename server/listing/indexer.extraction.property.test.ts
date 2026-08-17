import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { extractListingRow, type PostJson } from './indexer';

// --- Custom Arbitraries ---

/** Arbitrary for a slug string (date-prefixed format). */
const slugArb = fc
  .tuple(
    fc.integer({ min: 2020, max: 2030 }),
    fc.integer({ min: 1, max: 12 }),
    fc.integer({ min: 1, max: 28 }),
    fc.array(fc.stringMatching(/^[a-z]{2,8}$/), { minLength: 2, maxLength: 5 }),
  )
  .map(([year, month, day, words]) => {
    const mm = String(month).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    return `${year}-${mm}-${dd}-${words.join('-')}`;
  });

/** Arbitrary for a date string in YYYY-MM-DD format. */
const dateArb = fc
  .tuple(
    fc.integer({ min: 2020, max: 2030 }),
    fc.integer({ min: 1, max: 12 }),
    fc.integer({ min: 1, max: 28 }),
  )
  .map(([year, month, day]) => {
    const mm = String(month).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    return `${year}-${mm}-${dd}`;
  });

/** Arbitrary for editor ID (positive integer). */
const editorIdArb = fc.integer({ min: 1, max: 50 });

/** Arbitrary for a categories array. */
const categoriesArb = fc.array(fc.stringMatching(/^[A-Za-z]{2,10}$/), { minLength: 0, maxLength: 5 });

/** Arbitrary for a non-empty trimmed string suitable for titles/excerpts. */
const nonEmptyTextArb = fc.stringMatching(/^[A-Za-z][A-Za-z0-9 ]{2,40}$/);

/** Arbitrary for a translation object with title and excerpt. */
const translationArb = fc.record({
  title: nonEmptyTextArb,
  excerpt: nonEmptyTextArb,
  content: fc.constant([{ heading: 'Test', body: 'Content' }]),
});

/** Arbitrary for a fully valid PostJson with all required listing fields. */
const validListingPostArb: fc.Arbitrary<PostJson> = fc
  .tuple(slugArb, dateArb, editorIdArb, categoriesArb, translationArb, translationArb)
  .map(([slug, date, editorId, categories, en, es]) => ({
    slug,
    date,
    editorId,
    categories,
    translations: { en, es },
  }));

// --- Property Tests ---

describe('Listing Indexer — Property 8: Extraction Preserves Data', () => {
  /**
   * Property 8: Extraction Preserves Data
   * **Validates: Requirements 2.3, 1.1**
   *
   * For any valid PostJson object, `extractListingRow(post)` SHALL produce a row
   * whose fields match the source object (slug identity, date identity,
   * editorId→editor_id, categories as JSON, translations title/excerpt).
   */
  it('extractListingRow preserves all fields from a valid PostJson', () => {
    fc.assert(
      fc.property(validListingPostArb, (post) => {
        const row = extractListingRow(post);

        // 1. Should NOT return null for valid input
        expect(row).not.toBeNull();

        // 2. slug is preserved
        expect(row!.slug).toBe(post.slug);

        // 3. date is preserved
        expect(row!.date).toBe(post.date);

        // 4. editorId maps to editor_id
        expect(row!.editor_id).toBe(post.editorId);

        // 5. categories stored as JSON string
        expect(row!.categories).toBe(JSON.stringify(post.categories || []));

        // 6. title_en from translations.en.title
        expect(row!.title_en).toBe(post.translations.en?.title ?? null);

        // 7. excerpt_en from translations.en.excerpt
        expect(row!.excerpt_en).toBe(post.translations.en?.excerpt ?? null);

        // 8. title_es from translations.es.title
        expect(row!.title_es).toBe(post.translations.es?.title ?? null);

        // 9. excerpt_es from translations.es.excerpt
        expect(row!.excerpt_es).toBe(post.translations.es?.excerpt ?? null);

        // 10. created_at is a valid ISO date string
        expect(() => new Date(row!.created_at).toISOString()).not.toThrow();
        expect(new Date(row!.created_at).toISOString()).toBe(row!.created_at);
      }),
      { numRuns: 100 },
    );
  });
});
