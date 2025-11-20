import { decodeJwt } from 'jose';
import { Result } from 'neverthrow';
import type { GoogleUserClaims } from './types.js';
import { DecodeGoogleIdTokenError } from './errors.js';

export function decodeGoogleIdToken(
  idToken: string,
): Result<GoogleUserClaims, DecodeGoogleIdTokenError> {
  return Result.fromThrowable(
    () => decodeJwt(idToken),
    (error): DecodeGoogleIdTokenError =>
      new DecodeGoogleIdTokenError({
        cause: error,
      }),
  )();
}
