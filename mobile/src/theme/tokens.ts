/**
 * Orena design tokens for the native client.
 *
 * These mirror `static/becoming/theme.css`, which is authoritative. The native
 * client previously invented a navy/blue palette of its own, so the app did not
 * look like the product it belongs to. Values here are copied from that
 * stylesheet rather than approximated; when the web tokens change, change these
 * in the same revision.
 */

export type ColorScheme = 'light' | 'dark';

/** The learner-selectable palettes, matching `theme_preset` in the profile contract. */
export type PalettePreset = 'editorial' | 'sage' | 'clay' | 'blueprint';

export const PALETTE_PRESETS: readonly PalettePreset[] = ['editorial', 'sage', 'clay', 'blueprint'];

/**
 * Ink and semantic colours are shared by every preset: the presets in theme.css
 * override canvas, surfaces, borders and accent only.
 */
const shared = {
  light: {
    inkStrong: '#111214',
    ink: '#303236',
    inkMuted: '#72757B',
    positive: '#2F8F5B',
    attention: '#D89B22',
    important: '#D75B45',
    informational: '#3F70C8',
  },
  dark: {
    inkStrong: '#F5F4EF',
    ink: '#D8D9D3',
    inkMuted: '#9A9E96',
    positive: '#63B988',
    attention: '#E0AF50',
    important: '#E47A68',
    informational: '#7FA2E4',
  },
} as const;

type PaletteFamily = {
  canvas: string;
  surface: string;
  surfaceMuted: string;
  borderSubtle: string;
  borderStrong: string;
  accent600: string;
  accent500: string;
  accent100: string;
};

const families: Record<PalettePreset, Record<ColorScheme, PaletteFamily>> = {
  editorial: {
    light: {canvas: '#F7F7F5', surface: '#FFFFFF', surfaceMuted: '#F0F1EF', borderSubtle: '#E4E5E2', borderStrong: '#D2D4D0', accent600: '#FF6A1A', accent500: '#FF7A2F', accent100: '#FFF0E6'},
    dark: {canvas: '#111310', surface: '#181B17', surfaceMuted: '#20231F', borderSubtle: '#2D312B', borderStrong: '#40453D', accent600: '#FF7A2F', accent500: '#FF8A46', accent100: '#3A2417'},
  },
  sage: {
    light: {canvas: '#F3F6F1', surface: '#FBFCFA', surfaceMuted: '#E9EFE7', borderSubtle: '#DCE5D9', borderStrong: '#C8D3C4', accent600: '#55735B', accent500: '#66856C', accent100: '#E4EEE2'},
    dark: {canvas: '#111611', surface: '#171D17', surfaceMuted: '#1E271F', borderSubtle: '#29342A', borderStrong: '#3B4A3D', accent600: '#8DB397', accent500: '#9BC1A5', accent100: '#233228'},
  },
  clay: {
    light: {canvas: '#F8F3EE', surface: '#FFFDFC', surfaceMuted: '#F1E7DE', borderSubtle: '#E7D9CE', borderStrong: '#D5C1B2', accent600: '#A45F43', accent500: '#B66B4E', accent100: '#F5E2D6'},
    dark: {canvas: '#17120F', surface: '#201916', surfaceMuted: '#2A211D', borderSubtle: '#382C27', borderStrong: '#4B3B34', accent600: '#D08A68', accent500: '#DE9A78', accent100: '#3A251C'},
  },
  blueprint: {
    light: {canvas: '#F2F5F7', surface: '#FCFDFE', surfaceMuted: '#E8EEF2', borderSubtle: '#D9E1E7', borderStrong: '#C4D0D8', accent600: '#466C85', accent500: '#557E98', accent100: '#E0ECF3'},
    dark: {canvas: '#10151A', surface: '#161D23', surfaceMuted: '#1D2730', borderSubtle: '#293640', borderStrong: '#3A4C59', accent600: '#82A9C0', accent500: '#93B8CE', accent100: '#213441'},
  },
};

/** Kept for compatibility with existing imports; editorial light is the default face. */
export const palette = {
  canvas: families.editorial.light.canvas,
  surface: families.editorial.light.surface,
  ink: shared.light.ink,
  inkStrong: shared.light.inkStrong,
  inkMuted: shared.light.inkMuted,
  accent: families.editorial.light.accent600,
} as const;

/** `--space-*` from base.css. */
export const space = {1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40, 12: 48, 16: 64} as const;

/** `--radius-*` from base.css. */
export const radii = {small: 8, control: 10, object: 14, surface: 18, hero: 22} as const;

/** `--font-size-*` from base.css. */
export const fontSizes = {meta: 12, ui: 14, body: 16, bodyLarge: 18, h3: 22, h2: 28, h1: 36, displayLarge: 48} as const;

/**
 * `--font-ui-latin` is Inter on the web. No font file is bundled here, so the
 * native client uses the platform UI face rather than silently substituting a
 * different one; weights and sizes still follow the web scale.
 */
export const fontWeights = {regular: '400', medium: '500', semibold: '600', bold: '700'} as const;

// A single reading measure for every learner screen. Without it a full-width
// container stretches a call to action across a landscape phone or a tablet,
// which reads as a banner rather than a control.
export const MAX_CONTENT_WIDTH = 640;

export type ThemeTokens = {
  scheme: ColorScheme;
  preset: PalettePreset;
  colors: {
    background: string;
    surface: string;
    surfaceMuted: string;
    /** Body copy. Headings use `heading`. */
    text: string;
    heading: string;
    mutedText: string;
    border: string;
    borderStrong: string;
    accent: string;
    accentHover: string;
    accentSoft: string;
    /** Text and icons placed on an accent fill. */
    onAccent: string;
    positive: string;
    attention: string;
    danger: string;
    dangerSurface: string;
    informational: string;
  };
  spacing: {small: number; medium: number; large: number};
  radius: {card: number; control: number};
  space: typeof space;
  radii: typeof radii;
  fontSizes: typeof fontSizes;
  fontWeights: typeof fontWeights;
};

export const tokensFor = (scheme: ColorScheme, preset: PalettePreset = 'editorial'): ThemeTokens => {
  const family = (families[preset] ?? families.editorial)[scheme];
  const ink = shared[scheme];
  return {
    scheme,
    preset: families[preset] ? preset : 'editorial',
    colors: {
      background: family.canvas,
      surface: family.surface,
      surfaceMuted: family.surfaceMuted,
      text: ink.ink,
      heading: ink.inkStrong,
      mutedText: ink.inkMuted,
      border: family.borderSubtle,
      borderStrong: family.borderStrong,
      accent: family.accent600,
      accentHover: family.accent500,
      accentSoft: family.accent100,
      // Dark accents are light enough that dark text is the readable pairing.
      onAccent: scheme === 'dark' ? '#111310' : '#FFFFFF',
      positive: ink.positive,
      attention: ink.attention,
      danger: ink.important,
      dangerSurface: family.surfaceMuted,
      informational: ink.informational,
    },
    spacing: {small: space[2], medium: space[4], large: space[6]},
    radius: {card: radii.surface, control: radii.control},
    space,
    radii,
    fontSizes,
    fontWeights,
  };
};
