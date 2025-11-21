import type { SuperAuthError } from '../core/errors.js';
import { Result, ResultAsync } from 'neverthrow';
import type { OAuthStatePayload } from '../core/oauth/types.js';
import type { User, CredentialProviderConfig } from './credential/types.js';

export type AuthProviderId = 'google' | 'credential';

/**
 * Contract for OAuth providers (Google, GitHub, etc.)
 * Not user-facing - implemented by provider classes
 */
export interface OAuthProvider {
  id: AuthProviderId;
  type: 'oauth';
  getAuthorizationUrl(params: {
    state: string;
    codeChallenge: string;
    prompt?: string;
  }): Result<string, SuperAuthError>;
  completeSignin(
    request: Request,
    oauthStatePayload: OAuthStatePayload,
  ): ResultAsync<Record<string, any>, SuperAuthError>;

  onAuthenticated(
    userClaims: Record<string, any>,
  ): ResultAsync<Record<string, unknown>, SuperAuthError>;
}

/**
 * Contract for credential (email/password) provider
 * Not user-facing - implemented by CredentialProvider class
 */
export interface CredentialProvider {
  id: 'credential';
  type: 'credential';
  config: CredentialProviderConfig;
  signUp(
    data: {
      email: string;
      password: string;
      [key: string]: unknown;
    },
    secret: string,
    baseUrl: string,
  ): ResultAsync<User, SuperAuthError>;
  signIn(data: {
    email: string;
    password: string;
  }): ResultAsync<User, SuperAuthError>;
  verifyEmail(
    token: string,
    secret: string,
  ): ResultAsync<{ email: string }, SuperAuthError>;
}

export type AnyAuthProvider = OAuthProvider | CredentialProvider;
