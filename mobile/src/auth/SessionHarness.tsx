import {createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren} from 'react';
import {createConfiguredApiClient} from '../api/client';
import {ApiError} from '../api/errors';
import {NativeAuthFlow} from './NativeAuthFlow';
import {NativeSessionController} from './NativeSessionController';
import {secureSessionStorage, type SecureSessionStorage} from './secureSessionStorage';

export type SessionState =
  | {status: 'loading' | 'signed-out' | 'unavailable'; source: 'server'; errorCategory?: string}
  | {status: 'authenticated'; source: 'server' | 'development'; userLabel: string};

type SessionContextValue = {
  session: SessionState;
  sessionCookie: string | null | undefined;
  setBootstrapState: (state: SessionState) => void;
  signInForDevelopment: () => void;
  signInWithBrowser: () => Promise<void>;
  signOut: () => void;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({children, storage = secureSessionStorage}: PropsWithChildren<{storage?: SecureSessionStorage}>) {
  const [session, setSession] = useState<SessionState>({status: 'loading', source: 'server'});
  const [sessionCookie, setSessionCookie] = useState<string | null | undefined>(undefined);
  const operation = useRef(0);
  const controller = useMemo(() => new NativeSessionController(storage), [storage]);
  useEffect(() => {
    let mounted = true;
    const restoreOperation = operation.current;
    void controller.restore().then((result) => {
      if (!mounted || restoreOperation !== operation.current) return;
      if (result.status === 'restored') {
        setSessionCookie(result.sessionCookie);
        setSession({status: 'loading', source: 'server'});
      } else if (result.status === 'unavailable') {
        setSessionCookie(null);
        setSession({status: 'unavailable', source: 'server', errorCategory: result.errorCategory});
      } else {
        setSessionCookie(null);
        setSession({status: 'signed-out', source: 'server'});
      }
    });
    return () => { mounted = false; };
  }, [controller]);
  const setBootstrapState = useCallback((next: SessionState) => setSession((current) => {
    if (current.source === 'development') return current;
    const currentError = 'errorCategory' in current ? current.errorCategory : undefined;
    const nextError = 'errorCategory' in next ? next.errorCategory : undefined;
    const currentUser = 'userLabel' in current ? current.userLabel : undefined;
    const nextUser = 'userLabel' in next ? next.userLabel : undefined;
    if (current.status === next.status && currentError === nextError && currentUser === nextUser) return current;
    return next;
  }), []);
  const signInForDevelopment = useCallback(() => {
    operation.current += 1;
    void controller.clearLocal();
    setSessionCookie(null);
    setSession({status: 'authenticated', source: 'development', userLabel: 'Development learner'});
  }, [controller]);
  const signInWithBrowser = useCallback(async () => {
    operation.current += 1;
    setSessionCookie(undefined);
    setSession({status: 'loading', source: 'server'});
    try {
      const result = await new NativeAuthFlow(createConfiguredApiClient(), storage).signIn();
      if (result.status === 'cancelled') {
        setSessionCookie(null);
        setSession({status: 'signed-out', source: 'server'});
      } else {
        setSessionCookie(result.sessionCookie);
        setSession({status: 'loading', source: 'server'});
      }
    } catch (error) {
      setSessionCookie(null);
      setSession({status: 'unavailable', source: 'server', errorCategory: error instanceof ApiError ? error.category : 'unknown'});
    }
  }, [storage]);
  const signOut = useCallback(() => {
    operation.current += 1;
    const cookie = sessionCookie ?? null;
    setSessionCookie(null);
    setSession({status: 'signed-out', source: 'server'});
    let client;
    try { client = createConfiguredApiClient(); } catch { client = undefined; }
    void controller.logout(cookie, client).catch(() => undefined);
  }, [controller, sessionCookie]);
  const value = useMemo(() => ({session, sessionCookie, setBootstrapState, signInForDevelopment, signInWithBrowser, signOut}), [session, sessionCookie, setBootstrapState, signInForDevelopment, signInWithBrowser, signOut]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession must be used inside SessionProvider');
  return value;
}
