import { describe, test, expect, vi, beforeEach } from 'vitest';
import { ok, err, okAsync, errAsync } from 'neverthrow';
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

describe('forgotPassword', () => {
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

  test('should return redirectTo on successful forgot password request', async () => {
    const expectedRedirect = '/check-email';

    mockProviderRegistry.getCredentialProvider.mockReturnValue(
      ok(mockCredentialProvider),
    );

    mockCredentialService.forgotPassword.mockReturnValue(
      okAsync({ redirectTo: expectedRedirect }),
    );

    const result = await authHelpers.forgotPassword('test@example.com');

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toEqual({ redirectTo: expectedRedirect });
  });

  test('should call credentialService.forgotPassword with provider and email', async () => {
    const email = 'test@example.com';

    mockProviderRegistry.getCredentialProvider.mockReturnValue(
      ok(mockCredentialProvider),
    );
    mockCredentialService.forgotPassword.mockReturnValue(
      okAsync({ redirectTo: '/check-email' }),
    );
    await authHelpers.forgotPassword(email);
    expect(mockCredentialService.forgotPassword).toHaveBeenCalledWith(
      mockCredentialProvider,
      { email },
    );
  });

  test('should pass through SuperAuthError from getCredentialProvider', async () => {
    const getCredentialProviderError = new SuperAuthError({
      message: 'No credential provider configured',
    });

    mockProviderRegistry.getCredentialProvider.mockReturnValue(
      err(getCredentialProviderError),
    );

    const result = await authHelpers.forgotPassword('test@example.com');

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBe(getCredentialProviderError);
  });

  test('should pass through SuperAuthError from credentialService.forgotPassword', async () => {
    const forgotPasswordError = new SuperAuthError({
      message: 'No user found with this email',
    });

    mockProviderRegistry.getCredentialProvider.mockReturnValue(
      ok(mockCredentialProvider),
    );
    mockCredentialService.forgotPassword.mockReturnValue(
      errAsync(forgotPasswordError),
    );

    const result = await authHelpers.forgotPassword('unknown@example.com');

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBe(forgotPasswordError);
  });

  test('should wrap unknown error from getCredentialProvider in UnknownError', async () => {
    const unknownError = new Error('Unknown error');

    mockProviderRegistry.getCredentialProvider.mockReturnValue(
      err(unknownError),
    );

    const result = await authHelpers.forgotPassword('test@example.com');

    expect(result.isErr()).toBe(true);

    const error = result._unsafeUnwrapErr();
    expect(error).toBeInstanceOf(UnknownError);
    expect(error.cause).toBe(unknownError);
  });

  test('should wrap unknown error from credentialService.forgotPassword in UnknownError', async () => {
    const unknownError = new Error('Unknown error');

    mockProviderRegistry.getCredentialProvider.mockReturnValue(
      ok(mockCredentialProvider),
    );
    mockCredentialService.forgotPassword.mockReturnValue(
      errAsync(unknownError),
    );

    const result = await authHelpers.forgotPassword('test@example.com');

    expect(result.isErr()).toBe(true);

    const error = result._unsafeUnwrapErr();
    expect(error).toBeInstanceOf(UnknownError);
    expect(error.cause).toBe(unknownError);
  });
});
