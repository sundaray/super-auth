import { describe, test, expect } from 'vitest';
import { encryptOAuthStatePayload } from './';
import type { OAuthStatePayload } from './';

describe('encryptOAuthStatePayload', () => {
  // 32-byte base64 key
  const validSecret = Buffer.from('this-is-a-32-byte-secret-key-!!!').toString(
    'base64',
  );

  const mockState: OAuthStatePayload = {
    state: 'random-csrf-state',
    codeVerifier: 'pkce-verifier-string',
    redirectTo: '/dashboard',
    provider: 'google',
  };

  test('should generate a valid JWE string structure', async () => {
    const result = await encryptOAuthStatePayload({
      oauthState: mockState,
      secret: validSecret,
      maxAge: 600,
    });

    expect(result.isOk()).toBe(true);

    const jwe = result._unsafeUnwrap();
    expect(typeof jwe).toBe('string');
  });

  test('should return error for invalid secret length', async () => {
    const shortSecret = Buffer.from('short').toString('base64');

    const result = await encryptOAuthStatePayload({
      oauthState: mockState,
      secret: shortSecret,
      maxAge: 600,
    });

    expect(result.isErr()).toBe(true);

    const error = result._unsafeUnwrapErr();
    expect(error.name).toBe('EncryptOAuthStatePayloadError');
  });
});
