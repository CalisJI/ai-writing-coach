import {createContext, useContext, useMemo, useState, type PropsWithChildren} from 'react';
import {useColorScheme} from 'react-native';
import {tokensFor, type ColorScheme, type PalettePreset, type ThemeTokens} from './tokens';

export type ThemePreference = 'system' | ColorScheme;

type ThemeContextValue = {
  preference: ThemePreference;
  scheme: ColorScheme;
  /** The learner's palette from their profile; see `theme_preset`. */
  preset: PalettePreset;
  tokens: ThemeTokens;
  setPreference: (preference: ThemePreference) => void;
  setPreset: (preset: PalettePreset) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({children, initialPreset = 'editorial'}: PropsWithChildren<{initialPreset?: PalettePreset}>) {
  const systemScheme = useColorScheme();
  const [preference, setPreference] = useState<ThemePreference>('system');
  // The learner picks a palette in Profile, exactly as on the web. Until that
  // profile loads, the default face is used rather than a second invented one.
  const [preset, setPreset] = useState<PalettePreset>(initialPreset);
  const scheme: ColorScheme = preference === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : preference;
  const value = useMemo(
    () => ({preference, scheme, preset, tokens: tokensFor(scheme, preset), setPreference, setPreset}),
    [preference, scheme, preset],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('useTheme must be used inside ThemeProvider');
  return value;
}
