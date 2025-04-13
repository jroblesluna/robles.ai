import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    debug: import.meta.env.DEV,
    resources: {
      en: { translation: await import('./locales/en/translation.json') },
      es: { translation: await import('./locales/es/translation.json') }
    },
    interpolation: {
      escapeValue: false
    }
  })

export default i18n
