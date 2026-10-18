import { I18nextProvider } from 'react-i18next';
import type { i18n } from 'i18next';
import type { QueryClient } from '@tanstack/react-query';
import { Router } from 'wouter';
import App from './App';

/** Identical provider/component tree for server rendering and client hydration. */
export function Root({ instance, path, client }: { instance: i18n; path: string; client?: QueryClient }) {
  return <I18nextProvider i18n={instance}><Router ssrPath={path}><App client={client} /></Router></I18nextProvider>;
}
