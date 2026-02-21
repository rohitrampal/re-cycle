import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import en from './locales/en.json';
import hi from './locales/hi.json';
import mr from './locales/mr.json';
import gu from './locales/gu.json';
import pa from './locales/pa.json';
import ur from './locales/ur.json';
import bn from './locales/bn.json';
import te from './locales/te.json';
import ta from './locales/ta.json';
import kn from './locales/kn.json';
import or from './locales/or.json';
import ml from './locales/ml.json';

const resources = {
  en: { translation: en },
  hi: { translation: hi },
  mr: { translation: mr },
  gu: { translation: gu },
  pa: { translation: pa },
  ur: { translation: ur },
  bn: { translation: bn },
  te: { translation: te },
  ta: { translation: ta },
  kn: { translation: kn },
  or: { translation: or },
  ml: { translation: ml }
};

/** Supported language codes (used by i18n and language selector). */
export const SUPPORTED_LANG_CODES = ['en', 'hi', 'mr', 'gu', 'pa', 'ur', 'bn', 'te', 'ta', 'kn', 'or', 'ml'] as const;

/** Display names for the language selector (code -> native name). */
export const LANGUAGE_NAMES: Record<(typeof SUPPORTED_LANG_CODES)[number], string> = {
  en: 'English',
  hi: 'हिंदी',
  mr: 'मराठी',
  gu: 'ગુજરાતી',
  pa: 'ਪੰਜਾਬੀ',
  ur: 'اردو',
  bn: 'বাংলা',
  te: 'తెలుగు',
  ta: 'தமிழ்',
  kn: 'ಕನ್ನಡ',
  or: 'ଓଡ଼ିଆ',
  ml: 'മലയാളം'
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    supportedLngs: SUPPORTED_LANG_CODES,
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage']
    },
    interpolation: {
      escapeValue: false
    },
    react: {
      useSuspense: false
    }
  });

export default i18n;
