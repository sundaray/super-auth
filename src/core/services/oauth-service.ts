import type { AuthConfig } from '../../types/index.js';
import type { SessionStorage } from '../session/types.js';
import type { OAuthProvider } from '../../providers/types.js';
import {
  generateState,
  generateCodeVerifier,
  generateCodeChallenge,
} from '../pkce/index.js';
import {
  encryptOAuthStatePayload,
  decryptOAuthStateJWE,
} from '../oauth/index.js';
import { OAUTH_STATE_MAX_AGE } from '../constants.js';
import type { SignInOptions } from '../../types/index.js';
import { ResultAsync, safeTry, ok, err } from 'neverthrow';
import { InitiateSignInError, CompleteSignInError } from './errors.js';
import { AuthError } from '../errors.js';

export class OAuthService<TContext> {
  constructor(
    private config: AuthConfig,
    private oauthStateStorage: SessionStorage<TContext>,
  ) {}

  // --------------------------------------------
  // Initiate OAuth sign-in
  // --------------------------------------------
  initiateSignIn(
    provider: OAuthProvider,
    options?: SignInOptions,
  ): ResultAsync<
    { authorizationUrl: string; oauthStateJWE: string },
    AuthError
  > {
    const config = this.config;

    return safeTry(async function* () {
      const state = yield* generateState();

      const codeVerifier = yield* generateCodeVerifier();

      const codeChallenge = yield* generateCodeChallenge(codeVerifier);

      const oauthStateJWE = yield* encryptOAuthStatePayload({
        oauthState: {
          state,
          codeVerifier,
          redirectTo: options?.redirectTo || '/',
          provider: provider.id,
        },
        secret: config.session.secret,
        maxAge: OAUTH_STATE_MAX_AGE,
      });

      const authorizationUrl = yield* provider.getAuthorizationUrl({
        state,
        codeChallenge,
      });

      return ok({
        authorizationUrl,
        oauthStateJWE,
      });
    }).mapErr((error) => {
      if (error instanceof AuthError) {
        return error;
      }
      return new InitiateSignInError({
        message: `Failed to initiate OAuth sign-in.)`,
        cause: error,
      });
    });
  }

  // --------------------------------------------
  // Complete OAuth sign-in
  // --------------------------------------------
  completeSignIn(
    request: Request,
    context: TContext,
    provider: OAuthProvider,
  ): ResultAsync<
    {
      sessionData: Record<string, unknown>;
      redirectTo: `/${string}`;
    },
    AuthError
  > {
    const config = this.config;
    const oauthStateStorage = this.oauthStateStorage;

    return safeTry(async function* () {
      // Get OAuth state from cookie
      const oauthStateJWE = yield* oauthStateStorage.getSession(context);

      if (!oauthStateJWE) {
        return err(
          new CompleteSignInError({
            message: 'OAuth state cookie not found.',
          }),
        );
      }

      // Decrypt OAuth state
      const oauthState = yield* decryptOAuthStateJWE({
        jwe: oauthStateJWE,
        secret: config.session.secret,
      });

      // Complete authentication with provider
      const userClaims = yield* provider.completeSignin(request, oauthState);

      // Call provider's onAuthenticated callback
      const sessionData = yield* provider.onAuthenticated(userClaims);

      return ok({
        sessionData,
        redirectTo: oauthState.redirectTo || '/',
      });
    }).mapErr((error) => {
      if (error instanceof AuthError) {
        return error;
      }

      return new CompleteSignInError({
        message: 'Failed to complete OAuth sign-in.',
        cause: error,
      });
    });
  }
}
