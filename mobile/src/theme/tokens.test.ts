import {PALETTE_PRESETS, fontSizes, radii, space, tokensFor} from './tokens';

describe('native theme tokens', () => {
  it('keeps light and dark surfaces readable', () => {
    const light = tokensFor('light');
    const dark = tokensFor('dark');
    expect(light.colors.background).not.toBe(light.colors.text);
    expect(dark.colors.background).not.toBe(dark.colors.text);
    expect(light.spacing.medium).toBe(16);
  });

  // static/becoming/theme.css is authoritative. The native client had invented a
  // navy/blue palette of its own, so the app did not look like the product.
  it('matches the web Orena tokens rather than a native-only palette', () => {
    const light = tokensFor('light');
    expect(light.colors.background).toBe('#F7F7F5');
    expect(light.colors.surface).toBe('#FFFFFF');
    expect(light.colors.heading).toBe('#111214');
    expect(light.colors.text).toBe('#303236');
    expect(light.colors.mutedText).toBe('#72757B');
    expect(light.colors.accent).toBe('#FF6A1A');

    const dark = tokensFor('dark');
    expect(dark.colors.background).toBe('#111310');
    expect(dark.colors.surface).toBe('#181B17');
    expect(dark.colors.heading).toBe('#F5F4EF');
    expect(dark.colors.accent).toBe('#FF7A2F');
  });

  it('uses the web spacing, radius and type steps', () => {
    expect(space).toMatchObject({1: 4, 2: 8, 3: 12, 4: 16, 6: 24, 8: 32});
    expect(radii).toEqual({small: 8, control: 10, object: 14, surface: 18, hero: 22});
    expect(fontSizes).toMatchObject({meta: 12, ui: 14, body: 16, bodyLarge: 18, h3: 22, h2: 28, h1: 36});
    const tokens = tokensFor('light');
    expect(tokens.radius.control).toBe(radii.control);
    expect(tokens.radius.card).toBe(radii.surface);
  });

  it('serves every learner-selectable palette in both schemes', () => {
    expect(PALETTE_PRESETS).toEqual(['editorial', 'sage', 'clay', 'blueprint']);
    const seen = new Set<string>();
    for (const preset of PALETTE_PRESETS) {
      for (const scheme of ['light', 'dark'] as const) {
        const tokens = tokensFor(scheme, preset);
        expect(tokens.preset).toBe(preset);
        // Each palette must be distinct, or the learner's choice does nothing.
        seen.add(`${tokens.colors.background}|${tokens.colors.accent}`);
        // Text on an accent fill must not be the accent itself.
        expect(tokens.colors.onAccent).not.toBe(tokens.colors.accent);
      }
    }
    expect(seen.size).toBe(PALETTE_PRESETS.length * 2);
  });

  it('never leaves a button label hardcoded white on a light accent', () => {
    // sage and blueprint use light accents in dark mode, where the old
    // hardcoded '#fff' label was unreadable.
    for (const preset of PALETTE_PRESETS) {
      const dark = tokensFor('dark', preset);
      expect(dark.colors.onAccent).toBe('#111310');
      expect(tokensFor('light', preset).colors.onAccent).toBe('#FFFFFF');
    }
  });

  it('falls back to the default face for an unknown palette instead of rendering nothing', () => {
    const tokens = tokensFor('light', 'unknown' as never);
    expect(tokens.preset).toBe('editorial');
    expect(tokens.colors.background).toBe('#F7F7F5');
  });
});
