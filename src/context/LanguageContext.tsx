import React, { createContext, useContext, useState, useEffect } from 'react';
import heTranslations from '../i18n/translations/he.json';
import enTranslations from '../i18n/translations/en.json';

type Language = 'he' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: Record<string, string>) => string;
  dir: 'rtl' | 'ltr';
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const translations = {
  he: heTranslations,
  en: enTranslations
};

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  // Load language from localStorage or default to Hebrew
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('partner_language');
    return (saved === 'en' || saved === 'he') ? saved : 'he';
  });

  // Save language preference to localStorage
  useEffect(() => {
    localStorage.setItem('partner_language', language);
    // Update document direction
    document.documentElement.dir = language === 'he' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  // Translation function
  const t = (key: string, params?: Record<string, string>): string => {
    const keys = key.split('.');
    let value: any = translations[language];

    for (const k of keys) {
      if (value && typeof value === 'object') {
        value = value[k];
      } else {
        return key; // Return key if translation not found
      }
    }

    if (typeof value !== 'string') {
      return key;
    }

    // Replace parameters
    if (params) {
      Object.keys(params).forEach(param => {
        value = value.replace(`{${param}}`, params[param]);
      });
    }

    return value;
  };

  const dir = language === 'he' ? 'rtl' : 'ltr';

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, dir }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
}


