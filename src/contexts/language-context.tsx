
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useState, useEffect, useCallback } from 'react';
import type { Locale, Translations, CalendarSystem } from '@/types'; // Added CalendarSystem
import { DEFAULT_LOCALE, SUPPORTED_LOCALES, DEFAULT_CALENDAR_SYSTEM } from '@/constants'; // Added DEFAULT_CALENDAR_SYSTEM

interface LanguageContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  translations: Translations;
  t: (key: string, replacements?: Record<string, string | number>) => string;
  preferredCalendarSystem: CalendarSystem; // New
  setPreferredCalendarSystem: (system: CalendarSystem) => void; // New
}

export const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

interface LanguageProviderProps {
  children: ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);
  const [translations, setTranslations] = useState<Translations>({});
  const [preferredCalendarSystem, setPreferredCalendarSystemState] = useState<CalendarSystem>(DEFAULT_CALENDAR_SYSTEM); // New

  useEffect(() => {
    const storedLocale = localStorage.getItem('locale') as Locale | null;
    if (storedLocale && SUPPORTED_LOCALES.some(l => l.code === storedLocale)) {
      setLocaleState(storedLocale);
    }

    const storedCalendarSystem = localStorage.getItem('calendarSystem') as CalendarSystem | null; // New
    if (storedCalendarSystem && (storedCalendarSystem === 'gregorian' || storedCalendarSystem === 'ethiopian')) { // New
      setPreferredCalendarSystemState(storedCalendarSystem); // New
    } // New
  }, []);

  useEffect(() => {
    const fetchTranslations = async () => {
      try {
        const response = await fetch(`/locales/${locale}/common.json`);
        if (!response.ok) {
          throw new Error(`Failed to load translations for ${locale}`);
        }
        const data = await response.json();
        setTranslations(data);
      } catch (error) {
        console.error(error);
        if (locale !== DEFAULT_LOCALE) {
          const response = await fetch(`/locales/${DEFAULT_LOCALE}/common.json`);
          const data = await response.json();
          setTranslations(data);
        }
      }
    };

    fetchTranslations();
  }, [locale]);

  const setLocale = (newLocale: Locale) => {
    if (SUPPORTED_LOCALES.some(l => l.code === newLocale)) {
      setLocaleState(newLocale);
      localStorage.setItem('locale', newLocale);
    }
  };

  const setPreferredCalendarSystem = (system: CalendarSystem) => { // New function
    setPreferredCalendarSystemState(system);
    localStorage.setItem('calendarSystem', system);
  };

  const t = useCallback((key: string, replacements?: Record<string, string | number>): string => {
    const keys = key.split('.');
    let text: string | Translations | undefined = translations;
    for (const k of keys) {
      if (typeof text === 'object' && text !== null && k in text) {
        text = text[k];
      } else {
        text = undefined;
        break;
      }
    }

    if (typeof text !== 'string') {
      return key; 
    }
    
    if (replacements) {
      return Object.entries(replacements).reduce((acc, [placeholder, value]) => {
        return acc.replace(new RegExp(`{${placeholder}}`, 'g'), String(value));
      }, text);
    }

    return text;
  }, [translations, locale]);

  return (
    <LanguageContext.Provider value={{ locale, setLocale, translations, t, preferredCalendarSystem, setPreferredCalendarSystem }}>
      {children}
    </LanguageContext.Provider>
  );
};
