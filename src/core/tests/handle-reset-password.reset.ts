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

describe('handleResetPassword', () => {
  let authHelpers: ReturnType<typeof createAuthHelpers<TestContext>>;

  const mockUserSessionStorage = createMockSessionStorage<undefined>();
  const mockOAuthStateStorage = createMockSessionStorage<undefined>();
  const mockOAuthProvider = createMockOAuthProvider();
  const mockCredentialProvider = createMockCredentialProvider();

  const validToken = 'valid-reset-token-jwt';
  const newPassword = 'newSecurePassword123!';

  beforeEach(() => {
    vi.resetAllMocks();
    authHelpers = createAuthHelpers(
      mockConfig,
      mockUserSessionStorage,
      mockOAuthStateStorage,
      [mockOAuthProvider, mockCredentialProvider],
    );
  });

  test('should return redirectTo on successful password reset', async () => {
    const expectedRedirect = '/sign-in';

    mockProviderRegistry.getCredentialProvider.mockReturnValue(
      ok(mockCredentialProvider),
    );
    mockCredentialService.resetPassword.mockReturnValue(
      okAsync({ redirectTo: expectedRedirect }),
    );

    const result = await authHelpers.handleResetPassword(
      validToken,
      newPassword,
    );

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toEqual({ redirectTo: expectedRedirect });
  });

  test('should call credentialService.resetPassword with provider, token, and newPassword', async () => {
    mockProviderRegistry.getCredentialProvider.mockReturnValue(
      okAsync(mockCredentialProvider),
    );
    mockCredentialService.resetPassword.mockReturnValue(
      ok({ redirectTo: '/sign-in' }),
    );

    await authHelpers.handleResetPassword(validToken, newPassword);

    expect(mockCredentialService.resetPassword).toHaveBeenCalledWith(
      mockCredentialProvider,
      validToken,
      { newPassword },
    );
  });

  test('should pass through SuperAuthError from getCredentialProvider', async () => {
    const getCredentialProviderError = new SuperAuthError({
      message: 'No credential provider configured',
    });

    mockProviderRegistry.getCredentialProvider.mockReturnValue(
      err(getCredentialProviderError),
    );

    const result = await authHelpers.handleResetPassword(
      validToken,
      newPassword,
    );

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBe(getCredentialProviderError);
  });

  test('should pass through SuperAuthError from credentialService.resetPassword', async () => {
    const resetPasswordError = new SuperAuthError({
      message: 'Failed to reset password',
    });

    mockProviderRegistry.getCredentialProvider.mockReturnValue(
      ok(mockCredentialProvider),
    );
    mockCredentialService.resetPassword.mockReturnValue(
      errAsync(resetPasswordError),
    );

    const result = await authHelpers.handleResetPassword(
      validToken,
      newPassword,
    );

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBe(resetPasswordError);
  });

  test('should wrap unknown error from getCredentialProvider in UnknownError', async () => {
    const unknownError = new Error('Unknown error');

    mockProviderRegistry.getCredentialProvider.mockReturnValue(
      err(unknownError),
    );

    const result = await authHelpers.handleResetPassword(
      validToken,
      newPassword,
    );

    expect(result.isErr()).toBe(true);

    const error = result._unsafeUnwrapErr();
    expect(error).toBeInstanceOf(UnknownError);
    expect(error.cause).toBe(unknownError);
  });

  test('should wrap unknown error from credentialService.resetPassword in UnknownError', async () => {
    const unknownError = new Error('Unknown error');

    mockProviderRegistry.getCredentialProvider.mockReturnValue(
      ok(mockCredentialProvider),
    );
    mockCredentialService.resetPassword.mockReturnValue(errAsync(unknownError));

    const result = await authHelpers.handleResetPassword(
      validToken,
      newPassword,
    );

    expect(result.isErr()).toBe(true);

    const error = result._unsafeUnwrapErr();
    expect(error).toBeInstanceOf(UnknownError);
    expect(error.cause).toBe(unknownError);
  });
});
