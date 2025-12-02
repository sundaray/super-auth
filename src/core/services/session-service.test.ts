import { describe, test, expect, vi, beforeEach } from 'vitest';
import { okAsync, errAsync } from 'neverthrow';
import { SessionService } from './session-service';
import type { AuthConfig } from '../../types';
import type {
  SessionStorage,
  UserSessionPayload,
  UserSession,
  UserSessionJWE,
} from '../session/types';
import type { User } from '../session';

// ============================================
// MOCK DEPENDENCIES
// ============================================
vi.mock('../session', () => ({
  encryptUserSessionPayload: vi.fn(),
  decryptUserSessionJWE: vi.fn(), // Fixed: was decryptUserSession
  createUserSessionPayload: vi.fn(),
}));

import {
  createUserSessionPayload,
  decryptUserSessionJWE,
  encryptUserSessionPayload,
} from '../session';

describe('SessionService', () => {
  // ============================================
  // TEST FIXTURES
  // ============================================

  const mockConfig: AuthConfig = {
    baseUrl: 'https://myapp.com',
    session: {
      secret: 'test-secret-key',
      maxAge: 3600,
    },
    providers: [],
  };

  const mockUser: User = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
  };

  const mockUserSessionPayload: UserSessionPayload = {
    user: mockUser,
    provider: 'google',
  };

  const mockUserSession: UserSession = {
    user: mockUser,
    provider: 'google',
    expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
  };

  function createMockSessionStorage() {
    return {
      getSession: vi.fn(),
      saveSession: vi.fn(),
      deleteSession: vi.fn(),
    };
  }

  let sessionService: SessionService<undefined>;
  let mockSessionStorage: SessionStorage<undefined>;

  beforeEach(() => {
    vi.resetAllMocks();
    mockSessionStorage = createMockSessionStorage();
    sessionService = new SessionService(mockConfig, mockSessionStorage);
  });

  // ============================================
  // createSession()
  // ============================================
  describe('createSession', () => {
    test('should create a user session JWE on success', async () => {
      const mockUserSessionJWE = 'user-session-jwe' as UserSessionJWE;

      vi.mocked(createUserSessionPayload).mockReturnValue(
        okAsync(mockUserSessionPayload),
      );
      vi.mocked(encryptUserSessionPayload).mockReturnValue(
        okAsync(mockUserSessionJWE),
      );

      const result = await sessionService.createSession(mockUser, 'google');

      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()).toBe(mockUserSessionJWE);

      expect(createUserSessionPayload).toHaveBeenCalledWith({
        user: mockUser,
        provider: 'google',
      });

      expect(encryptUserSessionPayload).toHaveBeenCalledWith({
        payload: mockUserSessionPayload,
        secret: mockConfig.session.secret,
        maxAge: mockConfig.session.maxAge,
      });
    });
  });

  // ============================================
  // getSession()
  // ============================================
  describe('getSession', () => {
    test('should return decrypted user session when session exists', async () => {
      const mockSessionJWE = 'mock-session-jwe';
      vi.mocked(mockSessionStorage.getSession).mockReturnValue(
        okAsync(mockSessionJWE),
      );
      vi.mocked(decryptUserSessionJWE).mockReturnValue(
        okAsync(mockUserSession),
      );

      const result = await sessionService.getSession(undefined);

      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()).toEqual(mockUserSession);
      expect(decryptUserSessionJWE).toHaveBeenCalledWith({
        JWE: mockSessionJWE,
        secret: mockConfig.session.secret,
      });
    });

    test('should return null when no session exists', async () => {
      vi.mocked(mockSessionStorage.getSession).mockReturnValue(okAsync(null));

      const result = await sessionService.getSession(undefined);

      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()).toBeNull();
      expect(decryptUserSessionJWE).not.toHaveBeenCalled();
    });
  });

  // ============================================
  // deleteSession()
  // ============================================
  describe('deleteSession', () => {
    test('should delete session successfully', async () => {
      vi.mocked(mockSessionStorage.deleteSession).mockReturnValue(
        okAsync(undefined),
      );

      const result = await sessionService.deleteSession(undefined);

      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()).toBeUndefined();
      expect(mockSessionStorage.deleteSession).toHaveBeenCalledWith(undefined);
    });
  });
});
