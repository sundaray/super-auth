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

describe('handleVerifyEmail', () => {
  let authHelpers: ReturnType<typeof createAuthHelpers<TestContext>>;

  const mockUserSessionStorage = createMockSessionStorage<undefined>();
  const mockOAuthStateStorage = createMockSessionStorage<undefined>();
  const mockOAuthProvider = createMockOAuthProvider();
  const mockCredentialProvider = createMockCredentialProvider();

  const mockRequest = new Request(
    'https://myapp.com/api/auth/verify-email?token=verification-token-123',
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

  test('should return redirectTo on successful email verification', async () => {
    const expectedRedirect = '/sign-in';

    mockProviderRegistry.getCredentialProvider.mockReturnValue(
      ok(mockCredentialProvider),
    );
    mockCredentialService.verifyEmail.mockReturnValue(
      okAsync({ redirectTo: expectedRedirect }),
    );

    const result = await authHelpers.handleVerifyEmail(mockRequest);

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toEqual({ redirectTo: expectedRedirect });
  });

  test('should call credentialService.verifyEmail with request and provider', async () => {
    mockProviderRegistry.getCredentialProvider.mockReturnValue(
      ok(mockCredentialProvider),
    );
    mockCredentialService.verifyEmail.mockReturnValue(
      okAsync({ redirectTo: '/sign-in' }),
    );

    await authHelpers.handleVerifyEmail(mockRequest);

    expect(mockCredentialService.verifyEmail).toHaveBeenCalledWith(
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

    const result = await authHelpers.handleVerifyEmail(mockRequest);

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBe(providerError);
  });

  test('should pass through SuperAuthError from credentialService.verifyEmail', async () => {
    const verifyError = new SuperAuthError({
      message: 'Verification token is invalid or expired',
    });

    mockProviderRegistry.getCredentialProvider.mockReturnValue(
      ok(mockCredentialProvider),
    );
    mockCredentialService.verifyEmail.mockReturnValue(errAsync(verifyError));

    const result = await authHelpers.handleVerifyEmail(mockRequest);

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBe(verifyError);
  });

  test('should wrap unknown error from getCredentialProvider in UnknownError', async () => {
    const unknownError = new Error('Unknown error');

    mockProviderRegistry.getCredentialProvider.mockReturnValue(
      err(unknownError),
    );

    const result = await authHelpers.handleVerifyEmail(mockRequest);

    expect(result.isErr()).toBe(true);

    const error = result._unsafeUnwrapErr();
    expect(error).toBeInstanceOf(UnknownError);
    expect(error.cause).toBe(unknownError);
  });

  test('should wrap unknown error from credentialService.verifyEmail in UnknownError', async () => {
    const unknownError = new Error('Unknown error');

    mockProviderRegistry.getCredentialProvider.mockReturnValue(
      ok(mockCredentialProvider),
    );
    mockCredentialService.verifyEmail.mockReturnValue(errAsync(unknownError));

    const result = await authHelpers.handleVerifyEmail(mockRequest);

    expect(result.isErr()).toBe(true);

    const error = result._unsafeUnwrapErr();
    expect(error).toBeInstanceOf(UnknownError);
    expect(error.cause).toBe(unknownError);
  });
});
