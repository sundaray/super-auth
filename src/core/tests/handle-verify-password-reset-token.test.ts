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

describe('handleVerifyPasswordResetToken', () => {
  let authHelpers: ReturnType<typeof createAuthHelpers<TestContext>>;

  const mockUserSessionStorage = createMockSessionStorage<undefined>();
  const mockOAuthStateStorage = createMockSessionStorage<undefined>();
  const mockOAuthProvider = createMockOAuthProvider();
  const mockCredentialProvider = createMockCredentialProvider();

  const mockRequest = new Request(
    'https://myapp.com/api/auth/verify-password-reset-token?token=reset-token-123',
  );

  beforeEach(() => {
    vi.resetAllMocks();
    authHelpers = createAuthHelpers(
      mockConfig,
      mockUserSessionStorage,
      mockOAuthStateStorage,
      [mockOAuthProvider, mockCredentialProvider],
    );
  });

  test('should return email, passwordHash, and redirectTo on successful verification', async () => {
    const expectedResult = {
      email: 'test@example.com',
      passwordHash: 'hashed-password-value',
      redirectTo: '/reset-password',
    };

    mockProviderRegistry.getCredentialProvider.mockReturnValue(
      ok(mockCredentialProvider),
    );
    mockCredentialService.verifyPasswordResetToken.mockReturnValue(
      okAsync(expectedResult),
    );

    const result =
      await authHelpers.handleVerifyPasswordResetToken(mockRequest);

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toEqual(expectedResult);
  });

  test('should call credentialService.verifyPasswordResetToken with request and provider', async () => {
    mockProviderRegistry.getCredentialProvider.mockReturnValue(
      ok(mockCredentialProvider),
    );
    mockCredentialService.verifyPasswordResetToken.mockReturnValue(
      okAsync({
        email: 'test@example.com',
        passwordHash: 'hash',
        redirectTo: '/reset-password' as const,
      }),
    );

    await authHelpers.handleVerifyPasswordResetToken(mockRequest);

    expect(mockCredentialService.verifyPasswordResetToken).toHaveBeenCalledWith(
      mockRequest,
      mockCredentialProvider,
    );
  });
  test('should pass through SuperAuthError from getCredentialProvider', async () => {
    const providerError = new SuperAuthError({
      message: 'No credential provider configured',
    });

    mockProviderRegistry.getCredentialProvider.mockReturnValue(
      err(providerError),
    );

    const result =
      await authHelpers.handleVerifyPasswordResetToken(mockRequest);

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBe(providerError);
  });

  test('should pass through SuperAuthError from credentialService.verifyPasswordResetToken', async () => {
    const tokenError = new SuperAuthError({
      message: 'Password reset token is invalid',
    });

    mockProviderRegistry.getCredentialProvider.mockReturnValue(
      ok(mockCredentialProvider),
    );
    mockCredentialService.verifyPasswordResetToken.mockReturnValue(
      errAsync(tokenError),
    );

    const result =
      await authHelpers.handleVerifyPasswordResetToken(mockRequest);

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBe(tokenError);
  });

  test('should wrap unknown error from getCredentialProvider in UnknownError', async () => {
    const unknownError = new Error('Unknown error');

    mockProviderRegistry.getCredentialProvider.mockReturnValue(
      err(unknownError),
    );

    const result =
      await authHelpers.handleVerifyPasswordResetToken(mockRequest);

    expect(result.isErr()).toBe(true);

    const error = result._unsafeUnwrapErr();
    expect(error).toBeInstanceOf(UnknownError);
    expect(error.cause).toBe(unknownError);
  });

  test('should wrap unknown error from credentialService.verifyPasswordResetToken in UnknownError', async () => {
    const unknownError = new Error('Unknown error');

    mockProviderRegistry.getCredentialProvider.mockReturnValue(
      ok(mockCredentialProvider),
    );
    mockCredentialService.verifyPasswordResetToken.mockReturnValue(
      errAsync(unknownError),
    );

    const result =
      await authHelpers.handleVerifyPasswordResetToken(mockRequest);

    expect(result.isErr()).toBe(true);

    const error = result._unsafeUnwrapErr();
    expect(error).toBeInstanceOf(UnknownError);
    expect(error.cause).toBe(unknownError);
  });
});
