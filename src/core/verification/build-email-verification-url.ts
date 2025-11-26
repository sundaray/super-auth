import { Result } from 'neverthrow';
import { BuildEmailVerificationUrlError } from './errors';
import { AUTH_ROUTES } from '../constants';
import type { EmailVerificationUrl } from './types';

export function buildEmailVerificationUrl(
  baseUrl: string,
  token: string,
  path: `/${string}` = AUTH_ROUTES.VERIFY_EMAIL,
): Result<EmailVerificationUrl, BuildEmailVerificationUrlError> {
  return Result.fromThrowable(
    () => {
      const url = new URL(`${baseUrl}${path}`);
      url.searchParams.set('token', token);
      return url.toString() as EmailVerificationUrl;
    },
    (error) => new BuildEmailVerificationUrlError({ cause: error }),
  )();
}
