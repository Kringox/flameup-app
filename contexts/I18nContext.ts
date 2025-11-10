import React, { createContext, useContext, ReactNode } from 'react';
import { en } from '../locales/en.ts';
import { de } from '../locales/de.ts';

type Language = 'en' | 'de';

const translations = { en, de };

interface I18nContextType {
  language: Language;
  t: (key: keyof typeof en) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export const I18nProvider: React.FC<{ children: ReactNode; language: Language }> = ({ children, language }) => {
  const t = (key: keyof typeof en): string => {
    return translations[language][key] || translations['en'][key];
  };

  // FIX: Replace JSX with React.createElement to resolve parsing errors in a .ts file.
  return React.createElement(I18nContext.Provider, { value: { language, t } }, children);
};

export const useI18n = (): I18nContextType => {
  const context = useContext(I18nContext);
  if (context === undefined) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
};