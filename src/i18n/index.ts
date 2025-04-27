import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

// Inicialización asíncrona de i18next
export const initI18n = async () => {
  const en = await import('./locales/en/translation.json');
  const es = await import('./locales/es/translation.json');

  i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
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

initI18n();

export default i18n;
