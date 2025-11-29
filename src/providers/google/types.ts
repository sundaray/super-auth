import type { UserSession } from '../../core/session/types.js';

export interface GoogleUserClaims {
  aud: string;
  exp: number;
  iat: number;
  iss: string;
  sub: string;
  email: string;
  at_hash?: string;
  azp?: string;
  email_verified?: boolean;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  locale?: string;
  profile?: string;
}

export interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  id_token: string;
  scope: string;
  token_type: string;
  refresh_token?: string;
}

export interface GoogleProviderConfig {
  clientId: string;
  clientSecret: string;
  /**
   * A callback that SuperAuth executes after a user successfully authenticates with Google.
   *
   * SuperAuth provides the user claims (profile information returned by Google) as the
   * callback parameter. Use these claims to find or create a user in your database,
   * then return the data you want stored in the user session.
   *
   *
   * @param userClaims - The profile information returned by Google.
   * @returns The object you return becomes the user session.
   */
  onAuthenticated(userClaims: GoogleUserClaims): Promise<UserSession>;
}
