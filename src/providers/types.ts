import type { LucidAuthError } from '../core/errors';
import { Result, ResultAsync } from 'neverthrow';
import type { OAuthStatePayload } from '../core/oauth/types';
import type { User } from '../core/session/types';
import type { CredentialProviderConfig } from './credential/types';

export type AuthProviderId = 'google' | 'credential';

export interface OAuthProvider {
  id: AuthProviderId;
  type: 'oauth';
  getAuthorizationUrl(params: {
    state: string;
    codeChallenge: string;
    prompt?: string;
    baseUrl: string;
  }): Result<string, LucidAuthError>;
  completeSignin(
    request: Request,
    oauthStatePayload: OAuthStatePayload,
    baseUrl: string,
  ): ResultAsync<Record<string, any>, LucidAuthError>;

  onAuthenticated(
    userClaims: Record<string, any>,
  ): ResultAsync<User, LucidAuthError>;
}

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
  ): ResultAsync<{ email: string; redirectTo: `/${string}` }, LucidAuthError>;
  signIn(data: {
    email: string;
    password: string;
  }): ResultAsync<User & { hashedPassword: string }, LucidAuthError>;
  verifyEmail(
    request: Request,
    secret: string,
  ): ResultAsync<{ redirectTo: `/${string}` }, LucidAuthError>;
  forgotPassword(
    data: {
      email: string;
    },
    secret: string,
    baseUrl: string,
  ): ResultAsync<{ redirectTo: `/${string}` }, LucidAuthError>;
  verifyPasswordResetToken(
    request: Request,
    secret: string,
  ): ResultAsync<
    { email: string; passwordHash: string; redirectTo: `/${string}` },
    LucidAuthError
  >;
  resetPassword(
    token: string,
    data: { newPassword: string },
    secret: string,
  ): ResultAsync<{ redirectTo: `/${string}` }, LucidAuthError>;
}

export type AnyAuthProvider = OAuthProvider | CredentialProvider;
