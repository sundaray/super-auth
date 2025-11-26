import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { verifyPasswordResetToken } from './verify-password-reset-token';
import { generatePasswordResetToken } from './generate-password-reset-token';
import { VerifyPasswordResetTokenError } from './errors';

describe('verifyPasswordResetToken', () => {
  // 32-byte key encoded as base64
  const validSecret = Buffer.from('this-is-a-32-byte-secret-key-!!').toString(
    'base64',
  );

  const mockPayload = {
    email: 'test@example.com',
    passwordHash: 'hashed-password-value',
  };

  // Helper to create a valid token for testing
  async function createToken(expiresIn = 1800) {
    const result = await generatePasswordResetToken({
      payload: mockPayload,
      secret: validSecret,
      expiresIn,
    });

    if (result.isErr()) {
      throw result.error;
    }

    return result.value;
  }

  test('should verify a valid token and return payload', async () => {
    const token = await createToken();

    const result = await verifyPasswordResetToken(token, validSecret);

    expect(result.isOk()).toBe(true);

    const payload = result._unsafeUnwrap();
    expect(payload.email).toBe(mockPayload.email);
    expect(payload.passwordHash).toBe(mockPayload.passwordHash);
  });

  test('should return payload with correct types', async () => {
    const token = await createToken();

    const result = await verifyPasswordResetToken(token, validSecret);

    expect(result.isOk()).toBe(true);

    const payload = result._unsafeUnwrap();
    expect(typeof payload.email).toBe('string');
    expect(typeof payload.passwordHash).toBe('string');
  });

  // ============================================
  // ERROR PATHS
  // ============================================

  test('should return error for malformed token string', async () => {
    const result = await verifyPasswordResetToken(
      'not.a.valid.jwt',
      validSecret,
    );

    expect(result.isErr()).toBe(true);

    const error = result._unsafeUnwrapErr();
    expect(error).toBeInstanceOf(VerifyPasswordResetTokenError);
    expect(error.name).toBe('VerifyPasswordResetTokenError');
  });

  test('should return error for empty secret', async () => {
    const token = await createToken();

    const result = await verifyPasswordResetToken(token, '');

    expect(result.isErr()).toBe(true);

    const error = result._unsafeUnwrapErr();
    expect(error).toBeInstanceOf(VerifyPasswordResetTokenError);
  });

  // ============================================
  // TOKEN EXPIRATION TESTS
  // ============================================

  describe('token expiration', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    test('should accept token before expiration', async () => {
      const now = new Date('2025-01-01T10:00:00Z');
      vi.setSystemTime(now);

      // Token expires in 30 minutes (1800s)
      const token = await createToken(1800);

      // Advance 29 minutes (still valid)
      vi.advanceTimersByTime(29 * 60 * 1000);

      const result = await verifyPasswordResetToken(token, validSecret);

      expect(result.isOk()).toBe(true);
    });

    test('should reject token after expiration', async () => {
      const now = new Date('2025-01-01T10:00:00Z');
      vi.setSystemTime(now);

      // Token expires in 30 minutes (1800s)
      const token = await createToken(1800);

      // Advance 30 minutes + 1 second (expired)
      vi.advanceTimersByTime(30 * 60 * 1000 + 1000);

      const result = await verifyPasswordResetToken(token, validSecret);

      expect(result.isErr()).toBe(true);

      const error = result._unsafeUnwrapErr();
      expect(error).toBeInstanceOf(VerifyPasswordResetTokenError);
    });
  });
});
