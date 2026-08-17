import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { getPageContext, clearContextCache } from '../services/chatContext.js';

/**
 * Property 9: Context provider page-awareness
 * **Validates: Requirements 2.1, 2.2, 2.3, 2.4**
 *
 * For any blog path where slug exists, context includes post title and body;
 * for homepage, context includes service descriptions; for two distinct paths,
 * context differs.
 *
 * Feature: ai-chatbot-widget, Property 9: Context provider page-awareness
 */

/** Known demo pages with expected keywords */
const knownDemos: { path: string; keywords: string[] }[] = [
  { path: '/try-identity', keywords: ['Identity Verification', 'selfie', 'document'] },
  { path: '/try-langchain', keywords: ['LangChain', 'RAG'] },
  { path: '/try-rag', keywords: ['RAG Pipeline', 'Pinecone'] },
  { path: '/try-medical', keywords: ['Medical AI', 'imaging'] },
];

/** Known static paths */
const knownStaticPaths = ['/', '/blog', '/careers', '/get-started', '/apply', '/otp'];

/** All distinct page paths we can test with (no blog slugs needed here) */
const distinctPaths = [
  '/',
  '/blog',
  '/careers',
  '/get-started',
  '/try-identity',
  '/try-langchain',
  '/try-rag',
  '/try-medical',
];

/** Arbitrary that generates a pair of distinct paths from the known set */
const distinctPathPairArb = fc.tuple(
  fc.integer({ min: 0, max: distinctPaths.length - 1 }),
  fc.integer({ min: 0, max: distinctPaths.length - 1 }),
).filter(([a, b]) => a !== b)
  .map(([a, b]) => [distinctPaths[a], distinctPaths[b]] as [string, string]);

/** Arbitrary that picks a random known demo */
const demoArb = fc.constantFrom(...knownDemos);

/** Arbitrary that generates arbitrary path suffixes (for generic route fallback) */
const arbitraryPathArb = fc.tuple(
  fc.stringMatching(/^[a-z][a-z0-9-]{1,20}$/),
  fc.stringMatching(/^[a-z][a-z0-9-]{1,20}$/),
).map(([seg1, seg2]) => `/${seg1}/${seg2}`);

describe('ChatContext Property Tests — Property 9: Context provider page-awareness', () => {
  beforeEach(() => {
    clearContextCache();
  });

  describe('Property 9a: Homepage always includes service descriptions', () => {
    it('for the homepage path, context includes all core service keywords', async () => {
      const serviceKeywords = [
        'Machine Learning',
        'Computer Vision',
        'Natural Language Processing',
        'Deep Learning',
      ];

      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('/', '/?lang=en', '/#features', '/?ref=google'),
          async (homePath) => {
            clearContextCache();
            const context = await getPageContext(homePath);

            for (const keyword of serviceKeywords) {
              expect(context).toContain(keyword);
            }
          },
        ),
        { numRuns: 20 },
      );
    });
  });

  describe('Property 9b: For distinct page paths, context differs', () => {
    it('any two distinct paths produce different context strings', async () => {
      await fc.assert(
        fc.asyncProperty(distinctPathPairArb, async ([pathA, pathB]) => {
          clearContextCache();
          const contextA = await getPageContext(pathA);
          const contextB = await getPageContext(pathB);

          expect(contextA).not.toBe(contextB);
        }),
        { numRuns: 100 },
      );
    });
  });

  describe('Property 9c: Known demo pages contain relevant keywords', () => {
    it('for any known demo page, context includes all expected keywords', async () => {
      await fc.assert(
        fc.asyncProperty(demoArb, async (demo) => {
          clearContextCache();
          const context = await getPageContext(demo.path);

          for (const keyword of demo.keywords) {
            expect(context).toContain(keyword);
          }
        }),
        { numRuns: 100 },
      );
    });
  });

  describe('Property 9d: Context is always a non-empty string', () => {
    it('for any valid page path, getPageContext returns a non-empty string', async () => {
      const anyPathArb = fc.oneof(
        fc.constantFrom(...distinctPaths),
        fc.constantFrom(...knownDemos.map((d) => d.path)),
        arbitraryPathArb,
      );

      await fc.assert(
        fc.asyncProperty(anyPathArb, async (pagePath) => {
          clearContextCache();
          const context = await getPageContext(pagePath);

          expect(typeof context).toBe('string');
          expect(context.length).toBeGreaterThan(0);
        }),
        { numRuns: 100 },
      );
    });
  });

  describe('Property 9e: Blog path with existing slug includes post content', () => {
    it('for a known blog post slug, context includes article title and body content', async () => {
      // Use a known existing blog post
      const existingSlug = '2025-05-14-03-00-00-the-future-of-human-device-interaction';
      clearContextCache();
      const context = await getPageContext(`/blog/${existingSlug}`);

      // Must include title indication and article content
      expect(context).toContain('Human-Device Interaction');
      expect(context).toContain('Robles.AI News Center');
      // Context should contain article sections (body content)
      expect(context.length).toBeGreaterThan(100);
    });
  });
});
