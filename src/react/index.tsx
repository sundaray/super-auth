'use client';

import React, { createContext, useContext, useState } from 'react';
import type { UserSession } from '../core/session/types';

import { MissingUserSessionProviderError } from './errors';

type SessionContextState =
  | { status: 'pending'; session: null; error: null }
  | { status: 'success'; session: UserSession | null; error: null }
  | { status: 'error'; session: null; error: Error };

const UserSessionContext = createContext<SessionContextState | undefined>(
  undefined,
);

export function UserSessionProvider({
  children,
  session,
}: {
  children: React.ReactNode;
  session: UserSession | null;
}) {
  const [state, setState] = useState<SessionContextState>(() => ({
    status: 'success',
    session: session,
    error: null,
  }));

  return (
    <UserSessionContext.Provider value={state}>
      {children}
    </UserSessionContext.Provider>
  );
}

export function useUserSession() {
  const context = useContext(UserSessionContext);

  if (!context) {
    throw new MissingUserSessionProviderError();
  }

  return context;
}
