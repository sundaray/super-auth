import type { AuthProviderId } from '../../providers/types.js';
import {
  GetSessionError,
  SaveSessionError,
  DeleteSessionError,
} from './errors.js';

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
  getSession(context: TContext): ResultAsync<string | null, GetSessionError>;
  saveSession(
    context: TContext,
    session: string,
  ): ResultAsync<void, SaveSessionError>;
  deleteSession(context: TContext): ResultAsync<void, DeleteSessionError>;
}

export interface CookieOptions {
  maxAge?: number;
  path?: string;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'lax' | 'strict' | 'none';
}

export type UserSessionJWE = string & { __brand: UserSessionJWE };
