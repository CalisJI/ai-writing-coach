import {PALETTE_PRESETS, elevation, fontSizes, metrics, radii, tokensFor} from './tokens';

describe('Orena design tokens', () => {
  // static/becoming/orena/tokens.css is authoritative: its values were measured
  // off docs/visual-references/Orena-prod/*.png. An earlier port read the legacy
  // theme.css instead, so the app was built on superseded values.
  it('takes the light surfaces and ink from the --o- layer, not theme.css', () => {
    const light = tokensFor('light');
    expect(light.colors.background).toBe('#F2EFEA');
    expect(light.colors.surface).toBe('#FFFFFF');
    expect(light.colors.surfaceSunken).toBe('#F8F5F1');
    expect(light.colors.border).toBe('#EFECE7');
    expect(light.colors.borderStrong).toBe('#DFDAD4');
    expect(light.colors.text).toBe('#16161A');
    expect(light.colors.mutedText).toBe('#6B6B76');
    expect(light.colors.faintText).toBe('#9A9AA4');
    // The legacy values must not creep back.
    expect(light.colors.background).not.toBe('#F7F7F5');
    expect(light.colors.text).not.toBe('#303236');
  });

  it('uses the measured reference orange, which is deeper than the legacy accent', () => {
    const light = tokensFor('light');
    expect(light.colors.accent).toBe('#FD5703');
    expect(light.colors.accentHover).toBe('#E84A00');
    expect(light.colors.accent).not.toBe('#FF6A1A');
  });

  it('takes the dark surfaces from the --o- layer', () => {
    const dark = tokensFor('dark');
    expect(dark.colors.background).toBe('#08090B');
    expect(dark.colors.surface).toBe('#15181C');
    expect(dark.colors.raised).toBe('#1A1E23');
    expect(dark.colors.text).toBe('#F4F4F6');
    expect(dark.colors.border).toBe('#22262A');
    // Dark keeps the same accent; only the three non-editorial palettes swap it.
    expect(dark.colors.accent).toBe('#FD5703');
  });

  it('carries the semantic colours the web declares', () => {
    expect(tokensFor('light').colors.positive).toBe('#1B7F3B');
    expect(tokensFor('light').colors.attention).toBe('#B4770F');
    expect(tokensFor('light').colors.danger).toBe('#C43D2E');
    expect(tokensFor('dark').colors.positive).toBe('#5BB878');
    expect(tokensFor('dark').colors.danger).toBe('#E4776A');
  });

  it('uses the --o- radius, type and layout metrics', () => {
    expect(radii).toEqual({card: 20, field: 15, chip: 10, pill: 999});
    expect(fontSizes).toEqual({meta: 12, label: 13, ui: 14, body: 15, heading: 17, title: 20});
    expect(metrics).toEqual({gutter: 32, gap: 28, headerHeight: 80, sidebarWidth: 244, asideWidth: 288});
    const tokens = tokensFor('light');
    expect(tokens.radius.card).toBe(20);
    expect(tokens.radius.control).toBe(15);
  });

  it('gives surfaces real elevation instead of leaving them flat outlines', () => {
    // Without --o-shadow-card the cards read as outlines, which is the effect
    // the token file's own comments say the design rejected.
    for (const scheme of ['light', 'dark'] as const) {
      expect(elevation[scheme].card.shadowRadius).toBeGreaterThan(0);
      expect(elevation[scheme].card.elevation).toBeGreaterThan(0);
      expect(elevation[scheme].raised.shadowRadius).toBeGreaterThan(elevation[scheme].card.shadowRadius);
    }
    // Dark mode carries far heavier shadows in the reference.
    expect(elevation.dark.card.shadowOpacity).toBeGreaterThan(elevation.light.card.shadowOpacity);
  });

  it('serves every learner-selectable palette with a distinct accent', () => {
    expect(PALETTE_PRESETS).toEqual(['editorial', 'sage', 'clay', 'blueprint']);
    const seen = new Set<string>();
    for (const preset of PALETTE_PRESETS) {
      for (const scheme of ['light', 'dark'] as const) {
        const tokens = tokensFor(scheme, preset);
        expect(tokens.preset).toBe(preset);
        expect(tokens.colors.onAccent).not.toBe(tokens.colors.accent);
        seen.add(tokens.colors.accent);
      }
    }
    // Editorial shares one accent across schemes; the other three do not.
    expect(seen.size).toBe(PALETTE_PRESETS.length * 2 - 1);
  });

  it('falls back to the default face for an unknown palette instead of rendering nothing', () => {
    const tokens = tokensFor('light', 'unknown' as never);
    expect(tokens.preset).toBe('editorial');
    expect(tokens.colors.background).toBe('#F2EFEA');
  });
});
