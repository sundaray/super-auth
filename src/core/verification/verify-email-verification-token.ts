import { jwtVerify } from 'jose';
import { ResultAsync } from 'neverthrow';
import { Buffer } from 'node:buffer';
import { VerifyEmailVerificationTokenError } from './errors.js';
import type { EmailVerificationPayload } from './types.js';

export function verifyEmailVerificationToken(
  token: string,
  secret: string,
): ResultAsync<EmailVerificationPayload, VerifyEmailVerificationTokenError> {
  return ResultAsync.fromPromise(
    (async () => {
      const secretKey = Buffer.from(secret, 'base64');

      const { payload } = await jwtVerify<EmailVerificationPayload>(
        token,
        secretKey,
      );

      return payload;
    })(),
    (error) => new VerifyEmailVerificationTokenError({ cause: error }),
  );
}
