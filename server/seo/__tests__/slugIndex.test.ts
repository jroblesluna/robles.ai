import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createSlugIndex } from '../slugIndex.js';

/**
 * Unit tests for SlugIndex
 * Validates: Requirements 1.6, 1.7
 */

function makePostJson(enSlug: string, esSlug: string) {
  return JSON.stringify({
    slug: enSlug,
    date: enSlug.slice(0, 10),
    editorId: 1,
    categories: ['AI'],
    keywords: ['test'],
    translations: {
      en: {
        slug: enSlug,
        title: `EN Title for ${enSlug}`,
        excerpt: 'English excerpt',
        content: [],
      },
      es: {
        slug: esSlug,
        title: `ES Title for ${esSlug}`,
        excerpt: 'Extracto en español',
        content: [],
      },
    },
    sources: [],
  });
}

describe('SlugIndex', () => {
  let tempDir: string;

  beforeAll(async () => {
    // Create a temp directory with test post fixtures
    tempDir = await mkdtemp(join(tmpdir(), 'slugindex-test-'));

    // Create nested directory structure mimicking server/data/posts/YYYY/MM/DD/
    const postDir = join(tempDir, '2025', '03', '28');
    await mkdir(postDir, { recursive: true });

    await writeFile(
      join(postDir, '2025-03-28-00-00-00-test-post-one.json'),
      makePostJson(
        '2025-03-28-00-00-00-test-post-one',
        '2025-03-28-00-00-00-publicacion-de-prueba-uno'
      )
    );

    await writeFile(
      join(postDir, '2025-03-28-01-00-00-another-post.json'),
      makePostJson(
        '2025-03-28-01-00-00-another-post',
        '2025-03-28-01-00-00-otra-publicacion'
      )
    );

    // Create a second date directory
    const postDir2 = join(tempDir, '2025', '04', '01');
    await mkdir(postDir2, { recursive: true });

    await writeFile(
      join(postDir2, '2025-04-01-00-00-00-april-post.json'),
      makePostJson(
        '2025-04-01-00-00-00-april-post',
        '2025-04-01-00-00-00-publicacion-de-abril'
      )
    );
  });

  describe('get() - lookup by slug', () => {
    it('returns the entry when looking up by EN slug', async () => {
      const index = createSlugIndex(tempDir);
      await index.rebuild();

      const entry = index.get('2025-03-28-00-00-00-test-post-one');
      expect(entry).toBeDefined();
      expect(entry!.enSlug).toBe('2025-03-28-00-00-00-test-post-one');
      expect(entry!.esSlug).toBe('2025-03-28-00-00-00-publicacion-de-prueba-uno');
      expect(entry!.date).toBe('2025-03-28');
    });

    it('returns the entry when looking up by ES slug', async () => {
      const index = createSlugIndex(tempDir);
      await index.rebuild();

      const entry = index.get('2025-03-28-00-00-00-publicacion-de-prueba-uno');
      expect(entry).toBeDefined();
      expect(entry!.enSlug).toBe('2025-03-28-00-00-00-test-post-one');
      expect(entry!.esSlug).toBe('2025-03-28-00-00-00-publicacion-de-prueba-uno');
      expect(entry!.date).toBe('2025-03-28');
    });

    it('returns undefined for a non-existent slug', async () => {
      const index = createSlugIndex(tempDir);
      await index.rebuild();

      const entry = index.get('non-existent-slug-that-does-not-exist');
      expect(entry).toBeUndefined();
    });

    it('both EN and ES slugs resolve to the same entry', async () => {
      const index = createSlugIndex(tempDir);
      await index.rebuild();

      const byEn = index.get('2025-03-28-01-00-00-another-post');
      const byEs = index.get('2025-03-28-01-00-00-otra-publicacion');
      expect(byEn).toBeDefined();
      expect(byEs).toBeDefined();
      expect(byEn).toBe(byEs); // Same object reference
    });
  });

  describe('addEntry() - immediate queryability', () => {
    it('makes a new entry immediately queryable by EN slug', async () => {
      const index = createSlugIndex(tempDir);
      await index.rebuild();

      const newEntry = {
        filePath: '/fake/path/new-post.json',
        enSlug: '2025-05-01-00-00-00-brand-new-post',
        esSlug: '2025-05-01-00-00-00-publicacion-nueva',
        date: '2025-05-01',
      };

      index.addEntry(newEntry);

      const result = index.get('2025-05-01-00-00-00-brand-new-post');
      expect(result).toBeDefined();
      expect(result).toBe(newEntry);
    });

    it('makes a new entry immediately queryable by ES slug', async () => {
      const index = createSlugIndex(tempDir);
      await index.rebuild();

      const newEntry = {
        filePath: '/fake/path/new-post.json',
        enSlug: '2025-05-01-00-00-00-brand-new-post',
        esSlug: '2025-05-01-00-00-00-publicacion-nueva',
        date: '2025-05-01',
      };

      index.addEntry(newEntry);

      const result = index.get('2025-05-01-00-00-00-publicacion-nueva');
      expect(result).toBeDefined();
      expect(result).toBe(newEntry);
    });

    it('does not affect existing entries', async () => {
      const index = createSlugIndex(tempDir);
      await index.rebuild();

      const newEntry = {
        filePath: '/fake/path/extra.json',
        enSlug: '2025-06-01-00-00-00-extra',
        esSlug: '2025-06-01-00-00-00-extra-es',
        date: '2025-06-01',
      };

      index.addEntry(newEntry);

      // Original entries still accessible
      const original = index.get('2025-03-28-00-00-00-test-post-one');
      expect(original).toBeDefined();
      expect(original!.enSlug).toBe('2025-03-28-00-00-00-test-post-one');
    });
  });

  describe('rebuild() - refreshes the index', () => {
    it('picks up new files added after initial build', async () => {
      const index = createSlugIndex(tempDir);
      await index.rebuild();

      // Initially should not find the new post
      expect(index.get('2025-03-28-99-00-00-late-addition')).toBeUndefined();

      // Add a new file to disk
      const postDir = join(tempDir, '2025', '03', '28');
      await writeFile(
        join(postDir, '2025-03-28-99-00-00-late-addition.json'),
        makePostJson(
          '2025-03-28-99-00-00-late-addition',
          '2025-03-28-99-00-00-adicion-tardia'
        )
      );

      // Rebuild to pick up the new file
      await index.rebuild();

      const entry = index.get('2025-03-28-99-00-00-late-addition');
      expect(entry).toBeDefined();
      expect(entry!.esSlug).toBe('2025-03-28-99-00-00-adicion-tardia');

      // Clean up: remove the file we added
      const { unlink } = await import('node:fs/promises');
      await unlink(join(postDir, '2025-03-28-99-00-00-late-addition.json'));
    });

    it('removes entries for deleted files after rebuild', async () => {
      // Create an index pointing at temp dir
      const index = createSlugIndex(tempDir);

      // Add a temporary file
      const postDir = join(tempDir, '2025', '03', '28');
      const tempFile = join(postDir, '2025-03-28-88-00-00-temp-file.json');
      await writeFile(
        tempFile,
        makePostJson(
          '2025-03-28-88-00-00-temp-file',
          '2025-03-28-88-00-00-archivo-temporal'
        )
      );

      // Build the index (should include the temp file)
      await index.rebuild();
      expect(index.get('2025-03-28-88-00-00-temp-file')).toBeDefined();

      // Delete the temp file
      const { unlink } = await import('node:fs/promises');
      await unlink(tempFile);

      // Rebuild - entry should be gone
      await index.rebuild();
      expect(index.get('2025-03-28-88-00-00-temp-file')).toBeUndefined();
    });

    it('clears manually-added entries on rebuild', async () => {
      const index = createSlugIndex(tempDir);
      await index.rebuild();

      // Add a manual entry that has no file on disk
      index.addEntry({
        filePath: '/nonexistent/manual-entry.json',
        enSlug: '2025-12-01-00-00-00-manual-only',
        esSlug: '2025-12-01-00-00-00-solo-manual',
        date: '2025-12-01',
      });

      expect(index.get('2025-12-01-00-00-00-manual-only')).toBeDefined();

      // After rebuild, only real files should be in the index
      await index.rebuild();
      expect(index.get('2025-12-01-00-00-00-manual-only')).toBeUndefined();
    });
  });
});
