import { describe, it, expect } from 'vitest';
import { injectMeta } from '../htmlInjector.js';
import type { PageMeta } from '../types.js';

const baseTemplate = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Robles.AI</title>
  <meta name="description" content="Default description">
  <meta property="og:title" content="Robles.AI" />
  <meta property="og:description" content="Default OG description" />
  <meta property="og:url" content="https://robles.ai/" />
  <meta property="og:type" content="website" />
  <meta property="og:image" content="https://robles.ai/images/logo.png" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="Robles.AI" />
  <meta name="twitter:description" content="Default Twitter description" />
  <meta name="twitter:image" content="https://robles.ai/images/logo.png" />
  <link rel="canonical" href="https://robles.ai/">
  <script type="application/ld+json">{"@context":"https://schema.org","@type":"Organization","name":"Robles.AI","url":"https://robles.ai"}</script>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.tsx"></script>
</body>
</html>`;

function createMeta(overrides: Partial<PageMeta> = {}): PageMeta {
  return {
    title: 'Test Blog Post Title',
    description: 'This is a test blog post description for SEO purposes.',
    ogTitle: 'Test Blog Post Title',
    ogDescription: 'This is a test blog post description for SEO purposes.',
    ogUrl: 'https://robles.ai/blog/test-post',
    ogType: 'article',
    ogImage: 'https://robles.ai/images/test.jpg',
    twitterCard: 'summary_large_image',
    twitterTitle: 'Test Blog Post Title',
    twitterDescription: 'This is a test blog post description for SEO purposes.',
    twitterImage: 'https://robles.ai/images/test.jpg',
    canonicalUrl: 'https://robles.ai/blog/test-post',
    hreflangLinks: [
      { hreflang: 'en', href: 'https://robles.ai/blog/test-post' },
      { hreflang: 'es', href: 'https://robles.ai/blog/test-post-es' },
      { hreflang: 'x-default', href: 'https://robles.ai/blog/test-post' },
    ],
    jsonLd: [
      {
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: 'Test Blog Post Title',
        description: 'This is a test blog post description for SEO purposes.',
      },
    ],
    ...overrides,
  };
}

describe('injectMeta', () => {
  it('replaces the <title> tag content', () => {
    const result = injectMeta(baseTemplate, createMeta());
    expect(result).toContain('<title>Test Blog Post Title</title>');
    expect(result).not.toContain('<title>Robles.AI</title>');
  });

  it('replaces the meta description', () => {
    const result = injectMeta(baseTemplate, createMeta());
    expect(result).toContain('<meta name="description" content="This is a test blog post description for SEO purposes.">');
    expect(result).not.toContain('content="Default description"');
  });

  it('replaces Open Graph meta tags', () => {
    const result = injectMeta(baseTemplate, createMeta());
    expect(result).toContain('<meta property="og:title" content="Test Blog Post Title">');
    expect(result).toContain('<meta property="og:description" content="This is a test blog post description for SEO purposes.">');
    expect(result).toContain('<meta property="og:url" content="https://robles.ai/blog/test-post">');
    expect(result).toContain('<meta property="og:type" content="article">');
    expect(result).toContain('<meta property="og:image" content="https://robles.ai/images/test.jpg">');
  });

  it('replaces Twitter Card meta tags', () => {
    const result = injectMeta(baseTemplate, createMeta());
    expect(result).toContain('<meta name="twitter:card" content="summary_large_image">');
    expect(result).toContain('<meta name="twitter:title" content="Test Blog Post Title">');
    expect(result).toContain('<meta name="twitter:description" content="This is a test blog post description for SEO purposes.">');
    expect(result).toContain('<meta name="twitter:image" content="https://robles.ai/images/test.jpg">');
  });

  it('removes existing canonical link and inserts new one', () => {
    const result = injectMeta(baseTemplate, createMeta());
    expect(result).not.toContain('href="https://robles.ai/"');
    expect(result).toContain('<link rel="canonical" href="https://robles.ai/blog/test-post" />');
  });

  it('inserts hreflang link tags', () => {
    const result = injectMeta(baseTemplate, createMeta());
    expect(result).toContain('<link rel="alternate" hreflang="en" href="https://robles.ai/blog/test-post" />');
    expect(result).toContain('<link rel="alternate" hreflang="es" href="https://robles.ai/blog/test-post-es" />');
    expect(result).toContain('<link rel="alternate" hreflang="x-default" href="https://robles.ai/blog/test-post" />');
  });

  it('preserves existing Organization JSON-LD schema', () => {
    const result = injectMeta(baseTemplate, createMeta());
    expect(result).toContain('"@type":"Organization"');
    expect(result).toContain('"name":"Robles.AI"');
  });

  it('injects new JSON-LD blocks', () => {
    const result = injectMeta(baseTemplate, createMeta());
    expect(result).toContain('"@type":"BlogPosting"');
    expect(result).toContain('"headline":"Test Blog Post Title"');
  });

  it('does NOT modify <body> content', () => {
    const bodyStart = baseTemplate.indexOf('<body>');
    const expectedBody = baseTemplate.slice(bodyStart);
    const result = injectMeta(baseTemplate, createMeta());
    const resultBody = result.slice(result.indexOf('<body>'));
    expect(resultBody).toBe(expectedBody);
  });

  it('handles template without existing meta description (inserts new one)', () => {
    const templateNoDesc = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Robles.AI</title>
</head>
<body>
  <div id="root"></div>
</body>
</html>`;
    const result = injectMeta(templateNoDesc, createMeta());
    expect(result).toContain('<meta name="description" content="This is a test blog post description for SEO purposes.">');
  });

  it('handles template without existing OG tags (inserts new ones)', () => {
    const templateNoOG = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Robles.AI</title>
  <meta name="description" content="Default">
</head>
<body>
  <div id="root"></div>
</body>
</html>`;
    const result = injectMeta(templateNoOG, createMeta());
    expect(result).toContain('<meta property="og:title" content="Test Blog Post Title">');
    expect(result).toContain('<meta property="og:url" content="https://robles.ai/blog/test-post">');
  });

  it('returns HTML unchanged when no </head> tag exists', () => {
    const noHead = '<html><body>Hello</body></html>';
    const result = injectMeta(noHead, createMeta());
    expect(result).toBe(noHead);
  });

  it('does not inject JSON-LD when meta.jsonLd is undefined', () => {
    const result = injectMeta(baseTemplate, createMeta({ jsonLd: undefined }));
    expect(result).toContain('"@type":"Organization"'); // Organization preserved
    expect(result).not.toContain('"@type":"BlogPosting"');
  });

  it('does not inject JSON-LD when meta.jsonLd is empty array', () => {
    const result = injectMeta(baseTemplate, createMeta({ jsonLd: [] }));
    expect(result).toContain('"@type":"Organization"'); // Organization preserved
    expect(result).not.toContain('"@type":"BlogPosting"');
  });

  it('escapes special characters in title', () => {
    const result = injectMeta(baseTemplate, createMeta({ title: 'AI & ML: <The Future>' }));
    expect(result).toContain('<title>AI &amp; ML: &lt;The Future&gt;</title>');
  });

  it('escapes special characters in attribute values', () => {
    const result = injectMeta(baseTemplate, createMeta({ description: 'Test "with" quotes & ampersands' }));
    expect(result).toContain('content="Test &quot;with&quot; quotes &amp; ampersands"');
  });

  it('handles multiple hreflang links without existing alternate tags', () => {
    const templateNoAlternate = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Test</title>
</head>
<body><div id="root"></div></body>
</html>`;
    const result = injectMeta(templateNoAlternate, createMeta());
    expect(result).toContain('hreflang="en"');
    expect(result).toContain('hreflang="es"');
    expect(result).toContain('hreflang="x-default"');
  });

  it('removes existing alternate hreflang tags before inserting new ones', () => {
    const templateWithAlternate = `<!DOCTYPE html>
<html lang="en">
<head>
  <title>Test</title>
  <link rel="alternate" hreflang="en" href="https://robles.ai/old" />
  <link rel="alternate" hreflang="es" href="https://robles.ai/old-es" />
</head>
<body><div id="root"></div></body>
</html>`;
    const result = injectMeta(templateWithAlternate, createMeta());
    expect(result).not.toContain('href="https://robles.ai/old"');
    expect(result).not.toContain('href="https://robles.ai/old-es"');
    expect(result).toContain('href="https://robles.ai/blog/test-post"');
  });
});
