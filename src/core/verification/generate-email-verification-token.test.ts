import { describe, test, expect, expectTypeOf } from 'vitest';
import { decodeProtectedHeader } from 'jose';
import { generateEmailVerificationToken } from './generate-email-verification-token';
import type { EmailVerificationToken, EmailVerificationPayload } from './types';

describe('generateEmailVerificationToken', () => {
  const validSecret = Buffer.from('this-is-a-32-byte-secret-key-!!').toString(
    'base64',
  );

  const mockPayload: EmailVerificationPayload = {
    email: 'test@example.com',
    hashedPassword: 'hashed-password',
    userId: 123,
  };

  test('Should generate a valid JWT string', async () => {
    const result = await generateEmailVerificationToken({
      payload: mockPayload,
      secret: validSecret,
    });

    expect(result.isOk()).toBe(true);

    const token = result._unsafeUnwrap();
    expect(typeof token).toBe('string');
    expectTypeOf(token).toEqualTypeOf<EmailVerificationToken>();
    expect(token.split('.')).toHaveLength(3);
  });

  test('should use correct algorithm in header', async () => {
    const result = await generateEmailVerificationToken({
      payload: mockPayload,
      secret: validSecret,
    });

    const token = result._unsafeUnwrap();
    const header = decodeProtectedHeader(token);
    expect(header.alg).toBe('HS256');
  });

  test('should return error if secret is invalid (e.g. empty)', async () => {
    const result = await generateEmailVerificationToken({
      payload: mockPayload,
      secret: '',
    });

    expect(result.isErr()).toBe(true);
    const error = result._unsafeUnwrapErr();

    expect(error.name).toBe('GenerateEmailVerificationTokenError');
  });

  test('should handle custom expiration time', async () => {
    const result = await generateEmailVerificationToken({
      payload: mockPayload,
      secret: validSecret,
      expiresIn: 60, // 1 minute
    });

    expect(result.isOk()).toBe(true);
  });
});
