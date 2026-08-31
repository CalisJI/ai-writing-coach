import {Pressable, Text, View} from 'react-native';
import {useI18n} from '../i18n/I18nProvider';
import {useTheme, type ThemePreference} from '../theme/ThemeProvider';

const choices: readonly ThemePreference[] = ['system', 'light', 'dark'];

export function ThemeSelector() {
  const {preference, setPreference, tokens} = useTheme();
  const {t} = useI18n();
  const labels: Record<ThemePreference, string> = {
    system: t('theme.system'),
    light: t('theme.light'),
    dark: t('theme.dark'),
  };
  return (
    <View accessibilityRole="radiogroup" accessible>
      {choices.map((choice) => (
        <Pressable
          key={choice}
          accessible
          accessibilityRole="radio"
          accessibilityLabel={labels[choice]}
          accessibilityState={{selected: preference === choice}}
          onPress={() => setPreference(choice)}
          style={{minHeight: 48, paddingHorizontal: 16, paddingVertical: 12, borderRadius: tokens.radius.control, marginBottom: 8, backgroundColor: preference === choice ? tokens.colors.accent : tokens.colors.surface}}
        >
          <Text style={{color: tokens.colors.text, fontWeight: preference === choice ? '700' : '400'}}>{labels[choice]}</Text>
        </Pressable>
      ))}
    </View>
  );
}
