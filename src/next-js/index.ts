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
  }) => Promise<{ success: boolean }>;
  signOut: () => Promise<void>;
  getUserSession: () => Promise<UserSessionPayload | null>;
  handlers: {
    google: (request: Request) => Promise<void>;
    verifyEmail: (request: Request) => Promise<void>;
  };
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

          if ('authorizationUrl' in result) {
            nextRedirect(result.authorizationUrl as string);
          }

          return result;
        }) as AuthInstance['signIn'],

        signUp: async (data) => {
          return unwrap(authHelpers.signUp(data));
        },

        signOut: async () => {
          const { redirectTo } = await unwrap(authHelpers.signOut(undefined));
          nextRedirect(redirectTo);
        },

        getUserSession: async () => {
          return unwrap(authHelpers.getUserSession(undefined));
        },

        handlers: {
          google: async (request: Request) => {
            const { redirectTo } = await unwrap(
              authHelpers.handleOAuthCallback(request, undefined, 'google'),
            );
            nextRedirect(redirectTo);
          },

          verifyEmail: async (request: Request) => {
            const { redirectTo } = await unwrap(
              authHelpers.handleVerifyEmail(request),
            );

            nextRedirect(redirectTo);
          },
        },

        extendUserSessionMiddleware,
      };

      return authInstance;
    };

    instance = lazyInit(init);
  }

  return instance();
}
