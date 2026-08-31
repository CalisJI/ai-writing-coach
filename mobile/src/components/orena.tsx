import type {PropsWithChildren, ReactNode} from 'react';
import {Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle} from 'react-native';
import {useTheme} from '../theme/ThemeProvider';
import {ASIDE_WIDTH, useScreenLayout} from '../theme/layout';
import {fontSizes as orenaText} from '../theme/tokens';

export {fontSizes as orenaText} from '../theme/tokens';

/**
 * The Orena shell primitives, mirrored from `static/becoming/orena/*.css`.
 *
 * The shell uses a tighter type scale than base.css: meta 12, label 13, ui 14,
 * body 15, heading 17, title 20. Screens compose `Hero` and `Panel` from these
 * rather than each inventing its own card.
 */

/** `.o-label` — the small heading that opens a panel. */
export function Label({children}: PropsWithChildren) {
  const {tokens} = useTheme();
  return <Text style={[styles.label, {color: tokens.colors.heading}]}>{children}</Text>;
}

/** `.o-card.o-panel` — a bordered surface holding one signal. */
export function Panel({children, style}: PropsWithChildren<{style?: StyleProp<ViewStyle>}>) {
  const {tokens} = useTheme();
  return (
    <View style={[styles.panel, tokens.elevation.card, {backgroundColor: tokens.colors.surface, borderColor: tokens.colors.border, borderRadius: tokens.radius.card}, style]}>
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
export function Hero({greeting, statement, lede, actions, aside}: {greeting: string; statement: string; lede?: string; actions?: ReactNode; aside?: ReactNode}) {
  const {tokens} = useTheme();
  const {wide} = useScreenLayout();
  // `.o-hero` is two columns above 1023px and one below, and the statement
  // steps down from its clamp to 26px on the narrow layout.
  return (
    <View style={[styles.hero, wide ? styles.heroWide : styles.heroNarrow, tokens.elevation.raised, {backgroundColor: tokens.colors.surface, borderColor: tokens.colors.border, borderRadius: tokens.radius.card}]}>
      <View style={styles.heroCopy}>
        <Text style={[styles.heroGreet, {color: tokens.colors.mutedText}]}>{greeting}</Text>
        <Text accessibilityRole="header" style={[wide ? styles.heroStatement : styles.heroStatementNarrow, {color: tokens.colors.heading}]}>{statement}</Text>
        {lede ? <Text style={[styles.heroLede, {color: tokens.colors.mutedText}]}>{lede}</Text> : null}
        {actions ? <View style={styles.heroActions}>{actions}</View> : null}
      </View>
      {aside ? <View style={styles.heroAside}>{aside}</View> : null}
    </View>
  );
}

/**
 * `.o-home-split` — a main column beside a 288px rail above the breakpoint,
 * stacked below it.
 */
export function Split({children, aside}: PropsWithChildren<{aside?: ReactNode}>) {
  const {wide, gap} = useScreenLayout();
  if (!wide || !aside) return <View style={{gap}}>{children}{aside}</View>;
  return (
    <View style={{flexDirection: 'row', gap, alignItems: 'flex-start'}}>
      <View style={{flex: 1, minWidth: 0, gap}}>{children}</View>
      <View style={{width: ASIDE_WIDTH, gap}}>{aside}</View>
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
  hero: {borderWidth: 1},
  heroWide: {flexDirection: 'row', gap: 32, padding: 34, paddingHorizontal: 32, alignItems: 'center'},
  heroNarrow: {gap: 20, padding: 20, paddingHorizontal: 18},
  heroCopy: {flex: 1, minWidth: 0},
  heroAside: {flex: 0.85, minWidth: 0},
  heroGreet: {fontSize: orenaText.ui, marginBottom: 14},
  // `.o-hero-statement`: 600 weight on tight leading and negative tracking.
  heroStatement: {fontSize: 38, fontWeight: '600', lineHeight: 42, letterSpacing: -0.9, marginBottom: 14},
  heroStatementNarrow: {fontSize: 20, fontWeight: '600', lineHeight: 31, letterSpacing: -0.5, marginBottom: 14},
  heroLede: {fontSize: orenaText.body, lineHeight: 24, marginBottom: 26},
  heroActions: {flexDirection: 'row', flexWrap: 'wrap', gap: 12},
  metric: {gap: 2, minWidth: 96},
  metricLabel: {fontSize: orenaText.meta},
  metricValue: {fontSize: orenaText.title, fontWeight: '700'},
});
