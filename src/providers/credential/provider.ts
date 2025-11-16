import { ok, err, ResultAsync, safeTry } from 'neverthrow';
import type { CredentialProvider as CredentialProviderType } from '../types';
import { hashPassword } from '../../core/password/hash';
import { verifyPassword } from '../../core/password/verify';
import { generateEmailVerificationToken } from '../../core/verification/generate-email-verification-token';
import { verifyEmailVerificationToken } from '../../core/verification/verify-email-verification-token';
import { buildEmailVerificationUrl } from '../../core/verification/build-email-verification-url';
import {
  SignUpError,
  SignInError,
  AccountNotFoundError,
  InvalidCredentialsError,
  VerifyEmailError,
} from './errors';

import type { User, CredentialProviderConfig } from './types';

export class CredentialProvider implements CredentialProviderType {
  id = 'credential' as const;
  type = 'credential' as const;
  config: CredentialProviderConfig;

  constructor(config: CredentialProviderConfig) {
    this.config = config;
  }

  signUp(
    data: {
      email: string;
      password: string;
      [key: string]: unknown;
    },
    secret: string,
    baseUrl: string,
  ): ResultAsync<User, SignUpError> {
    const config = this.config;

    return safeTry(async function* () {
      const { email, password, ...additionalFields } = data;

      // Hash password
      const hashedPassword = yield* hashPassword(password);

      // Call user's onSignUp
      const user = yield* ResultAsync.fromPromise(
        config.onSignUp({
          email,
          hashedPassword,
          ...additionalFields,
        }),
        (error) => new SignUpError({ cause: error }),
      );

      // Generate token
      const token = yield* generateEmailVerificationToken({
        email,
        secret,
      });

      // Build email verification URL
      const url = yield* buildEmailVerificationUrl(
        baseUrl,
        token,
        config.emailVerification.path,
      );

      // Call user's sendVerificationEmail callback
      yield* ResultAsync.fromPromise(
        config.emailVerification.sendVerificationEmail({
          email,
          url,
        }),
        (error) => new SignUpError({ cause: error }),
      );

      return ok(user);
    }).mapErr((error) => {
      if (error instanceof SignUpError) return error;
      return new SignUpError({ cause: error });
    });
  }

  signIn(data: {
    email: string;
    password: string;
  }): ResultAsync<
    User,
    SignInError | AccountNotFoundError | InvalidCredentialsError
  > {
    const config = this.config;
    return safeTry(async function* () {
      const { email, password } = data;

      // Execure user's onSignIn callback
      const user = yield* ResultAsync.fromPromise(
        config.onSignIn({ email }),
        (error) => new SignInError({ cause: error }),
      );
      // Clarify this
      if (!user) {
        throw new AccountNotFoundError();
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
      if (
        error instanceof SignInError ||
        error instanceof AccountNotFoundError ||
        error instanceof InvalidCredentialsError
      ) {
        return error;
      }

      return new SignInError({ cause: error });
    });
  }

  verifyEmail(
    token: string,
    secret: string,
  ): ResultAsync<User, VerifyEmailError> {
    const config = this.config;
    return safeTry(async function* () {
      const email = yield* verifyEmailVerificationToken(token, secret);
      // Call user's onEmailVerified callback
      yield* ResultAsync.fromPromise(
        config.emailVerification.onEmailVerified({ email }),
        (error) => new VerifyEmailError({ cause: error }),
      );
      return ok({ email });
    }).mapErr((error) => {
      if (error instanceof VerifyEmailError) return error;
      return new VerifyEmailError({ cause: error });
    });
  }
}
