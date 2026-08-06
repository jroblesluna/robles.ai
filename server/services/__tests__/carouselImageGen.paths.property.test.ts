import { describe, it, expect, afterEach } from 'vitest';
import * as fc from 'fast-check';
import fs from 'node:fs';
import path from 'node:path';
import { ensureBackgroundsDir } from '../carouselImageGen.js';

/**
 * Property 3: File path association with report ID
 * **Validates: Requirements 2.3**
 *
 * For any generated slide, its stored file path SHALL contain the report ID as a path component,
 * and the directory SHALL exist on disk at that path after generation completes successfully.
 *
 * Feature: dominical-carousel-images, Property 3: File path association with report ID
 */

describe('CarouselImageGen Path Property Tests', () => {
  const createdDirs: string[] = [];

  afterEach(() => {
    // Clean up all directories created during tests
    for (const dir of createdDirs) {
      // Walk up to the report-level directory and remove it
      const reportDir = path.resolve(dir, '..');
      try {
        fs.rmSync(reportDir, { recursive: true, force: true });
      } catch {
        // Ignore cleanup errors
      }
    }
    createdDirs.length = 0;
  });

  it('Property 3: ensureBackgroundsDir returns a path containing the report ID and creates the directory', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100000 }),
        (reportId) => {
          const resultPath = ensureBackgroundsDir(reportId);
          createdDirs.push(resultPath);

          // The returned path must contain the report ID as a directory component
          const pathComponents = resultPath.split(path.sep);
          expect(pathComponents).toContain(String(reportId));

          // The directory must exist on disk
          expect(fs.existsSync(resultPath)).toBe(true);
          expect(fs.statSync(resultPath).isDirectory()).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });
});
