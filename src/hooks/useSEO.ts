import { useEffect } from 'react';
import { useLocation, useSearch } from 'wouter';
import { useTranslation } from 'react-i18next';
import { STATIC_PAGES, normalizeLanguage, archivePage } from '@shared/seoPolicy';
import { buildStaticMeta, buildHomeJsonLd } from '@shared/seoMetadata';
import { applyPageMetadata } from '@/lib/pageMetadata';

export function useSEO() {
  const [location] = useLocation();
  const search = useSearch();
  const { i18n } = useTranslation();
  useEffect(() => {
    if (location.startsWith('/blog/')) return;
    const lang = normalizeLanguage(i18n.resolvedLanguage || i18n.language);
    const query = new URLSearchParams(search);
    const meta = buildStaticMeta(STATIC_PAGES[location] ? location : '/', lang, i18n.getResourceBundle(lang, 'translation') ?? {}, {
      page: location === '/blog' ? archivePage(query.get('page')) : 1,
      filtered: location === '/blog' && ['q', 'editorId', 'days'].some(k => query.has(k)),
    });
    if (location === '/') meta.jsonLd = buildHomeJsonLd();
    if (!STATIC_PAGES[location]) {
      const utility = location === '/admin' || location.startsWith('/admin/') || location === '/otp';
      meta.title = utility ? (location === '/otp' ? 'Verification | Robles.AI' : 'Admin | Robles.AI') : (lang === 'es' ? 'Página no encontrada | Robles.AI' : 'Page not found | Robles.AI');
      meta.ogTitle = meta.twitterTitle = meta.title;
      meta.canonicalUrl = meta.ogUrl = `https://robles.ai${location}`;
      meta.hreflangLinks = [];
      meta.robots = 'noindex,nofollow';
    }
    applyPageMetadata(meta);
  }, [location, search, i18n, i18n.language]);
}
