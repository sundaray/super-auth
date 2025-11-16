import { Result } from 'neverthrow';
import { BuildEmailVerificationUrlError } from './errors';

export function buildEmailVerificationUrl(
  baseUrl: string,
  token: string,
  path: `/${string}` = '/api/auth/verify-email',
): Result<string, BuildEmailVerificationUrlError> {
  return Result.fromThrowable(
    () => {
      const url = new URL(`${baseUrl}${path}`);
      url.searchParams.set('token', token);
      return url.toString();
    },
    (error) => new BuildEmailVerificationUrlError({ cause: error }),
  )();
}
