import { ok, err, Result, ResultAsync, safeTry } from 'neverthrow';
import type { CredentialProvider as CredentialProviderType } from '../types';
import { hashPassword } from '../../core/password/hash';
import { verifyPassword } from '../../core/password/verify';
import {
  generateEmailVerificationToken,
  verifyEmailVerificationToken,
  buildEmailVerificationUrl,
} from '../../core/verification';
import {
  AccountAlreadyExistsError,
  AccountNotFoundError,
  InvalidCredentialsError,
} from './errors';

import { SuperAuthError, UnknownError, CallbackError } from '../../core/errors';

import type { UserSession } from '../../core/session/types';
import type { CredentialProviderConfig } from './types';
import {
  generatePasswordResetToken,
  buildPasswordResetUrl,
  verifyPasswordResetToken,
  InvalidPasswordResetTokenError,
  PasswordResetTokenAlreadyUsedError,
} from '../../core/password';

export class CredentialProvider implements CredentialProviderType {
  id = 'credential' as const;
  type = 'credential' as const;
  config: CredentialProviderConfig;

  constructor(config: CredentialProviderConfig) {
    this.config = config;
  }

  // --------------------------------------------
  // Sign Up
  // --------------------------------------------
  signUp(
    data: {
      email: string;
      password: string;
      [key: string]: unknown;
    },
    secret: string,
    baseUrl: string,
  ): ResultAsync<{ email: string }, SuperAuthError> {
    const config = this.config;

    return safeTry(async function* () {
      const { email, password, ...additionalFields } = data;

      // Execute user's checkUserExists callback
      const userExists = yield* ResultAsync.fromPromise(
        config.onSignUp.checkUserExists(email),
        (error) =>
          new CallbackError({ callback: 'checkUserExists', cause: error }),
      );

      if (userExists) {
        return err(new AccountAlreadyExistsError());
      }

      // Hash password
      const hashedPassword = yield* hashPassword(password);

      // Generate token
      const token = yield* generateEmailVerificationToken({
        secret,
        payload: {
          email,
          hashedPassword,
          ...additionalFields,
        },
      });

      // Build email verification URL
      const url = yield* buildEmailVerificationUrl(
        baseUrl,
        token,
        '/api/auth/verify-email',
      );

      // Call user's sendVerificationEmail callback
      yield* ResultAsync.fromPromise(
        config.onSignUp.sendVerificationEmail({
          email,
          url,
        }),
        (error) =>
          new CallbackError({
            callback: 'sendVerificationEmail',
            cause: error,
          }),
      );

      return ok({ email });
    }).mapErr((error) => {
      if (error instanceof SuperAuthError) {
        return error;
      }
      return new UnknownError({
        context: 'credential-provider.signUp',
        cause: error,
      });
    });
  }
  // --------------------------------------------
  // Sign In
  // --------------------------------------------
  signIn(data: {
    email: string;
    password: string;
  }): ResultAsync<UserSession, SuperAuthError> {
    const config = this.config;
    return safeTry(async function* () {
      const { email, password } = data;

      // Execure user's onSignIn callback
      const user = yield* ResultAsync.fromPromise(
        config.onSignIn({ email }),
        (error) =>
          new CallbackError({
            callback: 'onSignIn',
            cause: error,
          }),
      );

      // User not found
      if (!user) {
        return err(new AccountNotFoundError());
      }

      // Verify password
      const isPasswordValid = yield* verifyPassword(
        password,
        user.hashedPassword,
      );

      if (!isPasswordValid) {
        return err(new InvalidCredentialsError());
      }

      return ok(user);
    }).mapErr((error) => {
      if (error instanceof SuperAuthError) {
        return error;
      }
      return new UnknownError({
        context: 'credential-provider.signIn',
        cause: error,
      });
    });
  }

  verifyEmail(
    token: string,
    secret: string,
  ): ResultAsync<UserSession, SuperAuthError> {
    const config = this.config;
    return safeTry(async function* () {
      //// Decrypt token to get email + hashedPassword + additionalFields
      const tokenPayload = yield* verifyEmailVerificationToken(token, secret);

      const { email, hashedPassword, ...additionalFields } = tokenPayload;

      // Call user's createUser callback
      const user = yield* ResultAsync.fromPromise(
        config.onSignUp.createUser({
          email,
          hashedPassword,
          ...additionalFields,
        }),
        (error) =>
          new CallbackError({
            callback: 'createUser',
            cause: error,
          }),
      );
      return ok(user);
    }).mapErr((error) => {
      if (error instanceof SuperAuthError) {
        return error;
      }
      return new UnknownError({
        context: 'credential-provider.signIn',
        cause: error,
      });
    });
  }

  // --------------------------------------------
  // Forgot Password
  // --------------------------------------------
  forgotPassword(
    data: { email: string },
    secret: string,
    baseUrl: string,
  ): ResultAsync<{ redirectTo: `/${string}` }, SuperAuthError> {
    const config = this.config;

    return safeTry(async function* () {
      const { email } = data;

      // Call user's checkUserExists callback
      const result = yield* ResultAsync.fromPromise(
        config.onPasswordReset.checkUserExists({ email }),
        (error) =>
          new CallbackError({ callback: 'checkUserExists', cause: error }),
      );

      // If user does not exist or no credential account, silently succeed
      if (!result.exists) {
        return ok({ redirectTo: config.onPasswordReset.redirects.checkEmail });
      }

      // User exists with credential account - we have password hash
      const { passwordHash } = result;

      // Generate password reset token with email + password hash
      const token = yield* generatePasswordResetToken({
        secret,
        payload: { email, passwordHash },
      });

      // Build password reset URL using user's configured path
      const url = yield* buildPasswordResetUrl(
        baseUrl,
        token,
        config.onPasswordReset.verifyPasswordResetTokenPath,
      );

      // Call user's sendPasswordResetEmail callback
      yield* ResultAsync.fromPromise(
        config.onPasswordReset.sendPasswordResetEmail({ email, url }),
        (error) =>
          new CallbackError({
            callback: 'sendPasswordResetEmail',
            cause: error,
          }),
      );

      return ok({ redirectTo: config.onPasswordReset.redirects.checkEmail });
    }).mapErr((error) => {
      if (error instanceof SuperAuthError) {
        return error;
      }
      return new UnknownError({
        context: 'credential-provider.forgotPassword',
        cause: error,
      });
    });
  }

  // --------------------------------------------
  // Verify Password Reset Token
  // --------------------------------------------
  verifyPasswordResetToken(
    request: Request,
    secret: string,
  ): ResultAsync<{ email: string; passwordHash: string }, SuperAuthError> {
    const config = this.config;

    return safeTry(async function* () {
      // Parse token from the request URL
      const tokenResult = Result.fromThrowable(() =>
        new URL(request.url).searchParams.get('token'),
      )();

      if (tokenResult.isErr() || !tokenResult.value) {
        return err(new InvalidPasswordResetTokenError());
      }

      const token = tokenResult.value;

      // Decrypt and verify token - get email + passwordHash from payload
      const tokenPayload = yield* verifyPasswordResetToken(token, secret);

      const { email, passwordHash: tokenPasswordHash } = tokenPayload;

      // Call user's checkUserExists to get current passwordHash from DB
      const result = yield* ResultAsync.fromPromise(
        config.onPasswordReset.checkUserExists({ email }),
        (error) =>
          new CallbackError({ callback: 'checkUserExists', cause: error }),
      );

      const { passwordHash: dbPasswordHash } = result;

      // Compare token's passwprdHash with DB's passwordHash
      // If they don't match, password was already chnaged -> token invalid

      if (tokenPasswordHash != dbPasswordHash) {
        return err(new PasswordResetTokenAlreadyUsedError());
      }

      // Token is valid
      return ok({
        email,
        passwordHash: dbPasswordHash,
        redirectTo: config.onPasswordReset.redirects.checkEmail,
      });
    }).mapErr((error) => {
      if (error instanceof SuperAuthError) {
        return error;
      }
      return new UnknownError({
        context: 'credential-provider.verifyPasswordResetToken',
        cause: error,
      });
    });
  }

  // Reset Password
  // --------------------------------------------
  resetPassword(
    token: string,
    data: { newPassword: string },
    secret: string,
  ): ResultAsync<{ redirectTo: `/${string}` }, SuperAuthError> {
    const config = this.config;

    return safeTry(async function* () {
      const { newPassword } = data;

      // Decrypt and verify token directly
      const tokenPayload = yield* verifyPasswordResetToken(token, secret);
      const { email, passwordHash: tokenPasswordHash } = tokenPayload;

      // Call user's checkUserExists to get current passwordHash from DB
      const result = yield* ResultAsync.fromPromise(
        config.onPasswordReset.checkUserExists({ email }),
        (error) =>
          new CallbackError({ callback: 'checkUserExists', cause: error }),
      );

      const { passwordHash: currentPasswordHash } = result;

      // Compare token's passwordHash with current passwordHash
      // If they don't match, password was already changed → token invalid
      if (tokenPasswordHash !== currentPasswordHash) {
        return err(new PasswordResetTokenAlreadyUsedError());
      }

      // Token is valid - proceed with password reset

      // Hash the new password
      const hashedPassword = yield* hashPassword(newPassword);

      // Call user's updatePassword callback
      yield* ResultAsync.fromPromise(
        config.onPasswordReset.updatePassword({ email, hashedPassword }),
        (error) =>
          new CallbackError({
            callback: 'updatePassword',
            cause: error,
          }),
      );

      // Call user's sendPasswordChangeEmail callback
      yield* ResultAsync.fromPromise(
        config.onPasswordReset.sendPasswordChangeEmail({ email }),
        (error) =>
          new CallbackError({
            callback: 'sendPasswordChangeEmail',
            cause: error,
          }),
      );

      return ok({
        redirectTo: config.onPasswordReset.redirects.resetPasswordSuccess,
      });
    }).mapErr((error) => {
      if (error instanceof SuperAuthError) {
        return error;
      }
      return new UnknownError({
        context: 'credential-provider.resetPassword',
        cause: error,
      });
    });
  }
}
