import type { UserSession } from '../../core/session/types';

export interface CredentialProviderConfig {
  onSignUp: {
    /**
     * A callback that SuperAuth executes to check if a user with a credential account already exists.
     *
     * SuperAuth provides the email address from the sign-up form as the callback parameter. Query your database
     * to check if a user with this email already has a credential-based account.
     *
     * @param params - An object containing the `email` property.
     * @param params.email - The email address provided in the sign-up form.
     *
     * @returns An object with `exists: true` if the user has a credential account,
     * or `exists: false` otherwise.
     */
    checkUserExists(params: { email: string }): Promise<{ exists: boolean }>;
    /**
     * A callback that SuperAuth executes to send the email verification link.
     *
     * SuperAuth provides the user's email address and the verification URL as callback
     * parameters. Use your email service to send the verification link to the user.
     *
     * @param params - An object containing `email` and `url` properties.
     * @param params.email - The email address to send the verification link to.
     * @param params.url - The verification URL the user should click.
     */
    sendVerificationEmail(params: {
      email: string;
      url: string;
    }): Promise<void>;
    /**
     * A callback that SuperAuth executes after the user clicks the email verification link.
     *
     * SuperAuth provides the verified email address, the hashed password, and any additional
     * fields from the sign-up form as callback parameters. Use these to create the user
     * and their credential account in your database.
     *
     * @param params - An object containing the `email` and `hashedPassword` properties, *plus any additional fields from the sign-up form*.
     * @param params.email - The verified email address.
     * @param params.hashedPassword - The hashed password (hashed by SuperAuth).
     */
    createUser(params: {
      email: string;
      hashedPassword: string;
      [key: string]: unknown;
    }): Promise<void>;
    redirects: {
      /**
       * The URL SuperAuth should redirect the user to after they submit the sign-up form.
       *
       * This page should instruct the user to check their inbox for an email verification link.
       */
      checkEmail: `/${string}`;
      /**
       * The URL SuperAuth should redirect the user to after their email is successfully
       * verified.
       *
       * This page should inform the user that their email has been successfully verified
       * and prompt them to sign in.
       */
      emailVerificationSuccess: `/${string}`;
      /**
       * The URL SuperAuth should redirect the user to if it fails to verify the email verification token.
       *
       * SuperAuth will append an `error` query parameter to this URL describing the
       * reason for the error.
       */
      emailVerificationError: `/${string}`;
    };
  };
  /**
   * A callback that SuperAuth executes when a user attempts to sign in.
   *
   * SuperAuth provides the email address from the sign-in form as the callback parameter.
   * Use this to query your database and return the user details you want stored in the user session.
   *
   * You **must** include the `hashedPassword` in the returned object. SuperAuth uses
   * the `hashedPassword` to verify the credentials during sign-in but automatically excludes it from the
   * user session.
   *
   * @param params - An object containing the `email` property.
   * @param params.email - The email address provided in the sign-in form.
   *
   * @returns The user object if found (must include `hashedPassword`), or `null` if not found.
   */
  onSignIn(params: {
    email: string;
  }): Promise<(UserSession & { hashedPassword: string }) | null>;

  onPasswordReset: {
    /**
     * A callback that SuperAuth executes to verify the user exists before sending a password reset email.
     *
     * SuperAuth provides the email address from the forgot password form as the callback parameter.
     * Query your database to check if the user exists.
     *
     * @param params - An object containing the `email` property.
     * @param params.email - The email address provided in the forgot password form.
     *
     * @returns An object with `exists: true` (including the current `passwordHash`) if found,
     * or `exists: false` otherwise.
     */
    checkUserExists(params: {
      email: string;
    }): Promise<{ exists: false } | { exists: true; passwordHash: string }>;
    /**
     * A callback that SuperAuth executes to send the password reset link.
     *
     * SuperAuth provides the user's email address and the password reset URL as callback
     * parameters. Use your email service to send the password reset link to the user.
     *
     * @param params - An object containing `email` and `url` properties.
     * @param params.email - The email address to send the password reset link to.
     * @param params.url - The password reset URL the user should click.
     */
    sendPasswordResetEmail(params: {
      email: string;
      url: string;
    }): Promise<void>;
    /**
     * A callback that SuperAuth executes to update the user's password in your database.
     *
     * SuperAuth provides the user's email address and the new hashed password as callback
     * parameters. Update the password in your database for this user's credential account.
     *
     * @param params - An object containing `email` and `hashedPassword` properties.
     * @param params.email - The email address of the user.
     * @param params.hashedPassword - The new hashed password (hashed by SuperAuth).
     */
    updatePassword(params: {
      email: string;
      hashedPassword: string;
    }): Promise<void>;
    /**
     * A callback that SuperAuth executes after a password has been successfully reset.
     *
     * SuperAuth provides the user's email address as the callback parameter. Use your
     * email service to send a confirmation that their password was changed.
     *
     * @param params - An object containing the `email` property.
     * @param params.email - The user's email address.
     */
    sendPasswordUpdateEmail(params: { email: string }): Promise<void>;
    redirects: {
      /**
       * The URL SuperAuth should redirect the user to after they submit a "Forgot Password" request.
       *
       * This page should instruct the user to check their inbox for a password reset link.
       */
      checkEmail: `/${string}`;
      /**
       * The URL of your password reset form.
       *
       * SuperAuth redirects the user here after validating the token from the password reset link.
       */
      resetForm: `/${string}`;
      /**
       * The URL SuperAuth should redirect the user to after their password has been successfully updated.
       *
       * This page should inform the user that their password was successfully reset
       * and prompt them to sign in using their new password.
       */
      resetPasswordSuccess: `/${string}`;
      /**
       * The URL SuperAuth should redirect the user to if it fails to verify the password reset token.
       *
       * SuperAuth will append an `error` query parameter to this URL describing the
       * reason for the error.
       */
      resetPasswordError: `/${string}`;
    };
  };
}
