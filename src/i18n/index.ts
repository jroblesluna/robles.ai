import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { explicitLanguage, normalizeLanguage } from '@shared/seoPolicy'

// Inicialización asíncrona de i18next
export const initI18n = async () => {
  const en = await import('./locales/en/translation.json');
  const es = await import('./locales/es/translation.json');

  await i18n
    .use(initReactI18next)
    .init({
      lng: explicitLanguage(new URLSearchParams(window.location.search).get('lang')) ?? normalizeLanguage(document.documentElement.lang),
      supportedLngs: ['en', 'es'],
      load: 'languageOnly',
      fallbackLng: 'en',
      debug: import.meta.env.DEV,
      resources: {
        en: { translation: en.default },
        es: { translation: es.default }
      },
      interpolation: {
        escapeValue: false
      }
    });
};
//console.log("Index.ts: initI18n() called");
//initI18n();
//console.log("Index.ts: initI18n() finished");

export default i18n;
