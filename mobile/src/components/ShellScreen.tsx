import {StyleSheet, Text} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useI18n} from '../i18n/I18nProvider';
import {useTheme} from '../theme/ThemeProvider';

export function ShellScreen({title}: {title: string}) {
  const {tokens} = useTheme();
  const {t} = useI18n();
  return (
    <SafeAreaView style={[styles.container, {backgroundColor: tokens.colors.background}]}>
      <Text accessibilityRole="header" style={[styles.title, {color: tokens.colors.heading}]}>{title}</Text>
      <Text style={[styles.body, {color: tokens.colors.mutedText}]}>{t('shell.placeholder')}</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, padding: 24, gap: 12},
  title: {fontSize: 28, fontWeight: '700'},
  body: {fontSize: 16, lineHeight: 24},
});
