import { ok, err, ResultAsync, safeTry } from 'neverthrow';
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
}
