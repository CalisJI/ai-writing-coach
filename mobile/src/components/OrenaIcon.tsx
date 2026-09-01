import Svg, {Circle, Path, Rect} from 'react-native-svg';

/**
 * The Orena icon set, ported from `static/becoming/orena/icons.js`.
 *
 * The geometry is copied verbatim from that file rather than redrawn: one
 * stroke weight, one corner treatment, one 24 grid. The web renders them with
 * `fill:none; stroke:currentColor; stroke-width:1.7; stroke-linecap:round;
 * stroke-linejoin:round`, so the same values are applied here and colour is
 * passed in by the control that holds the icon.
 *
 * Emoji are not an acceptable substitute for these.
 */
export type OrenaIconName =
  | 'home' | 'write' | 'read' | 'listen' | 'speak'
  | 'grammar' | 'library' | 'journey' | 'profile'
  | 'menu' | 'close' | 'sun' | 'moon'
  | 'arrowLeft' | 'check';

type Geometry = {
  paths?: readonly string[];
  rects?: readonly {x: number; y: number; width: number; height: number; rx: number; filled?: boolean}[];
  circles?: readonly {cx: number; cy: number; r: number}[];
};

const ICONS: Record<OrenaIconName, Geometry> = {
  home: {paths: ['M3.6 10.4 12 3.8l8.4 6.6v8.4a1.2 1.2 0 0 1-1.2 1.2h-4.6v-5.8H9.4V20H4.8a1.2 1.2 0 0 1-1.2-1.2Z']},
  write: {paths: ['m4 20 1.2-4.6L15.7 4.9a1.9 1.9 0 0 1 2.7 0l1.2 1.2a1.9 1.9 0 0 1 0 2.7L9.1 19.3Z', 'm14 6.6 3.9 3.9']},
  read: {paths: [
    'M12 6.6C10.4 5.2 8.4 4.5 6 4.5H3.8v13H6c2.4 0 4.4.7 6 2.1',
    'M12 6.6c1.6-1.4 3.6-2.1 6-2.1h2.2v13H18c-2.4 0-4.4.7-6 2.1',
    'M12 6.6v13',
  ]},
  listen: {paths: [
    'M4.2 14.5v-2.7a7.8 7.8 0 0 1 15.6 0v2.7',
    'M4.2 13.6h1.9a1.3 1.3 0 0 1 1.3 1.3v3a1.3 1.3 0 0 1-1.3 1.3H5.5a1.3 1.3 0 0 1-1.3-1.3Z',
    'M19.8 13.6h-1.9a1.3 1.3 0 0 0-1.3 1.3v3a1.3 1.3 0 0 0 1.3 1.3h.6a1.3 1.3 0 0 0 1.3-1.3Z',
  ]},
  speak: {
    paths: ['M6 11.4a6 6 0 0 0 12 0M12 17.6V21M9.4 21h5.2'],
    rects: [{x: 9.2, y: 3.2, width: 5.6, height: 10.4, rx: 2.8}],
  },
  grammar: {
    paths: ['M9 15.2 12 8.4l3 6.8M10.1 13.1h3.8'],
    rects: [{x: 3.8, y: 3.8, width: 16.4, height: 16.4, rx: 3.4}],
  },
  library: {
    paths: ['M7.4 7.6h4.2M7.4 11h4.2', 'm17 5 2.6 13.4a1.4 1.4 0 0 1-1.1 1.6l-1 .2'],
    rects: [{x: 4.4, y: 3.6, width: 10.2, height: 16.8, rx: 1.8}],
  },
  journey: {paths: ['m9 4.6-5 2v12.8l5-2 6 2 5-2V4.6l-5 2Z', 'M9 4.6v12.8M15 6.6v12.8']},
  profile: {
    paths: ['M5.2 20c.6-3.8 3-5.8 6.8-5.8s6.2 2 6.8 5.8'],
    circles: [{cx: 12, cy: 8.2, r: 3.7}],
  },
  menu: {paths: ['M4 7h16M4 12h16M4 17h16']},
  close: {paths: ['m6 6 12 12M18 6 6 18']},
  sun: {
    paths: ['M12 2.4v2.4M12 19.2v2.4M4.2 4.2l1.7 1.7M18.1 18.1l1.7 1.7M2.4 12h2.4M19.2 12h2.4M4.2 19.8l1.7-1.7M18.1 5.9l1.7-1.7'],
    circles: [{cx: 12, cy: 12, r: 4}],
  },
  moon: {paths: ['M20 15.5A8.5 8.5 0 0 1 8.5 4 8.7 8.7 0 1 0 20 15.5Z']},
  arrowLeft: {paths: ['M19 12H5M10 7l-5 5 5 5']},
  check: {paths: ['m5 12.5 4.5 4.5L19 7']},
};

/** `.o-nav-icon` is 21px; `.o-icon-button svg` is 20px. */
export function OrenaIcon({name, size = 21, color}: {name: OrenaIconName; size?: number; color: string}) {
  const icon = ICONS[name];
  const stroke = {stroke: color, strokeWidth: 1.7, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none'};
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {icon.rects?.map((rect, index) => <Rect key={`r${index}`} {...rect} {...stroke} />)}
      {icon.circles?.map((circle, index) => <Circle key={`c${index}`} {...circle} {...stroke} />)}
      {icon.paths?.map((d, index) => <Path key={`p${index}`} d={d} {...stroke} />)}
    </Svg>
  );
}

export const ORENA_ICON_NAMES = Object.keys(ICONS) as OrenaIconName[];
