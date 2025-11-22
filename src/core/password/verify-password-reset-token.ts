import { jwtVerify } from 'jose';
import { ResultAsync } from 'neverthrow';
import { Buffer } from 'node:buffer';
import type { PasswordResetToken } from './types.js';
import { VerifyPasswordResetTokenError } from './errors.js';

interface PasswordResetPayload {
  email: string;
}

export function verifyPasswordResetToken(
  token: string,
  secret: string,
): ResultAsync<PasswordResetToken, VerifyPasswordResetTokenError> {
  return ResultAsync.fromPromise(
    (async () => {
      const secretKey = Buffer.from(secret, 'base64');

      const { payload } = await jwtVerify<PasswordResetPayload>(
        token,
        secretKey,
      );

      return payload.email as PasswordResetToken;
    })(),
    (error) => new VerifyPasswordResetTokenError({ cause: error }),
  );
}
