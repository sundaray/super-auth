import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { encryptUserSessionPayload } from './';
import { decryptUserSessionJWE } from './';
import type { UserSessionPayload, UserSessionJWE } from './';

describe('decryptUserSession', () => {
  const validSecret = Buffer.from('this-is-a-32-byte-secret-key-!!!').toString(
    'base64',
  );

  const mockPayload: UserSessionPayload = {
    user: {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
    },
    provider: 'google',
  };

  // Helper to create a valid JWE for testing decryption
  const createJWE = async (
    payload: UserSessionPayload = mockPayload,
    age = 3600,
  ) => {
    const result = await encryptUserSessionPayload({
      payload: payload,
      secret: validSecret,
      maxAge: age,
    });
    if (result.isErr()) throw result.error;
    return result.value;
  };

  describe('Standard Decryption', () => {
    test('should decrypt a valid JWE and return payload', async () => {
      const jwe = await createJWE();

      const result = await decryptUserSessionJWE({
        JWE: jwe,
        secret: validSecret,
      });

      expect(result.isOk()).toBe(true);

      const session = result._unsafeUnwrap();

      expect(session.user.id).toBe('user-123');
      expect(session.user.email).toBe('test@example.com');
      expect(session.user.name).toBe('Test User');
      expect(session.provider).toBe('google');
      expect(session.expiresAt).toBeDefined();
    });

    test('should return error for malformed string', async () => {
      const result = await decryptUserSessionJWE({
        JWE: 'not.a.real.jwe' as UserSessionJWE,
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

      const result = await decryptUserSessionJWE({
        JWE: jwe,
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

      const result = await decryptUserSessionJWE({
        JWE: jwe,
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

      const result = await decryptUserSessionJWE({
        JWE: jwe,
        secret: validSecret,
      });

      expect(result.isErr()).toBe(true);

      const error = result._unsafeUnwrapErr();

      expect(error.name).toBe('DecryptUserSessionError');
    });
  });
});
