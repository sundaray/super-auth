import { describe, test, expect } from 'vitest';
import { verifyPassword } from './verify';
import { hashPassword } from './hash';

describe('verifyPassword', { timeout: 30000 }, () => {
  test('should return true when the password matches the hash', async () => {
    const password = 'my-secret-password';

    const hashresult = await hashPassword(password);
    const validHash = hashresult._unsafeUnwrap();

    const result = await verifyPassword(password, validHash);

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toBe(true);
  });

  test('should return false when password does not match the hash', async () => {
    const password = 'my-secret-password';

    const hashResult = await hashPassword(password);
    const validHash = hashResult._unsafeUnwrap();

    const result = await verifyPassword('my-wrong-password', validHash);

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toBe(false);
  });

  test('Should return an error if the hash format is invalid', async () => {
    const result = await verifyPassword('password', 'invalid-hash-string');

    // Expect the result to be an Error
    expect(result.isErr()).toBe(true);

    // Unwrap the error value
    const error = result._unsafeUnwrapErr();

    // Check that we got the specific error we defined in our code
    expect(error.name).toBe('InvalidPasswordHashFormatError');
  });
});
