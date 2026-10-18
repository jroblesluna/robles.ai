import { renderToString } from 'react-dom/server';
import { createInstance } from 'i18next';
import { QueryClient } from '@tanstack/react-query';
import { explicitLanguage } from '@shared/seoPolicy';
import { Root } from './Root';
import en from './i18n/locales/en/translation.json';

/** Vite builds this public-only renderer separately from the Express bundle.
 * All state/resources belong to this request. Effects, jobs, analytics and chat
 * sessions do not run on the server. Only the home route is enabled for hydration.
 */
export async function renderHome(path: string, translations: Record<string, unknown>): Promise<string> {
  const url = new URL(path, 'https://robles.ai');
  if (url.pathname !== '/') throw new Error('This renderer only accepts the public home route');
  const lang = explicitLanguage(url.searchParams.get('lang')) ?? 'en';
  const instance = createInstance();
  await instance.init({ lng: lang, fallbackLng: 'en', resources: { en: { translation: en }, [lang]: { translation: translations } }, interpolation: { escapeValue: false } });
  const client = new QueryClient({ defaultOptions: { queries: { enabled: false, retry: false } } });
  try { return renderToString(<Root instance={instance} path={url.pathname + url.search} client={client} />); }
  finally { client.clear(); }
}
