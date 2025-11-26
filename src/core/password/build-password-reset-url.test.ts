import { describe, test, expect } from 'vitest';
import { buildPasswordResetUrl } from './build-password-reset-url';
import { AUTH_ROUTES } from '../constants';
import { BuildPasswordResetUrlError } from './errors';

describe('buildPasswordResetUrl', () => {
  const validBaseUrl = 'https://myapp.com';
  const validToken = 'valid-token-string';

  test('should build a valid URL with default path', () => {
    const result = buildPasswordResetUrl(validBaseUrl, validToken);

    expect(result.isOk()).toBe(true);

    const urlString = result._unsafeUnwrap();
    const url = new URL(urlString);

    expect(url.origin).toBe(validBaseUrl);
    expect(url.pathname).toBe(AUTH_ROUTES.VERIFY_PASSWORD_RESET_TOKEN);
    expect(url.searchParams.get('token')).toBe(validToken);
  });

  test('should return BuildPasswordResetUrlError for invalid baseUrl', () => {
    const invalidBaseUrl = 'not-a-valid-url';

    const result = buildPasswordResetUrl(invalidBaseUrl, validToken);

    expect(result.isErr()).toBe(true);

    const error = result._unsafeUnwrapErr();
    expect(error).toBeInstanceOf(BuildPasswordResetUrlError);
    expect(error.name).toBe('BuildPasswordResetUrlError');
  });

  test('should return BuildPasswordResetUrlError for empty baseUrl', () => {
    const result = buildPasswordResetUrl('', validToken);

    expect(result.isErr()).toBe(true);

    const error = result._unsafeUnwrapErr();
    expect(error).toBeInstanceOf(BuildPasswordResetUrlError);
  });
});
