import {useI18n} from '../../src/i18n/I18nProvider';
import {ThemeSelector} from '../../src/components/ThemeSelector';
import {LocaleSelector} from '../../src/components/LocaleSelector';
import {SafeAreaView} from 'react-native-safe-area-context';
import {StyleSheet, Text} from 'react-native';
import {useTheme} from '../../src/theme/ThemeProvider';

export default function ProfileScreen() {
  const {t} = useI18n();
  const {tokens} = useTheme();
  return <SafeAreaView style={[styles.container, {backgroundColor: tokens.colors.background}]}>
    <Text accessibilityRole="header" style={[styles.title, {color: tokens.colors.text}]}>{t('nav.profile')}</Text>
    <LocaleSelector />
    <ThemeSelector />
  </SafeAreaView>;
}

const styles = StyleSheet.create({container: {flex: 1, padding: 24, gap: 16}, title: {fontSize: 28, fontWeight: '700'}});
