import type { AuthConfig } from '../../types';
import type { CredentialProvider } from '../../providers/types';
import { Result, ResultAsync } from 'neverthrow';
import {
  SignUpError,
  SignInError,
  VerifyEmailError,
} from '../../providers/credential/errors';

export class CredentialService {
  constructor(private config: AuthConfig) {}

  // --------------------------------------------
  // Sign up with credentials
  // --------------------------------------------
  signUp(
    provider: CredentialProvider,
    data: { email: string; password: string; [key: string]: unknown },
  ): ResultAsync<{ success: boolean }, SignUpError> {
    const config = this.config;
    return provider
      .signUp(data, config.session.secret, config.baseUrl)
      .map(() => {
        return { success: true };
      })
      .mapErr((error) => new SignUpError({ cause: error }));
  }
  // --------------------------------------------
  // Sign in with credentials
  // --------------------------------------------
  signIn(
    provider: CredentialProvider,
    data: { email: string; password: string },
  ): ResultAsync<
    { sessionData: Record<string, unknown>; redirectTo: `/${string}` },
    SignInError
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
      .mapErr((error) => new SignInError({ cause: error }));
  }
  // --------------------------------------------
  // Verify email
  // --------------------------------------------
  verifyEmail(
    request: Request,
    provider: CredentialProvider,
  ): ResultAsync<
    { success: boolean; redirectTo: `/${string}` },
    VerifyEmailError
  > {
    const config = this.config;
    const errorUrl = provider.config.emailVerification.onError;
    const successUrl = provider.config.emailVerification.onSuccess;

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
        return new VerifyEmailError({ cause: error });
      },
    );
  }
}
