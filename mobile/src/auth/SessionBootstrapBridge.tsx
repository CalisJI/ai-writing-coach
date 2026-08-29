import {useEffect, type PropsWithChildren} from 'react';
import {useSession} from './SessionHarness';
import {useSessionBootstrap} from '../query/useSessionBootstrap';

export function SessionBootstrapBridge({children}: PropsWithChildren) {
  const {session, sessionCookie, setBootstrapState, signOut} = useSession();
  const result = useSessionBootstrap(undefined, sessionCookie);
  useEffect(() => {
    if (session.source === 'development') return;
    if (sessionCookie === undefined || (session.status === 'unavailable' && sessionCookie === null)) {
      if (session.status !== 'unavailable') setBootstrapState({status: 'loading', source: 'server'});
    } else if (sessionCookie === null) {
      setBootstrapState({status: 'signed-out', source: 'server'});
    } else if (result.isPending) {
      setBootstrapState({status: 'loading', source: 'server'});
    } else if (result.data) {
      setBootstrapState({status: 'authenticated', source: 'server', userLabel: result.data.user.role});
    } else if (result.error?.category === 'authentication_required') {
      signOut();
    } else if (result.error) {
      setBootstrapState({status: 'unavailable', source: 'server', errorCategory: result.error.category});
    }
  }, [result.data, result.error, result.isPending, session, sessionCookie, setBootstrapState, signOut]);
  return children;
}
