import {SafeAreaView} from 'react-native-safe-area-context';
import {Text, View} from 'react-native';
import {useRouter} from 'expo-router';
import {useI18n} from '../../src/i18n/I18nProvider';
import {useSession} from '../../src/auth/SessionHarness';
import {AccessibleButton} from '../../src/components/AccessibleButton';
import {useTheme} from '../../src/theme/ThemeProvider';

export default function SignInScreen() {
  const {tokens} = useTheme();
  const {t} = useI18n();
  const {signInForDevelopment} = useSession();
  const router = useRouter();
  return (
    <SafeAreaView style={{flex: 1, backgroundColor: tokens.colors.background}}>
      <View style={{flex: 1, justifyContent: 'center', padding: tokens.spacing.large, gap: tokens.spacing.medium}}>
        <Text accessibilityRole="header" style={{fontSize: 30, fontWeight: '700', color: tokens.colors.text}}>{t('auth.signed_out_title')}</Text>
        <Text style={{fontSize: 17, color: tokens.colors.mutedText}}>{t('auth.signed_out_body')}</Text>
        <AccessibleButton label={t('auth.sign_in')} onPress={() => {signInForDevelopment(); router.replace('/(app)');}} />
      </View>
    </SafeAreaView>
  );
}
