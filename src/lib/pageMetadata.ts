import type { PageMeta } from '../../server/seo/types';
const selector = 'title,meta[name="description"],meta[name="robots"],meta[property^="og:"],meta[name^="twitter:"],link[rel="canonical"],link[rel="alternate"][hreflang],script[type="application/ld+json"]';
export function snapshotPageMetadata() {
  const nodes = Array.from(document.head.querySelectorAll(selector), node => node.cloneNode(true));
  const lang = document.documentElement.lang;
  return () => {
    document.head.querySelectorAll(selector).forEach(node => node.remove());
    nodes.forEach(node => document.head.appendChild(node.cloneNode(true)));
    document.documentElement.lang = lang;
  };
}
export function applyPageMetadata(meta: PageMeta) {
  document.title = meta.title;
  if (meta.language) document.documentElement.lang = meta.language;
  const update = (attr: 'name' | 'property', key: string, value: string) => {
    const matches = document.head.querySelectorAll<HTMLMetaElement>(`meta[${attr}="${key}"]`);
    const node = matches[0] ?? document.createElement('meta');
    Array.from(matches).slice(1).forEach(n => n.remove());
    node.setAttribute(attr, key); node.content = value;
    if (!node.parentNode) document.head.appendChild(node);
  };
  update('name', 'description', meta.description);
  document.head.querySelectorAll('meta[name="robots"]').forEach(n => n.remove());
  if (meta.robots) update('name', 'robots', meta.robots);
  for (const [key, value] of Object.entries({ title: meta.ogTitle, description: meta.ogDescription, url: meta.ogUrl, type: meta.ogType, image: meta.ogImage })) update('property', `og:${key}`, value);
  for (const [key, value] of Object.entries({ card: meta.twitterCard, title: meta.twitterTitle, description: meta.twitterDescription, image: meta.twitterImage })) update('name', `twitter:${key}`, value);
  document.head.querySelectorAll('link[rel="canonical"],link[rel="alternate"][hreflang]').forEach(n => n.remove());
  const canonical = document.createElement('link'); canonical.rel = 'canonical'; canonical.href = meta.canonicalUrl; document.head.appendChild(canonical);
  meta.hreflangLinks.forEach(link => {
    const node = document.createElement('link'); node.rel = 'alternate'; node.hreflang = link.hreflang; node.href = link.href; document.head.appendChild(node);
  });
  document.head.querySelectorAll('script[type="application/ld+json"]').forEach(n => {
    try { if (JSON.parse(n.textContent || '{}')['@type'] === 'Organization') return; } catch { /* replace invalid SEO JSON */ }
    n.remove();
  });
  meta.jsonLd?.forEach(data => { const node = document.createElement('script'); node.type = 'application/ld+json'; node.textContent = JSON.stringify(data); document.head.appendChild(node); });
}
