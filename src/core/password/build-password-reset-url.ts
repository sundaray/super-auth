import { Result } from 'neverthrow';
import type { PasswordResetUrl } from './types.js';
import { BuildPasswordResetUrlError } from './errors.js';

export function buildPasswordResetUrl(
  baseUrl: string,
  token: string,
  path: `/${string}` = '/api/auth/verify-email',
): Result<PasswordResetUrl, BuildPasswordResetUrlError> {
  return Result.fromThrowable(
    () => {
      const url = new URL(`${baseUrl}${path}`);
      url.searchParams.set('token', token);
      return url.toString() as PasswordResetUrl;
    },
    (error) => new BuildPasswordResetUrlError({ cause: error }),
  )();
}
