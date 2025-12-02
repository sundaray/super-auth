import { EncryptJWT } from 'jose';
import { ResultAsync } from 'neverthrow';
import type { UserSessionPayload } from './';
import { EncryptUserSessionPayloadError } from './errors';
import { Buffer } from 'node:buffer';
import type { UserSessionJWE } from './types';

export interface EncryptUserSessionPayloadParams {
  payload: UserSessionPayload;
  secret: string;
  maxAge: number;
}

export function encryptUserSessionPayload(
  params: EncryptUserSessionPayloadParams,
): ResultAsync<UserSessionJWE, EncryptUserSessionPayloadError> {
  return ResultAsync.fromPromise(
    (async () => {
      const { payload, secret, maxAge } = params;

      // Decode the base64 secret to get the raw bytes
      const secretKey = Buffer.from(secret, 'base64');

      const jwe = await new EncryptJWT({ ...payload })
        .setProtectedHeader({ alg: 'dir', enc: 'A128CBC-HS256' })
        .setIssuedAt()
        .setExpirationTime(`${maxAge}s`)
        .encrypt(secretKey);

      return jwe as UserSessionJWE;
    })(),
    (error) => new EncryptUserSessionPayloadError({ cause: error }),
  );
}
