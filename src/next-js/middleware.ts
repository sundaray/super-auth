import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { decryptUserSession, encryptUserSessionPayload } from '../core/session';
import type { AuthConfig } from '../types';
import { COOKIE_NAMES } from '../core/constants';

export function createExtendUserSessionMiddleware(config: AuthConfig) {
  return async function extendUserSessionMiddleware(request: NextRequest) {
    const refreshThreshold = config.session.maxAge / 2;
    const response = NextResponse.next();

    // Let POST/PUT/DELETE requests pass through unchanged.
    if (request.method !== 'GET') {
      return response;
    }

    const userSessionCookie = request.cookies.get(COOKIE_NAMES.USER_SESSION);

    if (!userSessionCookie) {
      return response;
    }

    // Decrypt the session to check expiration
    const decryptResult = await decryptUserSession({
      session: userSessionCookie.value,
      secret: config.session.secret,
    });

    if (decryptResult.isErr()) {
      return response;
    }

    const sessionPayload = decryptResult.value;

    const exp = (sessionPayload as unknown as { exp?: number }).exp;

    if (exp) {
      const now = Math.floor(Date.now() / 1000);
      const timeRemaining = exp - now;

      if (timeRemaining > refreshThreshold) {
        return response;
      }
    }

    // Session needs refresh - re-encrypt with new expiry
    const encryptResult = await encryptUserSessionPayload({
      userSessionPayload: sessionPayload,
      secret: config.session.secret,
      maxAge: config.session.maxAge,
    });

    if (encryptResult.isOk()) {
      response.cookies.set(COOKIE_NAMES.USER_SESSION, encryptResult.value, {
        maxAge: config.session.maxAge,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
      });
    }

    return response;
  };
}
