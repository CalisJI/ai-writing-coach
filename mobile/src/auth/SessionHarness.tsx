import {createContext, useCallback, useContext, useMemo, useState, type PropsWithChildren} from 'react';

export type SessionState =
  | {status: 'loading' | 'signed-out' | 'unavailable'; source: 'server'; errorCategory?: string}
  | {status: 'authenticated'; source: 'server' | 'development'; userLabel: string};

type SessionContextValue = {
  session: SessionState;
  setBootstrapState: (state: SessionState) => void;
  signInForDevelopment: () => void;
  signOut: () => void;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({children}: PropsWithChildren) {
  const [session, setSession] = useState<SessionState>({status: 'loading', source: 'server'});
  const setBootstrapState = useCallback((next: SessionState) => setSession((current) => {
    if (current.source === 'development') return current;
    const currentError = 'errorCategory' in current ? current.errorCategory : undefined;
    const nextError = 'errorCategory' in next ? next.errorCategory : undefined;
    const currentUser = 'userLabel' in current ? current.userLabel : undefined;
    const nextUser = 'userLabel' in next ? next.userLabel : undefined;
    if (current.status === next.status && currentError === nextError && currentUser === nextUser) return current;
    return next;
  }), []);
  const signInForDevelopment = useCallback(() => setSession({status: 'authenticated', source: 'development', userLabel: 'Development learner'}), []);
  const signOut = useCallback(() => setSession({status: 'signed-out', source: 'server'}), []);
  const value = useMemo(() => ({session, setBootstrapState, signInForDevelopment, signOut}), [session, setBootstrapState, signInForDevelopment, signOut]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession must be used inside SessionProvider');
  return value;
}
