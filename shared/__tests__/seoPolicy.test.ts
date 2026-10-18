// @vitest-environment node
import { expect, it } from 'vitest';
import { schemaDate, normalizeLanguage, staticPagePath, archivePage } from '../seoPolicy';
it('uses supported locales and stable page/language URLs', () => {
  expect(normalizeLanguage('es-PE')).toBe('es');
  expect(normalizeLanguage('en-US')).toBe('en');
  expect(staticPagePath('/blog', 'es', 2)).toBe('/blog?lang=es&page=2');
  expect(archivePage('-2')).toBe(1); expect(archivePage('2.1')).toBe(1);
});
it('converts generated UTC timestamps and retains valid dates without inventing invalid ones', () => {
  expect(schemaDate('2026-10-16-23-00-00')).toBe('2026-10-16T23:00:00Z');
  expect(schemaDate('2026-10-16')).toBe('2026-10-16');
  expect(schemaDate('2026-10-16T23:00:00-05:00')).toBe('2026-10-16T23:00:00-05:00');
  expect(schemaDate('2026-02-31')).toBeUndefined();
  expect(schemaDate('2026-02-31T23:00:00-05:00')).toBeUndefined();
  expect(schemaDate('2026-10-16T23:00:00')).toBeUndefined();
});

it('keeps the existing Spanish URL and distinguishes English for identical article slugs', async () => {
  const { blogPagePath, blogAlternates } = await import('../seoPolicy');
  expect(blogPagePath('same-slug', 'same-slug', 'en')).toBe('/blog/same-slug?lang=en');
  expect(blogPagePath('same-slug', 'same-slug', 'es')).toBe('/blog/same-slug');
  expect(blogAlternates('same-slug', 'same-slug')).toEqual([
    { hreflang: 'en', href: 'https://robles.ai/blog/same-slug?lang=en' },
    { hreflang: 'es', href: 'https://robles.ai/blog/same-slug' },
    { hreflang: 'x-default', href: 'https://robles.ai/blog/same-slug?lang=en' },
  ]);
  expect(blogPagePath('english', 'espanol', 'en')).toBe('/blog/english');
  expect(blogPagePath('english', 'espanol', 'es')).toBe('/blog/espanol');
});

it('preserves application parameters and fragments when localizing a static destination', () => {
  expect(staticPagePath('/apply?job=fullstack#details', 'es')).toBe('/apply?job=fullstack&lang=es#details');
  expect(staticPagePath('/apply?job=fullstack&lang=es#details', 'en')).toBe('/apply?job=fullstack#details');
  expect(staticPagePath('/#contact', 'es')).toBe('/?lang=es#contact');
  expect(staticPagePath('/blog?page=2&editorId=4', 'es')).toBe('/blog?page=2&editorId=4&lang=es');
  expect(staticPagePath('https://example.com/path?x=1', 'es')).toBe('https://example.com/path?x=1');
});
it('keeps the result language explicit when only the original FTS slug is known', async () => {
  const { blogSearchPath } = await import('../seoPolicy');
  expect(blogSearchPath('same-slug', 'en')).toBe('/blog/same-slug?lang=en');
  expect(blogSearchPath('english-original', 'es')).toBe('/blog/english-original?lang=es');
});
