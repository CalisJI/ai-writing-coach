import {SafeAreaView} from 'react-native-safe-area-context';
import {Text, View} from 'react-native';
import {useI18n} from '../i18n/I18nProvider';
import {useTheme} from '../theme/ThemeProvider';
import {AccessibleButton} from './AccessibleButton';

export function BootstrapStatusScreen({kind, onDevelopmentMode}: {kind: 'loading' | 'unavailable'; onDevelopmentMode?: () => void}) {
  const {tokens} = useTheme();
  const {t} = useI18n();
  const loading = kind === 'loading';
  return (
    <SafeAreaView style={{flex: 1, backgroundColor: tokens.colors.background}}>
      <View style={{flex: 1, justifyContent: 'center', padding: tokens.spacing.large, gap: tokens.spacing.medium}}>
        <Text accessibilityRole="header" style={{fontSize: 28, fontWeight: '700', color: tokens.colors.heading}}>
          {loading ? t('bootstrap.loading') : t('bootstrap.unavailable_title')}
        </Text>
        {!loading && <Text style={{fontSize: 16, color: tokens.colors.mutedText}}>{t('bootstrap.unavailable_body')}</Text>}
        {!loading && onDevelopmentMode && <AccessibleButton label={t('auth.sign_in')} onPress={onDevelopmentMode} />}
      </View>
    </SafeAreaView>
  );
}
