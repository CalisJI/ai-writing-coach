/* Orena visual system — icon set.
 *
 * One stroke weight, one corner treatment, one 24-grid. Icons are returned as
 * raw <svg> markup so a screen can drop them into a template string; stroke
 * and fill come from `currentColor` so every icon inherits the state of the
 * control that holds it.
 */

const STROKE = 'viewBox="0 0 24 24" aria-hidden="true" focusable="false"';

export const ORENA_ICONS = {
  /* --- navigation --- */
  home: `<svg ${STROKE}><path d="M3.6 10.4 12 3.8l8.4 6.6v8.4a1.2 1.2 0 0 1-1.2 1.2h-4.6v-5.8H9.4V20H4.8a1.2 1.2 0 0 1-1.2-1.2Z"/></svg>`,
  write: `<svg ${STROKE}><path d="m4 20 1.2-4.6L15.7 4.9a1.9 1.9 0 0 1 2.7 0l1.2 1.2a1.9 1.9 0 0 1 0 2.7L9.1 19.3Z"/><path d="m14 6.6 3.9 3.9"/></svg>`,
  read: `<svg ${STROKE}><path d="M12 6.6C10.4 5.2 8.4 4.5 6 4.5H3.8v13H6c2.4 0 4.4.7 6 2.1"/><path d="M12 6.6c1.6-1.4 3.6-2.1 6-2.1h2.2v13H18c-2.4 0-4.4.7-6 2.1"/><path d="M12 6.6v13"/></svg>`,
  listen: `<svg ${STROKE}><path d="M4.2 14.5v-2.7a7.8 7.8 0 0 1 15.6 0v2.7"/><path d="M4.2 13.6h1.9a1.3 1.3 0 0 1 1.3 1.3v3a1.3 1.3 0 0 1-1.3 1.3H5.5a1.3 1.3 0 0 1-1.3-1.3Z"/><path d="M19.8 13.6h-1.9a1.3 1.3 0 0 0-1.3 1.3v3a1.3 1.3 0 0 0 1.3 1.3h.6a1.3 1.3 0 0 0 1.3-1.3Z"/></svg>`,
  speak: `<svg ${STROKE}><rect x="9.2" y="3.2" width="5.6" height="10.4" rx="2.8"/><path d="M6 11.4a6 6 0 0 0 12 0M12 17.6V21M9.4 21h5.2"/></svg>`,
  grammar: `<svg ${STROKE}><rect x="3.8" y="3.8" width="16.4" height="16.4" rx="3.4"/><path d="M9 15.2 12 8.4l3 6.8M10.1 13.1h3.8"/></svg>`,
  library: `<svg ${STROKE}><rect x="4.4" y="3.6" width="10.2" height="16.8" rx="1.8"/><path d="M7.4 7.6h4.2M7.4 11h4.2"/><path d="m17 5 2.6 13.4a1.4 1.4 0 0 1-1.1 1.6l-1 .2"/></svg>`,
  journey: `<svg ${STROKE}><path d="m9 4.6-5 2v12.8l5-2 6 2 5-2V4.6l-5 2Z"/><path d="M9 4.6v12.8M15 6.6v12.8"/></svg>`,
  profile: `<svg ${STROKE}><circle cx="12" cy="8.2" r="3.7"/><path d="M5.2 20c.6-3.8 3-5.8 6.8-5.8s6.2 2 6.8 5.8"/></svg>`,

  /* --- chrome --- */
  sun: `<svg ${STROKE}><circle cx="12" cy="12" r="4"/><path d="M12 2.4v2.4M12 19.2v2.4M4.2 4.2l1.7 1.7M18.1 18.1l1.7 1.7M2.4 12h2.4M19.2 12h2.4M4.2 19.8l1.7-1.7M18.1 5.9l1.7-1.7"/></svg>`,
  moon: `<svg ${STROKE}><path d="M20 15.5A8.5 8.5 0 0 1 8.5 4 8.7 8.7 0 1 0 20 15.5Z"/></svg>`,
  menu: `<svg ${STROKE}><path d="M4 7h16M4 12h16M4 17h16"/></svg>`,
  close: `<svg ${STROKE}><path d="m6 6 12 12M18 6 6 18"/></svg>`,
  chevronDown: `<svg ${STROKE}><path d="m7 10 5 5 5-5"/></svg>`,
  chevronUp: `<svg ${STROKE}><path d="m7 14 5-5 5 5"/></svg>`,
  chevronRight: `<svg ${STROKE}><path d="m10 7 5 5-5 5"/></svg>`,
  arrowLeft: `<svg ${STROKE}><path d="M19 12H5M10 7l-5 5 5 5"/></svg>`,
  arrowRight: `<svg ${STROKE}><path d="M5 12h14M14 7l5 5-5 5"/></svg>`,
  info: `<svg ${STROKE}><circle cx="12" cy="12" r="8.6"/><path d="M12 11.2v5M12 8.2v.1"/></svg>`,
  check: `<svg ${STROKE}><path d="m5 12.5 4.5 4.5L19 7"/></svg>`,
  trash: `<svg ${STROKE}><path d="M4.6 6.6h14.8M9.4 6.6V4.9a1.2 1.2 0 0 1 1.2-1.2h2.8a1.2 1.2 0 0 1 1.2 1.2v1.7"/><path d="M6.6 6.6 7.5 19a1.3 1.3 0 0 0 1.3 1.2h6.4a1.3 1.3 0 0 0 1.3-1.2l.9-12.4"/></svg>`,
  cloud: `<svg ${STROKE}><path d="M7.2 18.4a4.2 4.2 0 0 1-.5-8.4 5.4 5.4 0 0 1 10.4-1.1 3.9 3.9 0 0 1-.8 9.5Z"/></svg>`,
  clock: `<svg ${STROKE}><circle cx="12" cy="12" r="8.4"/><path d="M12 7.2V12l3.2 1.9"/></svg>`,
  download: `<svg ${STROKE}><path d="M12 4v10.4"/><path d="m8 10.8 4 3.9 4-3.9"/><path d="M4.6 17.2v1.4a1.6 1.6 0 0 0 1.6 1.6h11.6a1.6 1.6 0 0 0 1.6-1.6v-1.4"/></svg>`,
  star: `<svg ${STROKE}><path d="m12 4.2 2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.6-4.8 2.6.9-5.4L4.2 9.9l5.4-.8Z"/></svg>`,
  square: `<svg ${STROKE}><rect x="7.4" y="7.4" width="9.2" height="9.2" rx="1.6" fill="currentColor" stroke="none"/></svg>`,
  rubric: `<svg ${STROKE}><path d="M4.4 6.6h4M4.4 12h4M4.4 17.4h4"/><path d="M11.4 6.6h8.2M11.4 12h8.2M11.4 17.4h8.2"/></svg>`,
  document: `<svg ${STROKE}><path d="M6.6 3.8h7l4.4 4.4v11.2a1 1 0 0 1-1 1H6.6a1 1 0 0 1-1-1V4.8a1 1 0 0 1 1-1Z"/><path d="M13 3.8v4.6h4.6M8.8 12.6h6M8.8 16h4"/></svg>`,
  flame: `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 2.4c2.7 3.1 4 5.6 4 7.5 0 1.3-.6 2.4-1.8 3 .5-1.6.2-3.1-1-4.3.2 2.5-.8 4.1-3.1 5-1.6.7-2.5 1.9-2.5 3.6 0 2.5 2.1 4.5 4.8 4.5 3.3 0 5.8-2.5 5.8-6 0-4.3-2.1-8.7-6.2-13.3Z"/></svg>`,
  volume: `<svg ${STROKE}><path d="M4 9.4v5.2h3.4l4.4 3.6V5.8L7.4 9.4Z"/><path d="M15.2 9.6a3.4 3.4 0 0 1 0 4.8M17.8 7a7 7 0 0 1 0 10"/></svg>`,
  volumeOff: `<svg ${STROKE}><path d="M4 9.4v5.2h3.4l4.4 3.6V5.8L7.4 9.4Z"/><path d="m15.4 10 4.2 4.2M19.6 10l-4.2 4.2"/></svg>`,
  play: `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M8 5.2 19 12 8 18.8Z"/></svg>`,
  pause: `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M7.4 4.8h3.2v14.4H7.4zM13.4 4.8h3.2v14.4h-3.2z"/></svg>`,
  /* Skip icons carry the number of seconds, as the reference draws them: the
     arrow alone does not say how far it jumps. */
  skipBack: `<svg ${STROKE}><path d="M12.4 4.6a7.4 7.4 0 1 1-7.2 9.2"/><path d="m8.4 1.4-3.4 3.2 3.4 3.2"/><text x="12.6" y="16.4" text-anchor="middle" font-size="10" font-weight="700" fill="currentColor" stroke="none">5</text></svg>`,
  skipForward: `<svg ${STROKE}><path d="M11.6 4.6a7.4 7.4 0 1 0 7.2 9.2"/><path d="m15.6 1.4 3.4 3.2-3.4 3.2"/><text x="11.4" y="16.4" text-anchor="middle" font-size="10" font-weight="700" fill="currentColor" stroke="none">5</text></svg>`,
  flag: `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6 21V4.2c3.6-1.9 7.2 1.9 10.8 0v8.4c-3.6 1.9-7.2-1.9-10.8 0"/></svg>`,
  crown: `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M3.6 7.6 6.9 11l3.3-5.4a2 2 0 0 1 3.6 0L17.1 11l3.3-3.4a1 1 0 0 1 1.7.9l-1.7 8.3a1.2 1.2 0 0 1-1.2 1H4.8a1.2 1.2 0 0 1-1.2-1L1.9 8.5a1 1 0 0 1 1.7-.9Z"/></svg>`,

  /* --- preferences ---
     The Profile reference puts a glyph inside each control: a flag beside a
     language, a balance beside the guidance style. A flag cannot stand for a
     language here - English and Chinese are not countries - so the globe does
     that work, and the sliders carry anything that is a setting. */
  globe: `<svg ${STROKE}><circle cx="12" cy="12" r="8.2"/><path d="M3.8 12h16.4"/><path d="M12 3.8c2.1 2.3 3.2 5 3.2 8.2s-1.1 5.9-3.2 8.2c-2.1-2.3-3.2-5-3.2-8.2S9.9 6.1 12 3.8Z"/></svg>`,
  sliders: `<svg ${STROKE}><path d="M4.4 7.4h10M17.2 7.4h2.4M4.4 16.6h2.4M9.8 16.6h9.8"/><circle cx="15.6" cy="7.4" r="2.2"/><circle cx="8.2" cy="16.6" r="2.2"/></svg>`,

  /* --- editor toolbar --- */
  undo: `<svg ${STROKE}><path d="M4.4 8.4h9.2a5.4 5.4 0 0 1 0 10.8H8.2"/><path d="m8 4.4-3.6 4 3.6 4"/></svg>`,
  redo: `<svg ${STROKE}><path d="M19.6 8.4h-9.2a5.4 5.4 0 0 0 0 10.8h5.4"/><path d="m16 4.4 3.6 4-3.6 4"/></svg>`,
  bold: `<svg ${STROKE}><path d="M7.4 4.6h5.4a3.7 3.7 0 0 1 0 7.4H7.4Z"/><path d="M7.4 12h6.2a3.7 3.7 0 0 1 0 7.4H7.4Z"/></svg>`,
  italic: `<svg ${STROKE}><path d="M15.6 4.6h-4.4M12.8 19.4H8.4M14.2 4.6 9.8 19.4"/></svg>`,
  underline: `<svg ${STROKE}><path d="M6.8 4.2v6.6a5.2 5.2 0 0 0 10.4 0V4.2M5.6 20h12.8"/></svg>`,
  bulletList: `<svg ${STROKE}><path d="M9 6.6h11M9 12h11M9 17.4h11"/><path d="M4.6 6.6v.1M4.6 12v.1M4.6 17.4v.1"/></svg>`,
  orderedList: `<svg ${STROKE}><path d="M9.6 6.6h10.4M9.6 12H20M9.6 17.4H20"/><path d="M4 5.4h1.2v3M4 16.6h2.2M4 18.8h2.2M4 14.6h2.2"/></svg>`,
  link: `<svg ${STROKE}><path d="M10.2 13.8a3.7 3.7 0 0 0 5.4 0l2.6-2.6a3.8 3.8 0 0 0-5.4-5.4l-1.4 1.4"/><path d="M13.8 10.2a3.7 3.7 0 0 0-5.4 0l-2.6 2.6a3.8 3.8 0 0 0 5.4 5.4l1.4-1.4"/></svg>`,
  clearFormat: `<svg ${STROKE}><path d="M8.4 5h9.2M13.4 5 10 19M6 15l6 4"/></svg>`,
};

export function oIcon(name) {
  return ORENA_ICONS[name] || '';
}
