import {Redirect} from 'expo-router';
import {useSession} from '../src/auth/SessionHarness';
import {BootstrapStatusScreen} from '../src/components/BootstrapStatusScreen';

export default function Index() {
  const {session, signInForDevelopment} = useSession();
  if (session.status === 'loading') return <BootstrapStatusScreen kind="loading" />;
  if (session.status === 'unavailable') return <BootstrapStatusScreen kind="unavailable" onDevelopmentMode={signInForDevelopment} />;
  return <Redirect href={session.status === 'authenticated' ? '/(app)' : '/(auth)/sign-in'} />;
}
