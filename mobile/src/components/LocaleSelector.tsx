import {Pressable, Text, View} from 'react-native';
import {useI18n} from '../i18n/I18nProvider';
import {useTheme} from '../theme/ThemeProvider';
import type {Locale} from '../i18n/messages';

const choices: readonly Locale[] = ['en', 'zh'];

export function LocaleSelector() {
  const {locale, setLocale, t} = useI18n();
  const {tokens} = useTheme();
  const labels: Record<Locale, string> = {en: t('locale.english'), zh: t('locale.chinese')};
  return (
    <View accessibilityRole="radiogroup" accessible>
      {choices.map((choice) => (
        <Pressable
          key={choice}
          accessible
          accessibilityRole="radio"
          accessibilityLabel={labels[choice]}
          accessibilityState={{selected: locale === choice}}
          onPress={() => setLocale(choice)}
          style={{minHeight: 48, paddingHorizontal: 16, paddingVertical: 12, borderRadius: tokens.radius.control, marginBottom: 8, backgroundColor: locale === choice ? tokens.colors.accent : tokens.colors.surface}}
        >
          <Text style={{color: tokens.colors.text, fontWeight: locale === choice ? '700' : '400'}}>{labels[choice]}</Text>
        </Pressable>
      ))}
    </View>
  );
}
