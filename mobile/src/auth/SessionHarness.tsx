import {createContext, useContext, useMemo, useState, type PropsWithChildren} from 'react';

export type SessionState = {status: 'signed-out'} | {status: 'authenticated'; userLabel: string};

type SessionContextValue = {
  session: SessionState;
  signInForDevelopment: () => void;
  signOut: () => void;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({children}: PropsWithChildren) {
  const [session, setSession] = useState<SessionState>({status: 'signed-out'});
  const value = useMemo(() => ({
    session,
    signInForDevelopment: () => setSession({status: 'authenticated', userLabel: 'Development learner'}),
    signOut: () => setSession({status: 'signed-out'}),
  }), [session]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession must be used inside SessionProvider');
  return value;
}
