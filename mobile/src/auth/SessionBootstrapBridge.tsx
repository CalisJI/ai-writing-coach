import {useEffect, type PropsWithChildren} from 'react';
import {useSession} from './SessionHarness';
import {useSessionBootstrap} from '../query/useSessionBootstrap';

export function SessionBootstrapBridge({children}: PropsWithChildren) {
  const result = useSessionBootstrap();
  const {session, setBootstrapState} = useSession();
  useEffect(() => {
    if (session.source === 'development') return;
    if (result.isPending) {
      setBootstrapState({status: 'loading', source: 'server'});
    } else if (result.data) {
      setBootstrapState({status: 'authenticated', source: 'server', userLabel: result.data.user.role});
    } else if (result.error?.category === 'authentication_required') {
      setBootstrapState({status: 'signed-out', source: 'server'});
    } else if (result.error) {
      setBootstrapState({status: 'unavailable', source: 'server', errorCategory: result.error.category});
    }
  }, [result.data, result.error, result.isPending, session.source, setBootstrapState]);
  return children;
}
