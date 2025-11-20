import type { AnyAuthProvider } from '../providers/types.js';

export interface SignInOptions {
  redirectTo?: `/${string}`;
}

export interface AuthConfig {
  /**
   * The absolute URL of your application.
   *
   * - In production: This should be your deployed domain (e.g., https://myapp.com).
   * - In development: This is usually http://localhost:3000.
   */
  baseUrl: string;
  session: {
    /**
     * A random string used to sign and encrypt JSON Web Tokens (JWTs).
     *
     * You can generate a valid secret by running the following command in your terminal:
     *
     * ```bash
     * openssl rand -base64 32
     * ```
     */
    secret: string;
    /**
     * The duration (in seconds) that the user's session will last.
     */
    maxAge: number;
  };
  providers: AnyAuthProvider[];
}
