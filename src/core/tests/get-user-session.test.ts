import { describe, test, expect, vi, beforeEach } from 'vitest';
import { okAsync, errAsync } from 'neverthrow';
import { createAuthHelpers } from '../auth';
import {
  mockConfig,
  testContext,
  type TestContext,
  createMockOAuthProvider,
  createMockCredentialProvider,
  createMockProviderRegistry,
  createMockOAuthService,
  createMockCredentialService,
  createMockSessionService,
  createMockSessionStorage,
  mockUserSessionPayload,
} from './setup';
import { SuperAuthError, UnknownError } from '../errors';

// ============================================
// MOCK SERVICE MODULES
// ============================================
const mockProviderRegistry = createMockProviderRegistry();
const mockOAuthService = createMockOAuthService();
const mockCredentialService = createMockCredentialService();
const mockSessionService = createMockSessionService();

vi.mock('../services', () => ({
  ProviderRegistry: vi.fn(function () {
    return mockProviderRegistry;
  }),
  OAuthService: vi.fn(function () {
    return mockOAuthService;
  }),
  CredentialService: vi.fn(function () {
    return mockCredentialService;
  }),
  SessionService: vi.fn(function () {
    return mockSessionService;
  }),
}));

describe('handleResetPassword', () => {
  let authHelpers: ReturnType<typeof createAuthHelpers<TestContext>>;

  const mockUserSessionStorage = createMockSessionStorage<undefined>();
  const mockOAuthStateStorage = createMockSessionStorage<undefined>();
  const mockOAuthProvider = createMockOAuthProvider();
  const mockCredentialProvider = createMockCredentialProvider();

  beforeEach(() => {
    vi.resetAllMocks();
    authHelpers = createAuthHelpers(
      mockConfig,
      mockUserSessionStorage,
      mockOAuthStateStorage,
      [mockOAuthProvider, mockCredentialProvider],
    );
  });

  test('should return UserSessionPayload when session exists', async () => {
    mockSessionService.getSession.mockReturnValue(
      okAsync(mockUserSessionPayload),
    );

    const result = await authHelpers.getUserSession(testContext);

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toEqual(mockUserSessionPayload);
  });

  test('should return null when no session exists', async () => {
    mockSessionService.getSession.mockReturnValue(okAsync(null));

    const result = await authHelpers.getUserSession(testContext);

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toBeNull();
  });

  test('should pass through SuperAuthError from sessionService.getSession', async () => {
    const sessionError = new SuperAuthError({
      message: 'Failed to decrypt session',
    });

    mockSessionService.getSession.mockReturnValue(errAsync(sessionError));

    const result = await authHelpers.getUserSession(testContext);

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBe(sessionError);
  });

  test('should wrap unknown error from sessionService.getSession in UnknownError', async () => {
    const unknownError = new Error('Unknown error');

    mockSessionService.getSession.mockReturnValue(errAsync(unknownError));

    const result = await authHelpers.getUserSession(testContext);

    expect(result.isErr()).toBe(true);

    const error = result._unsafeUnwrapErr();
    expect(error).toBeInstanceOf(UnknownError);
    expect(error.cause).toBe(unknownError);
  });
});
