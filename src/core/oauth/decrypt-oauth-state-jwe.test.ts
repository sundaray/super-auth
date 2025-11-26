import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { encryptOAuthStatePayload } from './';
import { decryptOAuthStateJWE } from './';
import type { OAuthStatePayload } from './';

describe('decryptOAuthStateJWE', () => {
  const validSecret = Buffer.from('this-is-a-32-byte-secret-key-!!!').toString(
    'base64',
  );

  const mockState: OAuthStatePayload = {
    state: 'csrf-state-123',
    codeVerifier: 'pkce-verifier-456',
    redirectTo: '/dashboard',
    provider: 'google',
  };

  // Helper to create tokens for decryption tests
  const createJWE = async (state: OAuthStatePayload = mockState, age = 600) => {
    const result = await encryptOAuthStatePayload({
      oauthState: state,
      secret: validSecret,
      maxAge: age,
    });
    if (result.isErr()) throw result.error;
    return result.value;
  };

  describe('Validation & Security', () => {
    test('should decrypt a valid JWE and return payload', async () => {
      const jwe = await createJWE();

      const result = await decryptOAuthStateJWE({
        jwe,
        secret: validSecret,
      });

      expect(result.isOk()).toBe(true);

      const payload = result._unsafeUnwrap();
      expect(payload).toEqual(mockState);
    });

    test('should return error for malformed JWE string', async () => {
      const result = await decryptOAuthStateJWE({
        jwe: 'not-a-valid-jwe-string',
        secret: validSecret,
      });

      expect(result.isErr()).toBe(true);
      const error = result._unsafeUnwrapErr();
      expect(error.name).toBe('DecryptOAuthStateJweError');
    });

    test('should return error for wrong secret', async () => {
      const jwe = await createJWE();
      const wrongSecret = Buffer.from(
        'different-32-byte-secret-key-!!',
      ).toString('base64');

      const result = await decryptOAuthStateJWE({
        jwe,
        secret: wrongSecret,
      });

      expect(result.isErr()).toBe(true);

      const error = result._unsafeUnwrapErr();
      expect(error.name).toBe('DecryptOAuthStateJweError');
    });
  });

  // ------------------------------------------------------
  // TOKEN EXPIRATION TESTS
  // ------------------------------------------------------
  describe('Token Expiration', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    test('should accept token before expiration', async () => {
      const now = new Date('2025-01-01T12:00:00Z');
      vi.setSystemTime(now);

      // Create token valid for 10 minutes (600s)
      const jwe = await createJWE(mockState, 600);

      // Advance 5 minutes
      vi.advanceTimersByTime(5 * 60 * 1000);

      const result = await decryptOAuthStateJWE({
        jwe,
        secret: validSecret,
      });

      expect(result.isOk()).toBe(true);
    });

    test('should reject token after expiration', async () => {
      const now = new Date('2024-01-01T12:00:00Z');
      vi.setSystemTime(now);

      // Create token valid for 10 minutes (600s)
      const jwe = await createJWE(mockState, 600);

      // Advance 10 minutes + 1 second
      vi.advanceTimersByTime(600 * 1000 + 1000);

      const result = await decryptOAuthStateJWE({
        jwe,
        secret: validSecret,
      });

      expect(result.isErr()).toBe(true);

      const error = result._unsafeUnwrapErr();
      expect(error.name).toBe('DecryptOAuthStateJweError');
    });
  });
});
