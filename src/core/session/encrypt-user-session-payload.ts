import { EncryptJWT } from 'jose';
import { ResultAsync } from 'neverthrow';
import type { UserSessionPayload } from './index.js';
import { EncryptUserSessionPayloadError } from './errors.js';
import { Buffer } from 'node:buffer';
import type { UserSessionJWE } from './types.js';

export interface EncryptUserSessionPayloadParams {
  userSessionPayload: UserSessionPayload;
  secret: string;
  maxAge: number;
}

export function encryptUserSessionPayload(
  params: EncryptUserSessionPayloadParams,
): ResultAsync<UserSessionJWE, EncryptUserSessionPayloadError> {
  return ResultAsync.fromPromise(
    (async () => {
      const { userSessionPayload, secret, maxAge } = params;

      // Decode the base64 secret to get the raw bytes
      const secretKey = Buffer.from(secret, 'base64');

      const jwe = await new EncryptJWT(userSessionPayload)
        .setProtectedHeader({ alg: 'dir', enc: 'A128CBC-HS256' })
        .setIssuedAt()
        .setExpirationTime(`${maxAge}s`)
        .encrypt(secretKey);

      return jwe as UserSessionJWE;
    })(),
    (error) => new EncryptUserSessionPayloadError({ cause: error }),
  );
}
