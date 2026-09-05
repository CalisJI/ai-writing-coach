import {Redirect, Stack} from 'expo-router';
import {useSession} from '../../src/auth/SessionHarness';
import {useTheme} from '../../src/theme/ThemeProvider';
import {AppShell} from '../../src/components/AppShell';

export default function AppLayout() {
  const {session} = useSession();
  const {tokens} = useTheme();
  if (session.status !== 'authenticated') return <Redirect href="/(auth)/sign-in" />;
  // Every authenticated screen sits inside the Orena shell, as on the web.
  return (
    <AppShell>
      <Stack screenOptions={{headerShown: false, contentStyle: {backgroundColor: tokens.colors.background}}} />
    </AppShell>
  );
}
