import { createAuthHelpers } from '../core/auth.js';
import { NextJsSessionStorage } from './session-storage.js';
import { createExtendUserSessionMiddleware } from './middleware.js';
import type { AuthConfig } from '../types/index.js';
import { lazyInit } from '../core/utils/lazy-init.js';
import { redirect as nextRedirect } from 'next/navigation';
import { COOKIE_NAMES, OAUTH_STATE_MAX_AGE } from '../core/constants.js';
import type { ResultAsync } from 'neverthrow';
import type { SuperAuthError } from '../core/errors.js';
import type { UserSessionPayload } from '../core/session/types.js';
import type {
  CredentialSignInOptions,
  CredentialSignInResult,
} from './types.js';

async function unwrap<T>(
  resultAsync: ResultAsync<T, SuperAuthError>,
): Promise<T> {
  const result = await resultAsync;
  if (result.isErr()) {
    throw result.error;
  }
  return result.value;
}

interface AuthInstance {
  signIn(
    providerId: 'google',
    options: { redirectTo: `/${string}` },
  ): Promise<{
    authorizationUrl: string;
  }>;

  signIn(
    providerId: 'credential',
    options: CredentialSignInOptions,
  ): Promise<CredentialSignInResult>;
  signUp: (data: {
    email: string;
    password: string;
    [key: string]: unknown;
  }) => Promise<void>;
  signOut: () => Promise<void>;
  getUserSession: () => Promise<UserSessionPayload | null>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, newPassword: string) => Promise<void>;
  handler: (request: Request) => Promise<void>;
  extendUserSessionMiddleware: ReturnType<
    typeof createExtendUserSessionMiddleware
  >;
}

let instance: (() => AuthInstance) | null = null;

export function superAuth(config: AuthConfig) {
  if (!instance) {
    const init = () => {
      // Create user session storage
      const userSessionStorage = new NextJsSessionStorage(
        COOKIE_NAMES.USER_SESSION,
        {
          maxAge: config.session.maxAge,
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
        },
      );

      // Create OAuth state storage
      const oauthStateStorage = new NextJsSessionStorage(
        COOKIE_NAMES.OAUTH_STATE,
        {
          maxAge: OAUTH_STATE_MAX_AGE,
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
        },
      );

      const { providers } = config;

      // Create auth helpers
      const authHelpers = createAuthHelpers<undefined>(
        config,
        userSessionStorage,
        oauthStateStorage,
        providers,
      );

      const extendUserSessionMiddleware =
        createExtendUserSessionMiddleware(config);

      // Wrap auth helpers for Next.js
      const authInstance: AuthInstance = {
        signIn: (async (providerId, options) => {
          const result = await unwrap(
            authHelpers.signIn(providerId, undefined, options),
          );

          // Google sign-in
          if ('authorizationUrl' in result) {
            nextRedirect(result.authorizationUrl as string);
          }

          // Credential sign-in
          if ('redirectTo' in result) {
            nextRedirect(result.redirectTo);
          }

          return result;
        }) as AuthInstance['signIn'],

        signUp: async (data) => {
          const { redirectTo } = await unwrap(authHelpers.signUp(data));
          nextRedirect(redirectTo);
        },

        signOut: async () => {
          const { redirectTo } = await unwrap(authHelpers.signOut(undefined));
          nextRedirect(redirectTo);
        },

        getUserSession: async () => {
          return unwrap(authHelpers.getUserSession(undefined));
        },

        forgotPassword: async (email: string) => {
          const { redirectTo } = await unwrap(
            authHelpers.forgotPassword(email),
          );
          nextRedirect(redirectTo);
        },

        resetPassword: async (token: string, newPassword: string) => {
          const { redirectTo } = await unwrap(
            authHelpers.handleResetPassword(token, newPassword),
          );
          nextRedirect(redirectTo);
        },
        handler: async (request: Request) => {
          const url = new URL(request.url);
          const pathname = url.pathname;

          // Extract route after /api/auth/
          // Examples:
          //   /api/auth/verify-email → verify-email
          //   /api/auth/callback/google → callback/google
          //   /api/auth/verify-password-reset-token → verify-password-reset-token
          const route = pathname
            .replace(/^\/api\/auth\//, '')
            .replace(/\/$/, '');

          // ----------------
          // Email Verification
          // ----------------
          if (route === 'verify-email') {
            const { redirectTo } = await unwrap(
              authHelpers.handleVerifyEmail(request),
            );

            nextRedirect(redirectTo);
            return;
          }

          // ---------------------------------
          // Password Reset Token Verification
          // ---------------------------------
          if (route === 'verify-password-reset-token') {
            const { redirectTo } = await unwrap(
              authHelpers.handleVerifyPasswordResetToken(request),
            );
            nextRedirect(redirectTo);
            return;
          }

          // ----------------
          // OAuth Callbacks
          // ----------------
          if (route.startsWith('callback/')) {
            const providerId = route.replace('callback/', '') as 'google';
            const { redirectTo } = await unwrap(
              authHelpers.handleOAuthCallback(request, undefined, providerId),
            );

            nextRedirect(redirectTo);
            return;
          }
        },
        extendUserSessionMiddleware,
      };

      return authInstance;
    };

    instance = lazyInit(init);
  }

  return instance();
}
