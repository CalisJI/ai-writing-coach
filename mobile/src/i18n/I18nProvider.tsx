import {createContext, useContext, useMemo, useState, type PropsWithChildren} from 'react';
import {getLocales} from 'expo-localization';
import {messages, translate, type Locale, type MessageId} from './messages';

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (id: MessageId) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

function deviceLocale(): Locale {
  try {
    return getLocales()[0]?.languageCode?.toLowerCase() === 'zh' ? 'zh' : 'en';
  } catch {
    return 'en';
  }
}

export function I18nProvider({children, initialLocale}: PropsWithChildren<{initialLocale?: Locale}>) {
  const [locale, setLocale] = useState<Locale>(initialLocale ?? deviceLocale());
  const value = useMemo(() => ({locale, setLocale, t: (id: MessageId) => translate(locale, id)}), [locale]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const value = useContext(I18nContext);
  if (!value) throw new Error('useI18n must be used inside I18nProvider');
  return value;
}

export {messages};
