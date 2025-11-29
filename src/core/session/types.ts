import type { AuthProviderId } from '../../providers/types';
import { LucidAuthError } from '../errors';

import { ResultAsync } from 'neverthrow';

export interface UserSession {
  email?: string | null;
  name?: string | null;
  image?: string | null;
  role?: string | null;
  [key: string]: unknown;
}

export interface UserSessionPayload extends UserSession {
  maxAge: number;
  provider: AuthProviderId;
}

export interface SessionStorage<TContext> {
  getSession(context: TContext): ResultAsync<string | null, LucidAuthError>;
  saveSession(
    context: TContext,
    session: string,
  ): ResultAsync<void, LucidAuthError>;
  deleteSession(context: TContext): ResultAsync<void, LucidAuthError>;
}

export interface CookieOptions {
  maxAge?: number;
  path?: string;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'lax' | 'strict' | 'none';
}

export type UserSessionJWE = string & { __brand: UserSessionJWE };
