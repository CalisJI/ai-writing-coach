export const palette = {
  navy: '#102A43',
  blue: '#2F80ED',
  sky: '#EAF3FF',
  ink: '#102A43',
  slate: '#486581',
  canvas: '#F7FAFC',
  white: '#FFFFFF',
  nightCanvas: '#0B1726',
  nightSurface: '#13263A',
  nightText: '#F0F4F8',
  nightMuted: '#B8C7D9',
  danger: '#B42318',
  dangerSurface: '#FEE4E2',
} as const;

// A single reading measure for every learner screen. Without it a full-width
// container stretches a call to action across a landscape phone or a tablet,
// which reads as a banner rather than a control.
export const MAX_CONTENT_WIDTH = 640;

export type ColorScheme = 'light' | 'dark';

export type ThemeTokens = {
  scheme: ColorScheme;
  colors: {
    background: string;
    surface: string;
    text: string;
    mutedText: string;
    accent: string;
    danger: string;
    dangerSurface: string;
  };
  spacing: {small: number; medium: number; large: number};
  radius: {card: number; control: number};
};

export const tokensFor = (scheme: ColorScheme): ThemeTokens => ({
  scheme,
  colors: scheme === 'dark'
    ? {
        background: palette.nightCanvas,
        surface: palette.nightSurface,
        text: palette.nightText,
        mutedText: palette.nightMuted,
        accent: '#76B7FF',
        danger: '#FDA29B',
        dangerSurface: '#5B1A16',
      }
    : {
        background: palette.canvas,
        surface: palette.white,
        text: palette.ink,
        mutedText: palette.slate,
        accent: palette.blue,
        danger: palette.danger,
        dangerSurface: palette.dangerSurface,
      },
  spacing: {small: 8, medium: 16, large: 24},
  radius: {card: 16, control: 12},
});
