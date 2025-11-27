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

describe('signout', () => {
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

  test('should return redirectTo "/" on successful sign out', async () => {
    mockSessionService.deleteSession.mockReturnValue(okAsync(undefined));

    const result = await authHelpers.signOut(testContext);

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toEqual({ redirectTo: '/' });
  });

  test('should pass through SuperAuthError from sessionService.deleteSession', async () => {
    const deleteError = new SuperAuthError({
      message: 'Failed to delete session',
    });

    mockSessionService.deleteSession.mockReturnValue(errAsync(deleteError));

    const result = await authHelpers.signOut(testContext);

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBe(deleteError);
  });

  test('should wrap unknown error from sessionService.deleteSession in UnknownError', async () => {
    const unknownError = new Error('Cookie deletion failed');

    mockSessionService.deleteSession.mockReturnValue(errAsync(unknownError));

    const result = await authHelpers.signOut(testContext);

    expect(result.isErr()).toBe(true);

    const error = result._unsafeUnwrapErr();
    expect(error).toBeInstanceOf(UnknownError);
    expect(error.cause).toBe(unknownError);
  });
});
