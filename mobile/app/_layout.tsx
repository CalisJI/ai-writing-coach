import {Stack} from 'expo-router';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {StatusBar} from 'expo-status-bar';
import {I18nProvider} from '../src/i18n/I18nProvider';
import {SessionProvider} from '../src/auth/SessionHarness';
import {SessionBootstrapBridge} from '../src/auth/SessionBootstrapBridge';
import {AppErrorBoundary} from '../src/components/AppErrorBoundary';
import {ThemeProvider, useTheme} from '../src/theme/ThemeProvider';
import {QueryClientProvider} from '@tanstack/react-query';
import {queryClient} from '../src/query/queryClient';
import {useLifecycleRevalidation} from '../src/query/lifecycleRevalidation';

function LifecycleRevalidationBridge() {
  useLifecycleRevalidation(queryClient);
  return null;
}

function RootStack() {
  const {scheme} = useTheme();
  return <><StatusBar style={scheme === 'dark' ? 'light' : 'dark'} /><Stack screenOptions={{headerShown: false}} /></>;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <LifecycleRevalidationBridge />
        <ThemeProvider>
          <I18nProvider>
            <SessionProvider>
              <SessionBootstrapBridge>
                <AppErrorBoundary><RootStack /></AppErrorBoundary>
              </SessionBootstrapBridge>
            </SessionProvider>
          </I18nProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
