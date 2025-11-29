import { jwtVerify } from 'jose';
import { ResultAsync } from 'neverthrow';
import { Buffer } from 'node:buffer';
import { VerifyPasswordResetTokenError } from './errors';

interface PasswordResetTokenPayload {
  email: string;
  passwordHash: string;
}

export function verifyPasswordResetToken(
  token: string,
  secret: string,
): ResultAsync<PasswordResetTokenPayload, VerifyPasswordResetTokenError> {
  return ResultAsync.fromPromise(
    (async () => {
      const secretKey = Buffer.from(secret, 'base64');

      const { payload } = await jwtVerify<PasswordResetTokenPayload>(
        token,
        secretKey,
      );

      return payload;
    })(),
    (error) => new VerifyPasswordResetTokenError({ cause: error }),
  );
}
