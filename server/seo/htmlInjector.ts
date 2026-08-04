import type { PageMeta } from './types.js';

/**
 * Injects SEO meta tags into an HTML string's <head> section.
 *
 * Replaces title, description, Open Graph, Twitter Card, canonical/hreflang links,
 * and JSON-LD blocks while preserving the existing Organization schema and
 * guaranteeing no modification to <body> content.
 */
export function injectMeta(html: string, meta: PageMeta): string {
  // Split at </head> to isolate head from body — ensures body is never modified
  const headEndIndex = html.indexOf('</head>');
  if (headEndIndex === -1) {
    // If no </head> found, return HTML unchanged
    return html;
  }

  let head = html.slice(0, headEndIndex);
  const rest = html.slice(headEndIndex); // includes </head> and everything after

  // 1. Replace <title>...</title>
  head = head.replace(/<title>[^<]*<\/title>/i, `<title>${escapeReplacement(escapeHtml(meta.title))}</title>`);

  // 2. Replace or insert <meta name="description">
  head = replaceOrInsertMeta(head, 'name', 'description', meta.description);

  // 3. Replace or insert Open Graph meta tags
  head = replaceOrInsertProperty(head, 'og:title', meta.ogTitle);
  head = replaceOrInsertProperty(head, 'og:description', meta.ogDescription);
  head = replaceOrInsertProperty(head, 'og:url', meta.ogUrl);
  head = replaceOrInsertProperty(head, 'og:type', meta.ogType);
  head = replaceOrInsertProperty(head, 'og:image', meta.ogImage);

  // 4. Replace or insert Twitter Card meta tags
  head = replaceOrInsertMeta(head, 'name', 'twitter:card', meta.twitterCard);
  head = replaceOrInsertMeta(head, 'name', 'twitter:title', meta.twitterTitle);
  head = replaceOrInsertMeta(head, 'name', 'twitter:description', meta.twitterDescription);
  head = replaceOrInsertMeta(head, 'name', 'twitter:image', meta.twitterImage);

  // 5. Remove existing canonical and alternate hreflang link tags
  head = head.replace(/<link\s+[^>]*rel=["']canonical["'][^>]*\/?>/gi, '');
  head = head.replace(/<link\s+[^>]*rel=["']alternate["'][^>]*hreflang=["'][^"']*["'][^>]*\/?>/gi, '');
  // Also catch alternate tags where hreflang comes before rel
  head = head.replace(/<link\s+[^>]*hreflang=["'][^"']*["'][^>]*rel=["']alternate["'][^>]*\/?>/gi, '');

  // 6. Insert canonical link tag
  const canonicalTag = `  <link rel="canonical" href="${escapeAttr(meta.canonicalUrl)}" />`;

  // 7. Build hreflang link tags
  const hreflangTags = meta.hreflangLinks
    .map(link => `  <link rel="alternate" hreflang="${escapeAttr(link.hreflang)}" href="${escapeAttr(link.href)}" />`)
    .join('\n');

  // 8. Handle JSON-LD blocks
  // Extract existing JSON-LD blocks to check for Organization schema
  const jsonLdRegex = /<script\s+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  const existingJsonLdBlocks: string[] = [];
  let jsonLdMatch: RegExpExecArray | null;

  // Collect existing JSON-LD blocks
  const jsonLdMatches = head.match(jsonLdRegex);
  if (jsonLdMatches) {
    for (const block of jsonLdMatches) {
      // Parse the JSON to check if it's an Organization schema
      const contentMatch = /<script\s+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i.exec(block);
      if (contentMatch) {
        try {
          const parsed = JSON.parse(contentMatch[1]);
          if (parsed['@type'] === 'Organization') {
            existingJsonLdBlocks.push(block.trim());
          }
        } catch {
          // If we can't parse it, discard it
        }
      }
    }
  }

  // Remove all existing JSON-LD blocks from head
  head = head.replace(jsonLdRegex, '');

  // Build new JSON-LD blocks from meta.jsonLd
  let newJsonLdTags = '';
  if (meta.jsonLd && meta.jsonLd.length > 0) {
    newJsonLdTags = meta.jsonLd
      .map(obj => `  <script type="application/ld+json">${JSON.stringify(obj)}</script>`)
      .join('\n');
  }

  // Combine preserved Organization blocks + new JSON-LD blocks
  const allJsonLdTags = [
    ...existingJsonLdBlocks.map(block => `  ${block}`),
    ...(newJsonLdTags ? [newJsonLdTags] : []),
  ].join('\n');

  // Clean up any trailing whitespace/newlines before assembling
  head = head.trimEnd();

  // Assemble the final head with injected link tags and JSON-LD
  const injectedTags = [
    canonicalTag,
    ...(hreflangTags ? [hreflangTags] : []),
    ...(allJsonLdTags ? [allJsonLdTags] : []),
  ].join('\n');

  head = `${head}\n${injectedTags}\n`;

  return head + rest;
}

/**
 * Replace or insert a meta tag with name attribute.
 * e.g. <meta name="description" content="...">
 */
function replaceOrInsertMeta(head: string, attr: 'name' | 'property', name: string, content: string): string {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(
    `<meta\\s+${attr}=["']${escapedName}["'][^>]*\\/?>`,
    'i'
  );
  // Also match when content comes before name
  const regexReversed = new RegExp(
    `<meta\\s+content=["'][^"']*["']\\s+${attr}=["']${escapedName}["'][^>]*\\/?>`,
    'i'
  );

  const newTag = `  <meta ${attr}="${name}" content="${escapeAttr(content)}">`;

  if (regex.test(head)) {
    return head.replace(regex, escapeReplacement(newTag));
  } else if (regexReversed.test(head)) {
    return head.replace(regexReversed, escapeReplacement(newTag));
  }

  // Insert after the last existing meta tag
  const lastMetaIndex = head.lastIndexOf('<meta ');
  if (lastMetaIndex !== -1) {
    // Find the end of that meta tag
    const endOfMeta = head.indexOf('>', lastMetaIndex);
    if (endOfMeta !== -1) {
      return head.slice(0, endOfMeta + 1) + '\n' + newTag + head.slice(endOfMeta + 1);
    }
  }

  // Fallback: insert before </head> position (end of head string)
  return head + '\n' + newTag;
}

/**
 * Replace or insert an Open Graph meta tag with property attribute.
 * e.g. <meta property="og:title" content="...">
 */
function replaceOrInsertProperty(head: string, property: string, content: string): string {
  return replaceOrInsertMeta(head, 'property', property, content);
}

/** Escape special HTML characters for text content. */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** Escape special characters for HTML attribute values. */
function escapeAttr(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** Escape special characters in a replacement string for String.prototype.replace(). */
function escapeReplacement(str: string): string {
  return str.replace(/\$/g, '$$$$');
}


