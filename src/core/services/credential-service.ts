import type { AuthConfig } from '../../types';
import type { CredentialProvider } from '../../providers/types';
import { ResultAsync } from 'neverthrow';
import { LucidAuthError, UnknownError } from '../errors';
import type { User } from '../session';

export class CredentialService {
  constructor(private config: AuthConfig) {}

  // --------------------------------------------
  // Sign up with credentials
  // --------------------------------------------
  signUp(
    provider: CredentialProvider,
    data: { email: string; password: string; [key: string]: unknown },
  ): ResultAsync<{ redirectTo: `/${string}` }, LucidAuthError> {
    const config = this.config;
    return provider
      .signUp(data, config.session.secret, config.baseUrl)
      .map((result) => {
        return { redirectTo: result.redirectTo };
      })
      .mapErr((error) => {
        if (error instanceof LucidAuthError) {
          return error;
        }
        return new UnknownError({
          context: 'credential-service.signUp',
          cause: error,
        });
      });
  }
  // --------------------------------------------
  // Sign in with credentials
  // --------------------------------------------
  signIn(
    provider: CredentialProvider,
    data: { email: string; password: string },
  ): ResultAsync<{ user: User; redirectTo: `/${string}` }, LucidAuthError> {
    return provider
      .signIn(data)
      .map((user) => {
        const { hashedPassword, ...rest } = user;
        return {
          user: rest,
          redirectTo: '/' as const,
        };
      })
      .mapErr((error: LucidAuthError) => {
        if (error instanceof LucidAuthError) {
          return error;
        }
        return new UnknownError({
          context: 'credential-service.signIn',
          cause: error,
        });
      });
  }
  // --------------------------------------------
  // Verify email
  // --------------------------------------------
  verifyEmail(
    request: Request,
    provider: CredentialProvider,
  ): ResultAsync<{ redirectTo: `/${string}` }, LucidAuthError> {
    const config = this.config;

    return provider
      .verifyEmail(request, config.session.secret)
      .mapErr((error) => {
        if (error instanceof LucidAuthError) {
          return error;
        }
        return new UnknownError({
          context: 'credential-service.verifyEmail',
          cause: error,
        });
      });
  }

  // --------------------------------------------
  // Forgot Password
  // --------------------------------------------
  forgotPassword(
    provider: CredentialProvider,
    data: { email: string },
  ): ResultAsync<{ redirectTo: `/${string}` }, LucidAuthError> {
    const config = this.config;

    return provider
      .forgotPassword(data, config.session.secret, config.baseUrl)
      .mapErr((error) => {
        if (error instanceof LucidAuthError) {
          return error;
        }
        return new UnknownError({
          context: 'credential-service.forgotPassword',
          cause: error,
        });
      });
  }

  // --------------------------------------------
  // Verify Password Reset Token
  // --------------------------------------------
  verifyPasswordResetToken(
    request: Request,
    provider: CredentialProvider,
  ): ResultAsync<
    { email: string; passwordHash: string; redirectTo: `/${string}` },
    LucidAuthError
  > {
    const config = this.config;
    return provider
      .verifyPasswordResetToken(request, config.session.secret)
      .mapErr((error) => {
        if (error instanceof LucidAuthError) {
          return error;
        }
        return new UnknownError({
          context: 'credential-service.verifyPasswordResetToken',
          cause: error,
        });
      });
  }

  // --------------------------------------------
  // Reset Password
  // --------------------------------------------
  resetPassword(
    provider: CredentialProvider,
    token: string,
    data: { newPassword: string },
  ): ResultAsync<{ redirectTo: `/${string}` }, LucidAuthError> {
    return provider
      .resetPassword(token, data, this.config.session.secret)
      .mapErr((error) => {
        if (error instanceof LucidAuthError) {
          return error;
        }
        return new UnknownError({
          context: 'credential-service.resetPassword',
          cause: error,
        });
      });
  }
}
