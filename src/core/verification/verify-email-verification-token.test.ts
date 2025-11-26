import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { generateEmailVerificationToken } from './generate-email-verification-token';
import { verifyEmailVerificationToken } from './verify-email-verification-token';

describe('verifyEmailVerificationToken', () => {
  const validSecret = Buffer.from('this-is-a-32-byte-secret-key-!!').toString(
    'base64',
  );

  const mockPayload = {
    email: 'test@gmail.com',
    hashedPassword: 'hashed-password',
    customField: 'custom-value',
  };

  const createToken = async (expiresIn = 1800) => {
    const result = await generateEmailVerificationToken({
      payload: mockPayload,
      secret: validSecret,
      expiresIn,
    });

    if (result.isErr()) throw result.error;
    return result.value;
  };

  describe('Standard Verification', () => {
    test('should verify a valid token and return payload', async () => {
      const token = await createToken();

      const result = await verifyEmailVerificationToken(token, validSecret);

      expect(result.isOk()).toBe(true);

      const payload = result._unsafeUnwrap();

      expect(payload.email).toBe(mockPayload.email);
      expect(payload.hashedPassword).toBe(mockPayload.hashedPassword);
      expect(payload.customField).toBe(mockPayload.customField);
    });

    test('should return error for malformed token string', async () => {
      const result = await verifyEmailVerificationToken(
        'not. a. jwt.',
        validSecret,
      );

      expect(result.isErr()).toBe(true);
      const error = result._unsafeUnwrapErr();

      expect(error.name).toBe('VerifyEmailVerificationTokenError');
    });
  });

  describe('Token expiration', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    test('should accept token before verification', async () => {
      const now = new Date('2024-01-01T10:00:00Z');
      vi.setSystemTime(now);

      // Token expires in 30 minutes (1800s)
      const token = await createToken(1800);

      // Advance 29 minutes
      vi.advanceTimersByTime(29 * 60 * 1000);

      const result = await verifyEmailVerificationToken(token, validSecret);

      expect(result.isOk()).toBe(true);
    });

    test('should reject token after expiration', async () => {
      const now = new Date('2024-01-01T10:00:00Z');
      vi.setSystemTime(now);

      // Token expires in 30 minutes
      const token = await createToken(1800);

      // Advance 30 minutes + 1 second
      vi.advanceTimersByTime(30 * 60 * 1000 + 1000);

      const result = await verifyEmailVerificationToken(token, validSecret);

      const error = result._unsafeUnwrapErr();

      expect(error.name).toBe('VerifyEmailVerificationTokenError');
    });
  });
});
