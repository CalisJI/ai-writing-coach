/**
 * Orena design tokens for the native client.
 *
 * Ported from `static/becoming/orena/tokens.css`, which is the authoritative
 * visual layer: its values were measured off `docs/visual-references/Orena-prod/*.png`
 * rather than eyeballed, and it deliberately namespaces itself away from the
 * twenty-two legacy stylesheets. An earlier port here read one of those legacy
 * files (`theme.css`) instead, so the whole native app was built on superseded
 * colours, radii and type sizes. Values below are copied from the `--o-` layer;
 * when it changes, change these in the same revision.
 */

export type ColorScheme = 'light' | 'dark';

/** The learner-selectable palettes, matching `theme_preset` in the profile contract. */
export type PalettePreset = 'editorial' | 'sage' | 'clay' | 'blueprint';

export const PALETTE_PRESETS: readonly PalettePreset[] = ['editorial', 'sage', 'clay', 'blueprint'];

/**
 * The `--o-` base layer. Presets override only the accent pair, exactly as
 * `html[data-palette=...]` does; every surface and ink value is shared.
 */
const base = {
  light: {
    canvas: '#F2EFEA',
    surface: '#FFFFFF',
    surfaceSunken: '#F8F5F1',
    raised: '#FFFFFF',
    border: '#EFECE7',
    borderStrong: '#DFDAD4',
    ink: '#16161A',
    inkMuted: '#6B6B76',
    inkFaint: '#9A9AA4',
    positive: '#1B7F3B',
    attention: '#B4770F',
    critical: '#C43D2E',
    onAccent: '#FFFFFF',
    // `--o-role-*`: the Writing legend bands, reused by Review's issue marks.
    roleVerb: '#D94401',
    roleNoun: '#6131BB',
    roleAdjective: '#158030',
    roleAdverb: '#15628E',
  },
  dark: {
    canvas: '#08090B',
    surface: '#15181C',
    surfaceSunken: '#101316',
    raised: '#1A1E23',
    border: '#22262A',
    borderStrong: '#343940',
    ink: '#F4F4F6',
    inkMuted: '#9A9AA6',
    inkFaint: '#6E7079',
    positive: '#5BB878',
    attention: '#D6A64A',
    critical: '#E4776A',
    onAccent: '#FFFFFF',
    roleVerb: '#F2764A',
    roleNoun: '#A98BEA',
    roleAdjective: '#5BB878',
    roleAdverb: '#6BA5CE',
  },
} as const;

/**
 * Editorial keeps the measured reference orange, which is deeper than the legacy
 * #FF6A1A. The other three hand their own accent to the layer, and dark mode
 * inherits the same accent as light unless the palette says otherwise.
 */
const accents: Record<PalettePreset, Record<ColorScheme, {accent: string; accentHover: string}>> = {
  editorial: {
    light: {accent: '#FD5703', accentHover: '#E84A00'},
    dark: {accent: '#FD5703', accentHover: '#E84A00'},
  },
  sage: {
    light: {accent: '#55735B', accentHover: '#66856C'},
    dark: {accent: '#8DB397', accentHover: '#9BC1A5'},
  },
  clay: {
    light: {accent: '#A45F43', accentHover: '#B66B4E'},
    dark: {accent: '#D08A68', accentHover: '#DE9A78'},
  },
  blueprint: {
    light: {accent: '#466C85', accentHover: '#557E98'},
    dark: {accent: '#82A9C0', accentHover: '#93B8CE'},
  },
};

/** `--o-radius-*`. */
export const radii = {card: 20, field: 15, chip: 10, pill: 999} as const;

/** `--o-text-*`. */
export const fontSizes = {meta: 12, label: 13, ui: 14, body: 15, heading: 17, title: 20} as const;

/** `--o-gutter`, `--o-gap`, `--o-header-h`, `--o-sidebar-w`, `--o-aside-w`. */
export const metrics = {gutter: 32, gap: 28, headerHeight: 80, sidebarWidth: 244, asideWidth: 288} as const;

export const fontWeights = {regular: '400', medium: '500', semibold: '600', bold: '700'} as const;

/**
 * `--o-shadow-card` and `--o-shadow-raised` as React Native shadows.
 *
 * The web values are two-layer (a tight contact shadow plus a wide ambient one);
 * RN takes a single shadow per view, so each maps to the ambient layer, which is
 * what gives the card its lift. Without these the surfaces read as flat outlines
 * rather than cards floating on the warm canvas.
 */
type Shadow = {shadowColor: string; shadowOpacity: number; shadowRadius: number; shadowOffset: {width: number; height: number}; elevation: number};

export const elevation: Record<ColorScheme, {card: Shadow; raised: Shadow; control: Shadow}> = {
  light: {
    card: {shadowColor: '#1C1917', shadowOpacity: 0.07, shadowRadius: 18, shadowOffset: {width: 0, height: 7}, elevation: 2},
    raised: {shadowColor: '#1C1917', shadowOpacity: 0.11, shadowRadius: 24, shadowOffset: {width: 0, height: 10}, elevation: 4},
    control: {shadowColor: '#1C1917', shadowOpacity: 0.10, shadowRadius: 8, shadowOffset: {width: 0, height: 3}, elevation: 2},
  },
  dark: {
    card: {shadowColor: '#000000', shadowOpacity: 0.78, shadowRadius: 24, shadowOffset: {width: 0, height: 10}, elevation: 6},
    raised: {shadowColor: '#000000', shadowOpacity: 0.85, shadowRadius: 36, shadowOffset: {width: 0, height: 16}, elevation: 10},
    control: {shadowColor: '#000000', shadowOpacity: 0.60, shadowRadius: 10, shadowOffset: {width: 0, height: 3}, elevation: 3},
  },
};

/**
 * `--o-rim`, `--o-sheen` and the split control edge, which are what stop a
 * surface reading as a flat outline. tokens.css is explicit that the reference
 * cards are lit from above: a 1px top highlight, then a short gradient that
 * settles into the fill about 140px down. RN has no inset box-shadow and no CSS
 * gradient, so the rim is a 1px overlay view and the sheen is a real gradient
 * (expo-linear-gradient) drawn over the fill rather than replacing it.
 */
export type Depth = {
  /** `--o-rim`: the lit top edge of a card. */
  rim: string;
  /** `--o-rim-control`: the stronger version buttons and controls carry. */
  rimControl: string;
  /** `--o-sheen`, as gradient stops over the surface fill. */
  sheen: readonly [string, string];
  sheenHeight: number;
  /** `--o-sheen-control`, the 40px version on a control face. */
  sheenControl: readonly [string, string];
  sheenControlHeight: number;
  /** `--o-accent-face`: the lit-to-shaded wash over a primary button. */
  accentFace: readonly [string, string];
  /** `--o-edge-top/side/bottom`: one border cannot say top-lit, bottom-dark. */
  edgeTop: string;
  edgeSide: string;
  edgeBottom: string;
  /** `--o-badge-face` / `--o-badge-edge`: small icon tiles are struck, not filled. */
  badgeFace: readonly [string, string];
  badgeEdge: string;
};

export const depth: Record<ColorScheme, Depth> = {
  light: {
    rim: 'rgba(255,255,255,0.5)',
    rimControl: 'rgba(255,255,255,0.75)',
    sheen: ['rgba(255,255,255,0.5)', 'rgba(255,255,255,0)'],
    sheenHeight: 140,
    sheenControl: ['rgba(255,255,255,0.55)', 'rgba(255,255,255,0)'],
    sheenControlHeight: 40,
    accentFace: ['rgba(255,255,255,0.10)', 'rgba(0,0,0,0.07)'],
    edgeTop: 'rgba(28,25,23,0.09)',
    edgeSide: 'rgba(28,25,23,0.13)',
    edgeBottom: 'rgba(28,25,23,0.19)',
    badgeFace: ['#FFFFFF', '#F6F2ED'],
    badgeEdge: 'rgba(28,25,23,0.10)',
  },
  dark: {
    rim: 'rgba(255,255,255,0.18)',
    rimControl: 'rgba(255,255,255,0.20)',
    sheen: ['rgba(255,255,255,0.025)', 'rgba(255,255,255,0)'],
    sheenHeight: 140,
    sheenControl: ['rgba(255,255,255,0.05)', 'rgba(255,255,255,0)'],
    sheenControlHeight: 40,
    accentFace: ['rgba(255,255,255,0.10)', 'rgba(0,0,0,0.07)'],
    edgeTop: 'rgba(255,255,255,0.14)',
    edgeSide: 'rgba(255,255,255,0.07)',
    edgeBottom: 'rgba(0,0,0,0.45)',
    badgeFace: ['#262C34', '#171B20'],
    badgeEdge: 'rgba(255,255,255,0.07)',
  },
};

/** `--o-accent-tint`: the accent mixed 7% into the surface, for chips. */
const accentTint = (accent: string, scheme: ColorScheme): string => {
  const hex = accent.replace('#', '');
  const value = parseInt(hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex, 16);
  const [r, g, b] = [(value >> 16) & 255, (value >> 8) & 255, value & 255];
  // Dark surfaces need a touch more of the accent to read as tinted at all.
  return `rgba(${r},${g},${b},${scheme === 'dark' ? 0.16 : 0.09})`;
};

export type ThemeTokens = {
  scheme: ColorScheme;
  preset: PalettePreset;
  colors: {
    background: string;
    surface: string;
    surfaceSunken: string;
    raised: string;
    /** Body copy and headings share one ink in this layer. */
    text: string;
    heading: string;
    mutedText: string;
    faintText: string;
    border: string;
    borderStrong: string;
    accent: string;
    accentHover: string;
    accentSoft: string;
    onAccent: string;
    positive: string;
    attention: string;
    /** `--o-role-*`, used for confidence bands on Review issues. */
    roleVerb: string;
    roleNoun: string;
    roleAdjective: string;
    roleAdverb: string;
    danger: string;
    dangerSurface: string;
    informational: string;
    /** `--o-accent-tint`, the chip background. */
    accentTint: string;
  };
  spacing: {small: number; medium: number; large: number};
  radius: {card: number; control: number};
  radii: typeof radii;
  fontSizes: typeof fontSizes;
  fontWeights: typeof fontWeights;
  metrics: typeof metrics;
  elevation: {card: Shadow; raised: Shadow; control: Shadow};
  depth: Depth;
};

export const tokensFor = (scheme: ColorScheme, preset: PalettePreset = 'editorial'): ThemeTokens => {
  const known = accents[preset] ? preset : 'editorial';
  const surface = base[scheme];
  const {accent, accentHover} = accents[known][scheme];
  return {
    scheme,
    preset: known,
    colors: {
      background: surface.canvas,
      surface: surface.surface,
      surfaceSunken: surface.surfaceSunken,
      raised: surface.raised,
      text: surface.ink,
      heading: surface.ink,
      mutedText: surface.inkMuted,
      faintText: surface.inkFaint,
      border: surface.border,
      borderStrong: surface.borderStrong,
      accent,
      accentHover,
      // `--o-accent-soft` mixes the accent into the sidebar; the sunken surface
      // is the closest static stand-in without a colour-mix at runtime.
      accentSoft: surface.surfaceSunken,
      onAccent: surface.onAccent,
      positive: surface.positive,
      attention: surface.attention,
      roleVerb: surface.roleVerb,
      roleNoun: surface.roleNoun,
      roleAdjective: surface.roleAdjective,
      roleAdverb: surface.roleAdverb,
      danger: surface.critical,
      dangerSurface: surface.surfaceSunken,
      informational: surface.inkMuted,
      accentTint: accentTint(accent, scheme),
    },
    spacing: {small: 8, medium: 16, large: 24},
    radius: {card: radii.card, control: radii.field},
    radii,
    fontSizes,
    fontWeights,
    metrics,
    elevation: elevation[scheme],
    depth: depth[scheme],
  };
};
