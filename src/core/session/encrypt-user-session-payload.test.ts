import { describe, test, expect } from 'vitest';
import { encryptUserSessionPayload } from '.';
import type { UserSessionPayload } from '.';

describe('encryptUserSessionPayload', () => {
  // 32-byte base64 key
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

  test('should generate a valid JWE string', async () => {
    const result = await encryptUserSessionPayload({
      payload: mockPayload,
      secret: validSecret,
      maxAge: 3600,
    });

    if (result.isErr()) {
      console.log(result.error);
    }

    expect(result.isOk()).toBe(true);

    const jwe = result._unsafeUnwrap();
    expect(typeof jwe).toBe('string');
  });

  test('should generate error for invalid secret length', async () => {
    const shortSecret = Buffer.from('short').toString('base64');

    const result = await encryptUserSessionPayload({
      payload: mockPayload,
      secret: shortSecret,
      maxAge: 3600,
    });

    expect(result.isErr()).toBe(true);

    const error = result._unsafeUnwrapErr();

    expect(error.name).toBe('EncryptUserSessionPayloadError');
  });
});
