import { describe, test, expect } from 'vitest';
import { createUserSessionPayload } from './';
import type { User } from './types';

describe('createUserSessionPayload', () => {
  test('should create a UserSessionPayload with user and provider', async () => {
    const mockUser: User = {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
    };

    const result = await createUserSessionPayload({
      user: mockUser,
      provider: 'google',
    });

    expect(result.isOk()).toBe(true);
    const payload = result._unsafeUnwrap();

    expect(payload.user).toEqual(mockUser);
    expect(payload.provider).toBe('google');
  });
});
