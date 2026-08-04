import { describe, it, expect } from 'vitest';
import { buildBlogJsonLd, BlogMetaBuilderInput } from '../metaBuilders.js';
import type { BlogPostData } from '../types.js';

/**
 * Unit tests for buildBlogJsonLd()
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4
 */

function makeSamplePost(overrides: Partial<BlogPostData> = {}): BlogPostData {
  return {
    slug: '2025-03-28-00-00-00-test-post',
    date: '2025-03-28-00-00-00',
    editorId: 1,
    categories: ['AI'],
    keywords: ['test'],
    image: '/images/test.jpg',
    translations: {
      en: {
        slug: '2025-03-28-00-00-00-test-post',
        title: 'Test Post Title',
        excerpt: 'This is a test excerpt for the blog post.',
        content: [{ heading: 'Heading', body: 'Body text' }],
      },
      es: {
        slug: '2025-03-28-00-00-00-publicacion-de-prueba',
        title: 'Título de Publicación de Prueba',
        excerpt: 'Este es un extracto de prueba para la publicación del blog.',
        content: [{ heading: 'Encabezado', body: 'Texto del cuerpo' }],
      },
    },
    sources: [],
    ...overrides,
  };
}

describe('buildBlogJsonLd', () => {
  describe('BlogPosting schema', () => {
    it('returns an array with BlogPosting as the first element', () => {
      const post = makeSamplePost();
      const input: BlogMetaBuilderInput = { post, lang: 'en', slug: post.translations.en.slug };
      const result = buildBlogJsonLd(input, 'Clara Buzz');

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('@type', 'BlogPosting');
      expect(result[0]).toHaveProperty('@context', 'https://schema.org');
    });

    it('includes headline from the correct language translation', () => {
      const post = makeSamplePost();
      const input: BlogMetaBuilderInput = { post, lang: 'en', slug: post.translations.en.slug };
      const result = buildBlogJsonLd(input, 'Clara Buzz');

      expect((result[0] as any).headline).toBe('Test Post Title');
    });

    it('uses Spanish translation when lang is es', () => {
      const post = makeSamplePost();
      const input: BlogMetaBuilderInput = { post, lang: 'es', slug: post.translations.es.slug };
      const result = buildBlogJsonLd(input, 'Clara Buzz');

      expect((result[0] as any).headline).toBe('Título de Publicación de Prueba');
      expect((result[0] as any).description).toBe(
        'Este es un extracto de prueba para la publicación del blog.'
      );
    });

    it('truncates description to 160 characters', () => {
      const longExcerpt = 'A'.repeat(200);
      const post = makeSamplePost({
        translations: {
          en: {
            slug: '2025-03-28-00-00-00-test-post',
            title: 'Test Post Title',
            excerpt: longExcerpt,
            content: [],
          },
          es: {
            slug: '2025-03-28-00-00-00-publicacion-de-prueba',
            title: 'Título',
            excerpt: 'Extracto',
            content: [],
          },
        },
      });
      const input: BlogMetaBuilderInput = { post, lang: 'en', slug: post.translations.en.slug };
      const result = buildBlogJsonLd(input, 'Clara Buzz');

      expect((result[0] as any).description.length).toBeLessThanOrEqual(160);
      expect((result[0] as any).description.endsWith('...')).toBe(true);
    });

    it('includes datePublished and dateModified from post.date', () => {
      const post = makeSamplePost();
      const input: BlogMetaBuilderInput = { post, lang: 'en', slug: post.translations.en.slug };
      const result = buildBlogJsonLd(input, 'Clara Buzz');

      expect((result[0] as any).datePublished).toBe('2025-03-28-00-00-00');
      expect((result[0] as any).dateModified).toBe('2025-03-28-00-00-00');
    });

    it('includes author with editor name', () => {
      const post = makeSamplePost();
      const input: BlogMetaBuilderInput = { post, lang: 'en', slug: post.translations.en.slug };
      const result = buildBlogJsonLd(input, 'Mike Electrum');

      expect((result[0] as any).author).toEqual({
        '@type': 'Person',
        name: 'Mike Electrum',
      });
    });

    it('includes publisher as Robles.AI Organization with logo', () => {
      const post = makeSamplePost();
      const input: BlogMetaBuilderInput = { post, lang: 'en', slug: post.translations.en.slug };
      const result = buildBlogJsonLd(input, 'Clara Buzz');

      expect((result[0] as any).publisher).toEqual({
        '@type': 'Organization',
        name: 'Robles.AI',
        logo: {
          '@type': 'ImageObject',
          url: 'https://robles.ai/logo.png',
        },
      });
    });

    it('resolves image URL correctly for relative paths', () => {
      const post = makeSamplePost({ image: '/images/test.jpg' });
      const input: BlogMetaBuilderInput = { post, lang: 'en', slug: post.translations.en.slug };
      const result = buildBlogJsonLd(input, 'Clara Buzz');

      expect((result[0] as any).image).toBe('https://robles.ai/images/test.jpg');
    });

    it('uses default OG image when post has no image', () => {
      const post = makeSamplePost({ image: undefined });
      const input: BlogMetaBuilderInput = { post, lang: 'en', slug: post.translations.en.slug };
      const result = buildBlogJsonLd(input, 'Clara Buzz');

      expect((result[0] as any).image).toBe('https://robles.ai/og-image.png');
    });

    it('includes mainEntityOfPage with canonical URL', () => {
      const post = makeSamplePost();
      const input: BlogMetaBuilderInput = { post, lang: 'en', slug: post.translations.en.slug };
      const result = buildBlogJsonLd(input, 'Clara Buzz');

      expect((result[0] as any).mainEntityOfPage).toEqual({
        '@type': 'WebPage',
        '@id': 'https://robles.ai/blog/2025-03-28-00-00-00-test-post',
      });
    });
  });

  describe('BreadcrumbList schema', () => {
    it('returns BreadcrumbList as the second element', () => {
      const post = makeSamplePost();
      const input: BlogMetaBuilderInput = { post, lang: 'en', slug: post.translations.en.slug };
      const result = buildBlogJsonLd(input, 'Clara Buzz');

      expect(result[1]).toHaveProperty('@type', 'BreadcrumbList');
      expect(result[1]).toHaveProperty('@context', 'https://schema.org');
    });

    it('contains three breadcrumb items: Home, Blog, Post Title', () => {
      const post = makeSamplePost();
      const input: BlogMetaBuilderInput = { post, lang: 'en', slug: post.translations.en.slug };
      const result = buildBlogJsonLd(input, 'Clara Buzz');

      const items = (result[1] as any).itemListElement;
      expect(items).toHaveLength(3);
      expect(items[0]).toEqual({
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: 'https://robles.ai/',
      });
      expect(items[1]).toEqual({
        '@type': 'ListItem',
        position: 2,
        name: 'Blog',
        item: 'https://robles.ai/blog',
      });
      expect(items[2]).toEqual({
        '@type': 'ListItem',
        position: 3,
        name: 'Test Post Title',
        item: 'https://robles.ai/blog/2025-03-28-00-00-00-test-post',
      });
    });

    it('uses the post title in the correct language for breadcrumb', () => {
      const post = makeSamplePost();
      const input: BlogMetaBuilderInput = { post, lang: 'es', slug: post.translations.es.slug };
      const result = buildBlogJsonLd(input, 'Clara Buzz');

      const items = (result[1] as any).itemListElement;
      expect(items[2].name).toBe('Título de Publicación de Prueba');
      expect(items[2].item).toBe(
        'https://robles.ai/blog/2025-03-28-00-00-00-publicacion-de-prueba'
      );
    });
  });
});
