import type { AuthProviderId } from '../../providers/types';

export type OAuthStateJWE = string & { __brand: OAuthStateJWE };

export type UserClaims = Record<string, any>;

export interface OAuthStatePayload {
  state: string;
  codeVerifier: string;
  redirectTo?: `/${string}`;
  provider: AuthProviderId;
}

export interface OAuthSignInResult {
  userClaims: Record<string, any>;
  oauthState: OAuthStatePayload;
  tokens: Record<string, any>;
}
