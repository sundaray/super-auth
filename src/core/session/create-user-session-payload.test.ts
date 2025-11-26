import { describe, test, expect } from 'vitest';
import { createUserSessionPayload } from './';
import type { AuthConfig } from '../../types';

describe('createUserSessionPayload', () => {
  const mockConfig: AuthConfig = {
    baseUrl: 'http://localhost:3000',
    session: {
      secret: 'test-secert',
      maxAge: 3600, // 1 hour
    },
    providers: [],
  };

  test('should merge user cliams with providerName and maxAge', async () => {
    const userClaims = {
      email: 'test@example.com',
      name: 'Test User',
      customField: 123,
    };

    const result = await createUserSessionPayload({
      authConfig: mockConfig,
      providerName: 'google',
      userClaims,
    });

    expect(result.isOk()).toBe(true);
    const payload = result._unsafeUnwrap();

    expect(payload.email).toBe('test@example.com');
    expect(payload.name).toBe('Test User');
    expect(payload.customField).toBe(123);
    expect(payload.provider).toBe('google');
    expect(payload.maxAge).toBe(3600);
  });
});
