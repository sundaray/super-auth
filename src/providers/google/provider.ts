import { Result, ok, err, ResultAsync, safeTry } from 'neverthrow';
import type { OAuthProvider } from '../../providers/types.js';
import type { GoogleUserClaims, GoogleProviderConfig } from './types.js';
import type { OAuthStatePayload } from '../../core/oauth/types.js';

import { decodeGoogleIdToken } from './decode-google-id-token.js';
import { exchangeAuthorizationCodeForTokens } from './exchange-authorization-code-for-tokens.js';

import {
  AuthorizationCodeNotFoundError,
  StateNotFoundError,
  StateMismatchError,
} from '../../core/oauth/errors.js';

import {
  SuperAuthError,
  UnknownError,
  CallbackError,
} from '../../core/errors.js';
import { CreateAuthorizationUrlError } from '../../core/oauth/errors.js';

// --------------------------------------------
//
// Google provider
//
// --------------------------------------------
export class GoogleProvider implements OAuthProvider {
  id = 'google' as const;
  type = 'oauth' as const;
  config: GoogleProviderConfig;

  constructor(config: GoogleProviderConfig) {
    this.config = config;
  }

  // --------------------------------------------
  // Get Authorization URL
  // --------------------------------------------

  getAuthorizationUrl(params: {
    state: string;
    codeChallenge: string;
    prompt?: string;
  }): Result<string, SuperAuthError> {
    const { state, codeChallenge, prompt } = params;
    return Result.fromThrowable(
      () => {
        const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');

        url.searchParams.set('response_type', 'code');
        url.searchParams.set('client_id', this.config.clientId);
        url.searchParams.set('redirect_uri', this.config.redirectUri);
        url.searchParams.set('state', state);
        url.searchParams.set('code_challenge', codeChallenge);
        url.searchParams.set('code_challenge_method', 'S256');
        url.searchParams.set('scope', 'openid email profile');
        url.searchParams.set('prompt', prompt || 'select_account');

        return url.toString();
      },
      (error) => new CreateAuthorizationUrlError({ cause: error }),
    )();
  }

  // --------------------------------------------
  // Complete sign-in
  // --------------------------------------------
  completeSignin(
    request: Request,
    oauthStatePayload: OAuthStatePayload,
  ): ResultAsync<GoogleUserClaims, SuperAuthError> {
    const config = this.config;

    return safeTry(async function* () {
      const url = new URL(request.url);
      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state');

      if (!code) {
        return err(new AuthorizationCodeNotFoundError());
      }

      if (!state) {
        return err(new StateNotFoundError());
      }

      // Compare the state stored in cookie with state stored in URL
      if (oauthStatePayload.state !== state) {
        return err(new StateMismatchError());
      }

      // Exchange authorization code for tokens
      const tokens = yield* exchangeAuthorizationCodeForTokens({
        code,
        clientId: config.clientId,
        clientSecret: config.clientSecret,
        redirectUri: config.redirectUri,
        codeVerifier: oauthStatePayload.codeVerifier,
      });

      // Decode the id_token for user claims
      const userClaims = yield* decodeGoogleIdToken(tokens.id_token);

      return ok(userClaims);
    }).mapErr((error) => {
      if (error instanceof SuperAuthError) {
        return error;
      }
      return new UnknownError({
        context: 'google-provider.completeSignin',
        cause: error,
      });
    });
  }

  // --------------------------------------------
  // Execute user's onAuthenticated callback
  // --------------------------------------------
  onAuthenticated(
    userClaims: GoogleUserClaims,
  ): ResultAsync<Record<string, unknown>, SuperAuthError> {
    return ResultAsync.fromPromise(
      this.config.onAuthenticated(userClaims),
      (error) =>
        new CallbackError({
          callback: 'onAuthenticated',
          cause: error,
        }),
    );
  }
}
