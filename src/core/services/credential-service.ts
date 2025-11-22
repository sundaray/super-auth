import type { AuthConfig } from '../../types';
import type { CredentialProvider } from '../../providers/types';
import { Result, ResultAsync } from 'neverthrow';
import { SuperAuthError, UnknownError } from '../errors';

export class CredentialService {
  constructor(private config: AuthConfig) {}

  // --------------------------------------------
  // Sign up with credentials
  // --------------------------------------------
  signUp(
    provider: CredentialProvider,
    data: { email: string; password: string; [key: string]: unknown },
  ): ResultAsync<{ success: boolean }, SuperAuthError> {
    const config = this.config;
    return provider
      .signUp(data, config.session.secret, config.baseUrl)
      .map(() => {
        return { success: true };
      })
      .mapErr((error) => {
        if (error instanceof SuperAuthError) {
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
  ): ResultAsync<
    { sessionData: Record<string, unknown>; redirectTo: `/${string}` },
    SuperAuthError
  > {
    return provider
      .signIn(data)
      .map((user) => {
        const { hashedPassword, ...sessionData } = user;
        return {
          sessionData,
          redirectTo: '/' as const,
        };
      })
      .mapErr((error) => {
        if (error instanceof SuperAuthError) {
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
  ): ResultAsync<
    { success: boolean; redirectTo: `/${string}` },
    SuperAuthError
  > {
    const config = this.config;

    return ResultAsync.fromPromise(
      (async () => {
        // Try to parse the token
        const tokenResult = Result.fromThrowable(() =>
          new URL(request.url).searchParams.get('token'),
        )();

        // Handle Parse Error
        if (tokenResult.isErr()) {
          return { success: false, redirectTo: errorUrl };
        }

        const token = tokenResult.value;

        // Handle Missing Token
        if (!token) {
          return { success: false, redirectTo: errorUrl };
        }

        // Try to verify the token
        const verificationResult = await provider.verifyEmail(
          token,
          config.session.secret,
        );

        // Handle Verification Error (e.g., expired, invalid)
        if (verificationResult.isErr()) {
          return { success: false, redirectTo: errorUrl };
        }

        // Handle Success
        return { success: true, redirectTo: successUrl };
      })(),
      (error) => {
        if (error instanceof SuperAuthError) {
          return error;
        }
        return new UnknownError({
          context: 'credential-service.signIn',
          cause: error,
        });
      },
    );
  }

  // --------------------------------------------
  // Forgot Password
  // --------------------------------------------
  forgotPassword(
    provider: CredentialProvider,
    data: { email: string },
  ): ResultAsync<{ redirectTo: `/${string}` }, SuperAuthError> {
    const config = this.config;

    return provider
      .forgotPassword(data, config.session.secret, config.baseUrl)
      .mapErr((error) => {
        if (error instanceof SuperAuthError) {
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
    SuperAuthError
  > {
    const config = this.config;
    return provider
      .verifyPasswordResetToken(request, config.session.secret)
      .mapErr((error) => {
        if (error instanceof SuperAuthError) {
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
  ): ResultAsync<{ redirectTo: `/${string}` }, SuperAuthError> {
    return provider
      .resetPassword(token, data, this.config.session.secret)
      .mapErr((error) => {
        if (error instanceof SuperAuthError) {
          return error;
        }
        return new UnknownError({
          context: 'credential-service.resetPassword',
          cause: error,
        });
      });
  }
}
