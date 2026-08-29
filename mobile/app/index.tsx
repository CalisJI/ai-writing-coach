import {Redirect} from 'expo-router';
import {useSession} from '../src/auth/SessionHarness';

export default function Index() {
  const {session} = useSession();
  return <Redirect href={session.status === 'authenticated' ? '/(app)' : '/(auth)/sign-in'} />;
}
