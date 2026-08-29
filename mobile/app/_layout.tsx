import {Stack} from 'expo-router';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {StatusBar} from 'expo-status-bar';
import {I18nProvider} from '../src/i18n/I18nProvider';
import {SessionProvider} from '../src/auth/SessionHarness';
import {AppErrorBoundary} from '../src/components/AppErrorBoundary';
import {ThemeProvider, useTheme} from '../src/theme/ThemeProvider';

function RootStack() {
  const {scheme} = useTheme();
  return <><StatusBar style={scheme === 'dark' ? 'light' : 'dark'} /><Stack screenOptions={{headerShown: false}} /></>;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <I18nProvider>
          <SessionProvider>
            <AppErrorBoundary><RootStack /></AppErrorBoundary>
          </SessionProvider>
        </I18nProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
