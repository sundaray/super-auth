import { describe, test, expect } from 'vitest';
import { decodeProtectedHeader } from 'jose';
import { generatePasswordResetToken } from './generate-password-reset-token';
import { GeneratePasswordResetTokenError } from './errors';

describe('generatePasswordResetToken', () => {
  // 32-byte key encoded as base64
  const validSecret = Buffer.from('this-is-a-32-byte-secret-key-!!!').toString(
    'base64',
  );

  const mockPayload = {
    email: 'test@example.com',
    passwordHash: 'hashed-password-value',
  };

  test('should generate a valid JWT string', async () => {
    const result = await generatePasswordResetToken({
      payload: mockPayload,
      secret: validSecret,
    });

    expect(result.isOk()).toBe(true);

    const token = result._unsafeUnwrap();

    // JWT has 3 parts separated by dots
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3);
  });

  test('should use HS256 algorithm in header', async () => {
    const result = await generatePasswordResetToken({
      payload: mockPayload,
      secret: validSecret,
    });

    const token = result._unsafeUnwrap();
    const header = decodeProtectedHeader(token);

    expect(header.alg).toBe('HS256');
  });

  test('should return error for empty secret', async () => {
    const result = await generatePasswordResetToken({
      payload: mockPayload,
      secret: '',
    });

    expect(result.isErr()).toBe(true);

    const error = result._unsafeUnwrapErr();
    expect(error).toBeInstanceOf(GeneratePasswordResetTokenError);
    expect(error.name).toBe('GeneratePasswordResetTokenError');
  });
});
