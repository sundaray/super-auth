import type { AuthConfig } from '../../types';
import type { SessionStorage } from '../session/types';
import {
  encryptUserSessionPayload,
  decryptUserSessionJWE,
  createUserSessionPayload,
  type User,
  type UserSession,
  type UserSessionJWE,
} from '../session';
import type { AuthProviderId } from '../../providers/types';
import { ResultAsync, okAsync } from 'neverthrow';
import { LucidAuthError, UnknownError } from '../errors';

export class SessionService<TContext> {
  constructor(
    private config: AuthConfig,
    private userSessionStorage: SessionStorage<TContext>,
  ) {}

  // --------------------------------------------
  // Create session
  // --------------------------------------------
  createSession(
    user: User,
    provider: AuthProviderId,
  ): ResultAsync<UserSessionJWE, LucidAuthError> {
    return createUserSessionPayload({
      user,
      provider,
    })
      .andThen((userSessionPayload) =>
        encryptUserSessionPayload({
          payload: userSessionPayload,
          secret: this.config.session.secret,
          maxAge: this.config.session.maxAge,
        }),
      )
      .mapErr((error) => {
        if (error instanceof LucidAuthError) {
          return error;
        }
        return new UnknownError({
          context: 'session-service.createSession',
          cause: error,
        });
      });
  }

  // --------------------------------------------
  // Get session
  // --------------------------------------------
  getSession(
    context: TContext,
  ): ResultAsync<UserSession | null, LucidAuthError> {
    return this.userSessionStorage
      .getSession(context)
      .andThen((userSessionJWE) => {
        if (!userSessionJWE) {
          return okAsync(null);
        }

        return decryptUserSessionJWE({
          JWE: userSessionJWE as UserSessionJWE,
          secret: this.config.session.secret,
        });
      })
      .mapErr((error) => {
        if (error instanceof LucidAuthError) {
          return error;
        }
        return new UnknownError({
          context: 'session-service.getSession',
          cause: error,
        });
      });
  }

  // --------------------------------------------
  // Delete session
  // --------------------------------------------
  deleteSession(context: TContext): ResultAsync<void, LucidAuthError> {
    return this.userSessionStorage.deleteSession(context).mapErr((error) => {
      if (error instanceof LucidAuthError) {
        return error;
      }
      return new UnknownError({
        context: 'session-service.deleteSession',
        cause: error,
      });
    });
  }
}
