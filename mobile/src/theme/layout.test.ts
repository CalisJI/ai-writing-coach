import {ASIDE_WIDTH, CONTENT_MAX, GAP_NARROW, GAP_WIDE, GUTTER, WIDE_BREAKPOINT, resolveLayout} from './layout';

describe('Orena responsive layout', () => {
  // These mirror static/becoming/orena/shell.css and home.css. The native client
  // had capped every screen at 640, so a 1280dp tablet rendered a narrow column
  // with empty bands either side instead of the web's wide layout.
  it('keeps the web container constants', () => {
    expect(CONTENT_MAX).toBe(1440);
    expect(GUTTER).toBe(20);
    expect(WIDE_BREAKPOINT).toBe(1024);
    expect(ASIDE_WIDTH).toBe(288);
    expect(GAP_WIDE).toBe(28);
    expect(GAP_NARROW).toBe(16);
  });

  it.each([
    ['phone portrait', 411, false],
    ['phone landscape', 914, false],
    ['tablet portrait', 800, false],
    ['just below the breakpoint', 1023, false],
    ['tablet landscape', 1280, true],
    ['desktop-class', 1600, true],
  ])('resolves %s (%ipx) to the right branch', (_name, width, wide) => {
    const layout = resolveLayout(width);
    expect(layout.wide).toBe(wide);
    expect(layout.gap).toBe(wide ? GAP_WIDE : GAP_NARROW);
  });

  it('fills the viewport minus one gutter per side, up to the cap', () => {
    const layout = resolveLayout(1280);
    // A 1280dp tablet must use nearly the whole width, not a 640 column.
    expect(layout.contentWidth).toBe(1280 - GUTTER * 2);
    expect(layout.contentWidth).toBeGreaterThan(1280 * 0.9);
  });

  it('caps very wide viewports rather than stretching a line forever', () => {
    const layout = resolveLayout(2200);
    expect(layout.contentWidth).toBe(CONTENT_MAX);
  });

  it('never returns a negative width on an implausibly narrow viewport', () => {
    const layout = resolveLayout(20);
    expect(layout.contentWidth).toBe(0);
  });
});
