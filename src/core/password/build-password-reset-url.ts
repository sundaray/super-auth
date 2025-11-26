import { Result } from 'neverthrow';
import type { PasswordResetUrl } from './types';
import { BuildPasswordResetUrlError } from './errors';
import { AUTH_ROUTES } from '../constants';

export function buildPasswordResetUrl(
  baseUrl: string,
  token: string,
  path: `/${string}` = AUTH_ROUTES.VERIFY_PASSWORD_RESET_TOKEN,
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
