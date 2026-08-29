import {createContext, useContext, useMemo, useState, type PropsWithChildren} from 'react';
import {useColorScheme} from 'react-native';
import {tokensFor, type ColorScheme, type ThemeTokens} from './tokens';

export type ThemePreference = 'system' | ColorScheme;

type ThemeContextValue = {
  preference: ThemePreference;
  scheme: ColorScheme;
  tokens: ThemeTokens;
  setPreference: (preference: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({children}: PropsWithChildren) {
  const systemScheme = useColorScheme();
  const [preference, setPreference] = useState<ThemePreference>('system');
  const scheme: ColorScheme = preference === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : preference;
  const value = useMemo(() => ({preference, scheme, tokens: tokensFor(scheme), setPreference}), [preference, scheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('useTheme must be used inside ThemeProvider');
  return value;
}
