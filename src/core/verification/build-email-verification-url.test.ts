import { describe, test, expect } from 'vitest';
import { buildEmailVerificationUrl } from './build-email-verification-url';

describe('buildEmailVerificationUrl', () => {
  const validBaseUrl = 'https://myapp.com';
  const validToken = 'valid-token-string';
  test('should build a valid URL', async () => {
    const result = await buildEmailVerificationUrl(validBaseUrl, validToken);

    expect(result.isOk()).toBe(true);
    const urlString = result._unsafeUnwrap();
    const url = new URL(urlString);

    expect(url.origin).toBe(validBaseUrl);
    expect(url.pathname).toBe('/api/auth/verify-email');
    expect(url.searchParams.get('token')).toBe(validToken);
  });
});
