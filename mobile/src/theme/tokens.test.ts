import {tokensFor} from './tokens';

describe('native theme tokens', () => {
  it('keeps light and dark surfaces readable', () => {
    const light = tokensFor('light');
    const dark = tokensFor('dark');
    expect(light.colors.background).not.toBe(light.colors.text);
    expect(dark.colors.background).not.toBe(dark.colors.text);
    expect(light.spacing.medium).toBe(16);
    expect(dark.radius.control).toBe(12);
  });
});
