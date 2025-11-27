import { describe, test, expect, vi, beforeEach } from 'vitest';
import { okAsync, errAsync } from 'neverthrow';
import { SessionService } from './session-service';
import type { AuthConfig } from '../../types';
import type {
  SessionStorage,
  UserSessionPayload,
  UserSessionJWE,
} from '../session/types';
import { SuperAuthError, UnknownError } from '../errors';
import {
  EncryptUserSessionPayloadError,
  DecryptUserSessionError,
} from '../session/errors';

// ============================================
// MOCK DEPENDENCIES
// ============================================
vi.mock('../session', () => ({
  encryptUserSessionPayload: vi.fn(),
  decryptUserSession: vi.fn(),
  createUserSessionPayload: vi.fn(),
}));

import {
  createUserSessionPayload,
  decryptUserSession,
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

  const mockUserSessionPayload: UserSessionPayload = {
    email: 'test@example.com',
    name: 'Test User',
    maxAge: 3600,
    provider: 'google',
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
  describe('createSession', async () => {
    const mockUserSessionpayload = {
      email: 'test@example.com',
      name: 'Test User',
    };

    test('should create a user session JWE on success', async () => {
      const mockUserSessionJWE = 'user-session-jwe' as UserSessionJWE;

      vi.mocked(createUserSessionPayload).mockReturnValue(
        okAsync(mockUserSessionPayload),
      );
      vi.mocked(encryptUserSessionPayload).mockReturnValue(
        okAsync(mockUserSessionJWE),
      );

      const result = await sessionService.createSession(
        mockUserSessionPayload,
        'google',
      );

      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()).toBe(mockUserSessionJWE);

      expect(createUserSessionPayload).toHaveBeenCalledWith({
        authConfig: mockConfig,
        providerName: 'google',
        userClaims: mockUserSessionPayload,
      });

      expect(encryptUserSessionPayload).toHaveBeenCalledWith({
        userSessionPayload: mockUserSessionPayload,
        secret: mockConfig.session.secret,
        maxAge: mockConfig.session.maxAge,
      });
    });
  });

  // ============================================
  // getSession()
  // ============================================
  describe('getSession', async () => {
    test('should return decrypted user session payload when when user session exists', async () => {
      const mockSessionJWE = 'mock-session-jwe';
      vi.mocked(mockSessionStorage.getSession).mockReturnValue(
        okAsync(mockSessionJWE),
      );
      vi.mocked(decryptUserSession).mockReturnValue(
        okAsync(mockUserSessionPayload),
      );
      const result = await sessionService.getSession(undefined);

      if (result.isErr()) {
        console.log('Get session error: ', result.error);
      }

      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()).toEqual(mockUserSessionPayload);
      expect(decryptUserSession).toHaveBeenCalledWith({
        session: mockSessionJWE,
        secret: mockConfig.session.secret,
      });
    });

    test('should return null when no session exists', async () => {
      vi.mocked(mockSessionStorage.getSession).mockReturnValue(okAsync(null));

      const result = await sessionService.getSession(undefined);

      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()).toBeNull();
      expect(decryptUserSession).not.toHaveBeenCalled();
    });
  });

  // ============================================
  // deleteSession()
  // ============================================
  describe('deleteSession', async () => {
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
