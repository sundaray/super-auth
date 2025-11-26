import { describe, test, expect } from 'vitest';
import { hashPassword } from './hash';

describe('hashPassword', { timeout: 30000 }, () => {
  test('should create a hashed password from a plain text password', async () => {
    const password = 'my-secret-password';

    // Run the function
    const result = await hashPassword(password);

    // Assert it didn't return an error
    expect(result.isOk()).toBe(true);

    // Unwrap the value to check the format
    const hash = result._unsafeUnwrap();

    expect(hash).toBeTypeOf('string');
    expect(hash).toContain('$scrypt$');
  });

  test('should generate unique hashes for the same password', async () => {
    const password = 'my-secret-passwprd';

    // Run it twice
    const result1 = await hashPassword(password);
    const result2 = await hashPassword(password);

    const hash1 = result1._unsafeUnwrap();
    const hash2 = result2._unsafeUnwrap();

    expect(hash1).not.toEqual(hash2);
  });
});
