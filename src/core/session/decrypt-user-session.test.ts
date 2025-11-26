import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { encryptUserSessionPayload } from './';
import { decryptUserSession } from './';
import type { UserSessionPayload } from './';

describe('decryptUserSession', () => {
  const validSecret = Buffer.from('this-is-a-32-byte-secret-key-!!!').toString(
    'base64',
  );

  const mockPayload: UserSessionPayload = {
    email: 'test@example.com',
    name: 'Test User',
    maxAge: 3600,
    provider: 'google',
  };

  // Helper to create a valid JWE for testing decryption
  const createJWE = async (
    payload: UserSessionPayload = mockPayload,
    age = 3600,
  ) => {
    const result = await encryptUserSessionPayload({
      userSessionPayload: payload,
      secret: validSecret,
      maxAge: age,
    });
    if (result.isErr()) throw result.error;
    return result.value;
  };

  describe('Standard Decryption', () => {
    test('should decrypt a valid JWE and return payload', async () => {
      const jwe = await createJWE();

      const result = await decryptUserSession({
        session: jwe,
        secret: validSecret,
      });

      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()).toEqual(
        expect.objectContaining({
          email: 'test@example.com',
          provider: 'google',
          name: 'Test User',
          maxAge: 3600,
        }),
      );
    });

    test('should return error for malformed string', async () => {
      const result = await decryptUserSession({
        session: 'not.a.real.jwe',
        secret: validSecret,
      });

      expect(result.isErr()).toBe(true);

      const error = result._unsafeUnwrapErr();

      expect(error.name).toBe('DecryptUserSessionError');
    });

    test('should return error if secret does not match', async () => {
      const jwe = await createJWE();
      const wrongSecret = Buffer.from(
        'wrong-32-byte-secret-key-!!!!!',
      ).toString('base64');

      const result = await decryptUserSession({
        session: jwe,
        secret: wrongSecret,
      });

      expect(result.isErr()).toBe(true);

      const error = result._unsafeUnwrapErr();

      expect(error.name).toBe('DecryptUserSessionError');
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
      const now = new Date('2025-01-01T10:00:00Z');
      vi.setSystemTime(now);

      // Create token valid for 1 hour
      const jwe = await createJWE(mockPayload, 3600);

      // Advance 30 minutes
      vi.advanceTimersByTime(30 * 60 * 1000);

      const result = await decryptUserSession({
        session: jwe,
        secret: validSecret,
      });

      expect(result.isOk()).toBe(true);
    });

    test('should reject token after expiration', async () => {
      const now = new Date('2024-01-01T10:00:00Z');
      vi.setSystemTime(now);

      // Create token valid for 1 hour
      const jwe = await createJWE(mockPayload, 3600);

      // Advance 1 hour + 1 second
      vi.advanceTimersByTime(3600 * 1000 + 1000);

      const result = await decryptUserSession({
        session: jwe,
        secret: validSecret,
      });

      expect(result.isErr()).toBe(true);

      const error = result._unsafeUnwrapErr();

      expect(error.name).toBe('DecryptUserSessionError');
    });
  });
});
