import type {PropsWithChildren, ReactNode} from 'react';
import {Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle} from 'react-native';
import {useTheme} from '../theme/ThemeProvider';

/**
 * The Orena shell primitives, mirrored from `static/becoming/orena/*.css`.
 *
 * The shell uses a tighter type scale than base.css: meta 12, label 13, ui 14,
 * body 15, heading 17, title 20. Screens compose `Hero` and `Panel` from these
 * rather than each inventing its own card.
 */
export const orenaText = {meta: 12, label: 13, ui: 14, body: 15, heading: 17, title: 20} as const;

/** `.o-label` — the small heading that opens a panel. */
export function Label({children}: PropsWithChildren) {
  const {tokens} = useTheme();
  return <Text style={[styles.label, {color: tokens.colors.heading}]}>{children}</Text>;
}

/** `.o-card.o-panel` — a bordered surface holding one signal. */
export function Panel({children, style}: PropsWithChildren<{style?: StyleProp<ViewStyle>}>) {
  const {tokens} = useTheme();
  return (
    <View style={[styles.panel, {backgroundColor: tokens.colors.surface, borderColor: tokens.colors.border, borderRadius: tokens.radius.card}, style]}>
      {children}
    </View>
  );
}

/** `.o-panel-copy` — panel body copy. */
export function PanelCopy({children}: PropsWithChildren) {
  const {tokens} = useTheme();
  return <Text style={[styles.copy, {color: tokens.colors.mutedText}]}>{children}</Text>;
}

export type ButtonVariant = 'primary' | 'outline';

/** `.o-btn` with its `--primary` and `--outline` variants. */
export function Button({label, onPress, variant = 'primary', compact = false, disabled = false, accessibilityHint}: {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  compact?: boolean;
  disabled?: boolean;
  accessibilityHint?: string;
}) {
  const {tokens} = useTheme();
  const primary = variant === 'primary';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{disabled}}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.button,
        compact && styles.buttonCompact,
        {
          borderRadius: tokens.radius.control,
          backgroundColor: primary ? tokens.colors.accent : 'transparent',
          borderColor: primary ? tokens.colors.accent : tokens.colors.borderStrong,
          opacity: disabled ? 0.6 : 1,
        },
      ]}
    >
      <Text style={[styles.buttonLabel, {color: primary ? tokens.colors.onAccent : tokens.colors.heading}]}>{label}</Text>
    </Pressable>
  );
}

/** `.o-hero` — greeting, statement, lede, then the actions row. */
export function Hero({greeting, statement, lede, actions}: {greeting: string; statement: string; lede?: string; actions?: ReactNode}) {
  const {tokens} = useTheme();
  return (
    <View style={[styles.hero, {backgroundColor: tokens.colors.surface, borderColor: tokens.colors.border, borderRadius: tokens.radius.card}]}>
      <Text style={[styles.heroGreet, {color: tokens.colors.mutedText}]}>{greeting}</Text>
      <Text accessibilityRole="header" style={[styles.heroStatement, {color: tokens.colors.heading}]}>{statement}</Text>
      {lede ? <Text style={[styles.heroLede, {color: tokens.colors.mutedText}]}>{lede}</Text> : null}
      {actions ? <View style={styles.heroActions}>{actions}</View> : null}
    </View>
  );
}

/** A label/value pair, as the web uses for metric readouts. */
export function Metric({label, value}: {label: string; value: string}) {
  const {tokens} = useTheme();
  return (
    <View style={styles.metric}>
      <Text style={[styles.metricLabel, {color: tokens.colors.mutedText}]}>{label}</Text>
      <Text style={[styles.metricValue, {color: tokens.colors.heading}]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {fontSize: orenaText.body, fontWeight: '600'},
  panel: {borderWidth: 1, padding: 20, gap: 12},
  copy: {fontSize: orenaText.body, lineHeight: 24},
  button: {minHeight: 44, paddingHorizontal: 17, borderWidth: 1, alignItems: 'center', justifyContent: 'center'},
  buttonCompact: {minHeight: 38, paddingHorizontal: 14, alignSelf: 'flex-start'},
  buttonLabel: {fontSize: orenaText.ui, fontWeight: '700'},
  hero: {borderWidth: 1, padding: 24, gap: 0},
  heroGreet: {fontSize: orenaText.ui, marginBottom: 14},
  // `.o-hero-statement`: 600 weight on tight leading and negative tracking.
  heroStatement: {fontSize: 32, fontWeight: '600', lineHeight: 36, letterSpacing: -0.8, marginBottom: 14},
  heroLede: {fontSize: orenaText.body, lineHeight: 24, marginBottom: 26},
  heroActions: {flexDirection: 'row', flexWrap: 'wrap', gap: 12},
  metric: {gap: 2, minWidth: 96},
  metricLabel: {fontSize: orenaText.meta},
  metricValue: {fontSize: orenaText.title, fontWeight: '700'},
});
