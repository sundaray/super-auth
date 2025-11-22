import { SignJWT } from 'jose';
import { Buffer } from 'node:buffer';
import { ResultAsync } from 'neverthrow';
import type { PasswordResetToken } from './types';
import { EMAIL_VERIFICATION_TOKEN_EXPIRES_IN } from '../constants';
import { GeneratePasswordResetTokenError } from './errors';

export function generatePasswordResetToken(params: {
  payload: Record<string, unknown>;
  secret: string;
  expiresIn?: number;
}): ResultAsync<PasswordResetToken, GeneratePasswordResetTokenError> {
  return ResultAsync.fromPromise(
    (async () => {
      const {
        payload,
        secret,
        expiresIn = EMAIL_VERIFICATION_TOKEN_EXPIRES_IN,
      } = params;

      // Decode the base64 secret to get the raw bytes
      const secretKey = Buffer.from(secret, 'base64');

      // Create a signed JWT
      const token = await new SignJWT(payload)
        .setProtectedHeader({
          alg: 'HS256',
        })
        .setIssuedAt()
        .setExpirationTime(`${expiresIn}s`)
        .sign(secretKey);

      return token as PasswordResetToken;
    })(),
    (error) => new GeneratePasswordResetTokenError({ cause: error }),
  );
}
