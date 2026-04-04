import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { translations, Language, weatherTranslations, moodTranslations } from '@/i18n/translations';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: typeof translations.zh;
  toggleLanguage: () => void;
  translateWeather: (value: string) => string;
  translateMood: (value: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const LANGUAGE_STORAGE_KEY = '@voxora_language';

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('zh');

  useEffect(() => {
    // Load saved language preference
    const loadLanguage = async () => {
      try {
        const savedLang = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
        if (savedLang === 'zh' || savedLang === 'en') {
          setLanguageState(savedLang);
        }
      } catch (error) {
        console.error('Failed to load language preference:', error);
      }
    };
    loadLanguage();
  }, []);

  const setLanguage = useCallback(async (lang: Language) => {
    try {
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
      setLanguageState(lang);
    } catch (error) {
      console.error('Failed to save language preference:', error);
    }
  }, []);

  const toggleLanguage = useCallback(() => {
    const newLang = language === 'zh' ? 'en' : 'zh';
    setLanguage(newLang);
  }, [language, setLanguage]);

  // 翻译天气值
  const translateWeather = useCallback((value: string): string => {
    if (!value) return value;
    const translation = weatherTranslations[value];
    return translation ? translation[language] : value;
  }, [language]);

  // 翻译心情值
  const translateMood = useCallback((value: string): string => {
    if (!value) return value;
    const translation = moodTranslations[value];
    return translation ? translation[language] : value;
  }, [language]);

  const t = translations[language];

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, toggleLanguage, translateWeather, translateMood }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
