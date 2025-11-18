import { SignJWT } from 'jose';
import { Buffer } from 'node:buffer';
import { ResultAsync } from 'neverthrow';
import type { EmailVerificationToken } from './types';
import { EMAIL_VERIFICATION_TOKEN_EXPIRES_IN } from '../constants';
import { GenerateEmailVerificationTokenError } from './errors';

export function generateEmailVerificationToken(params: {
  email: string;
  secret: string;
  expiresIn?: number;
}): ResultAsync<EmailVerificationToken, GenerateEmailVerificationTokenError> {
  return ResultAsync.fromPromise(
    (async () => {
      const {
        email,
        secret,
        expiresIn = EMAIL_VERIFICATION_TOKEN_EXPIRES_IN,
      } = params;

      // Decode the base64 secret to get the raw bytes
      const secretKey = Buffer.from(secret, 'base64');

      // Create a signed JWT
      const token = await new SignJWT({ email })
        .setProtectedHeader({
          alg: 'HS256',
        })
        .setIssuedAt()
        .setExpirationTime(`${expiresIn}s`)
        .sign(secretKey);

      return token as EmailVerificationToken;
    })(),
    (error) => new GenerateEmailVerificationTokenError({ cause: error }),
  );
}
