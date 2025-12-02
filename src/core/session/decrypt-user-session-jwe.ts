import { jwtDecrypt } from 'jose';
import { ResultAsync } from 'neverthrow';
import { DecryptUserSessionError } from './errors';
import type { User, UserSession, UserSessionJWE } from '.';
import type { AuthProviderId } from '../../providers/types';
import { Buffer } from 'node:buffer';

export interface DecryptUserSessionParams {
  JWE: UserSessionJWE;
  secret: string;
}

export function decryptUserSessionJWE(
  params: DecryptUserSessionParams,
): ResultAsync<UserSession, DecryptUserSessionError> {
  const { JWE, secret } = params;

  // Decode the base64 secret to get the raw bytes
  const secretKey = Buffer.from(secret, 'base64');

  return ResultAsync.fromPromise(
    (async () => {
      const { payload } = await jwtDecrypt(JWE, secretKey);
      const { exp, user, provider } = payload as {
        exp: number;
        iat: number;
        user: User;
        provider: AuthProviderId;
      };
      return {
        user,
        provider,
        expiresAt: new Date(exp * 1000).toISOString(),
      };
    })(),
    (error) => new DecryptUserSessionError({ cause: error }),
  );
}
