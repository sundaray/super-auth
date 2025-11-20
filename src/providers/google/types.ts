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
  redirectUri: string;
  /**
   * A callback that runs after the user successfully authenticates with Google.
   *
   * It receives the `userClaims` (like email, name, picture) returned by Google.
   * You can use these claims to find or create a user in your database.
   *
   * **Important**: The object you return here becomes the `UserSession`.
   *
   * @param userClaims - The profile information returned by Google.
   */
  onAuthenticated(userClaims: GoogleUserClaims): Promise<UserSession>;
}
