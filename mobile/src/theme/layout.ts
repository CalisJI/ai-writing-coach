import {useWindowDimensions} from 'react-native';
import type {ViewStyle} from 'react-native';

/**
 * The Orena responsive rules, mirrored from `static/becoming/orena/shell.css`
 * and `home.css`.
 *
 * The web page container is `width: min(calc(100% - 40px), 1440px)` centred, and
 * the shell collapses its multi-column layouts at 1023px. The native client had
 * capped every screen at 640, so a 1280dp tablet showed a narrow column with
 * empty bands either side instead of the wide layout the web uses there.
 */
export const CONTENT_MAX = 1440;

/** `calc(100% - 40px)` is a 20px gutter on each side. */
export const GUTTER = 20;

/** `@media (max-width:1023px)` is where the web drops to a single column. */
export const WIDE_BREAKPOINT = 1024;

/** `--o-aside-w`: the rail beside the main column in `.o-home-split`. */
export const ASIDE_WIDTH = 288;

/** `--o-gap` above the breakpoint; the narrow layouts use 16. */
export const GAP_WIDE = 28;
export const GAP_NARROW = 16;

export type ScreenLayout = {
  /** True at or above 1024dp, where the web keeps its multi-column layouts. */
  wide: boolean;
  width: number;
  contentWidth: number;
  gap: number;
  /** Style for the centred content column. */
  content: ViewStyle;
};

/** The rules as a pure function, so they can be checked without a renderer. */
export function resolveLayout(width: number): ScreenLayout {
  const wide = width >= WIDE_BREAKPOINT;
  return {
    wide,
    width,
    contentWidth: Math.min(Math.max(width - GUTTER * 2, 0), CONTENT_MAX),
    gap: wide ? GAP_WIDE : GAP_NARROW,
    content: {width: '100%', maxWidth: CONTENT_MAX, alignSelf: 'center'},
  };
}

export function useScreenLayout(): ScreenLayout {
  const {width} = useWindowDimensions();
  return resolveLayout(width);
}
