import {Redirect, Stack} from 'expo-router';
import {useSession} from '../../src/auth/SessionHarness';

export default function AppLayout() {
  const {session} = useSession();
  if (session.status !== 'authenticated') return <Redirect href="/(auth)/sign-in" />;
  return <Stack screenOptions={{headerShown: false}} />;
}
