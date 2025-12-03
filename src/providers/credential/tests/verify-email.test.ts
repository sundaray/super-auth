import { describe, test, expect, vi, beforeEach } from 'vitest';
import { okAsync, errAsync } from 'neverthrow';
import { CredentialProvider } from '../provider';
import {
  testSecret,
  createMockRequest,
  mockHashedPassword,
  createMockCredentialProviderConfig,
  type MockCredentialProviderConfig,
} from './setup';
import { UnknownError } from '../../../core/errors';

vi.mock('../../../core/verification', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../../core/verification')>();
  return {
    ...actual,
    verifyEmailVerificationToken: vi.fn(),
  };
});

import {
  verifyEmailVerificationToken,
  InvalidEmailVerificationTokenError,
} from '../../../core/verification';

describe('CredentialProvider.verifyEmail', () => {
  let provider: CredentialProvider;
  let mockConfig: MockCredentialProviderConfig;

  const mockTokenPayload = {
    email: 'test@example.com',
    hashedPassword: mockHashedPassword,
    name: 'Test User',
  };

  beforeEach(() => {
    vi.resetAllMocks();
    mockConfig = createMockCredentialProviderConfig();
    provider = new CredentialProvider(mockConfig);
  });

  test('should return redirectTo on successful email verification', async () => {
    const request = createMockRequest(
      'https://myapp.com/api/auth/verify-email?token=valid-token',
    );

    vi.mocked(verifyEmailVerificationToken).mockReturnValue(
      okAsync(mockTokenPayload),
    );
    mockConfig.onSignUp.createCredentialUser.mockResolvedValue(undefined);

    const result = await provider.verifyEmail(request, testSecret);

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toEqual({
      redirectTo: mockConfig.onSignUp.redirects.emailVerificationSuccess,
    });
  });

  test('should append error to redirect URL when token is missing', async () => {
    const request = createMockRequest(
      'https://myapp.com/api/auth/verify-email',
    );

    const result = await provider.verifyEmail(request, testSecret);

    expect(result.isOk()).toBe(true);

    const value = result._unsafeUnwrap();
    expect(value.redirectTo).toBe(
      `${mockConfig.onSignUp.redirects.emailVerificationError}?error=email_verification_token_not_found_error`,
    );
  });

  test('should append error to redirect URL when token is empty', async () => {
    const request = createMockRequest(
      'https://myapp.com/api/auth/verify-email?token=',
    );

    const result = await provider.verifyEmail(request, testSecret);

    expect(result.isOk()).toBe(true);

    const value = result._unsafeUnwrap();
    expect(value.redirectTo).toBe(
      `${mockConfig.onSignUp.redirects.emailVerificationError}?error=email_verification_token_not_found_error`,
    );
  });

  test('should append error to redirect URL when token verification fails', async () => {
    const request = createMockRequest(
      'https://myapp.com/api/auth/verify-email?token=invalid-token',
    );

    const verificationError = new InvalidEmailVerificationTokenError();
    vi.mocked(verifyEmailVerificationToken).mockReturnValue(
      errAsync(verificationError),
    );

    const result = await provider.verifyEmail(request, testSecret);

    expect(result.isOk()).toBe(true);

    const value = result._unsafeUnwrap();
    expect(value.redirectTo).toBe(
      `${mockConfig.onSignUp.redirects.emailVerificationError}?error=invalid_email_verification_token_error`,
    );
  });

  test('should append callback_error to redirect URL when createUser throws', async () => {
    const request = createMockRequest(
      'https://myapp.com/api/auth/verify-email?token=valid-token',
    );

    vi.mocked(verifyEmailVerificationToken).mockReturnValue(
      okAsync(mockTokenPayload),
    );

    const callbackError = new Error('Database connection failed');
    mockConfig.onSignUp.createCredentialUser.mockRejectedValue(callbackError);

    const result = await provider.verifyEmail(request, testSecret);

    expect(result.isOk()).toBe(true);

    const value = result._unsafeUnwrap();
    expect(value.redirectTo).toBe(
      `${mockConfig.onSignUp.redirects.emailVerificationError}?error=on_sign_up_create_credential_user_callback_error`,
    );
  });

  test('should wrap non-LucidAuthError in UnknownError', async () => {
    const request = createMockRequest(
      'https://myapp.com/api/auth/verify-email?token=valid-token',
    );

    // Return a non-LucidAuthError from verifyEmailVerificationToken
    const unknownError = { weird: 'error object' };
    vi.mocked(verifyEmailVerificationToken).mockReturnValue(
      errAsync(unknownError as any),
    );

    const result = await provider.verifyEmail(request, testSecret);

    expect(result.isErr()).toBe(true);

    const error = result._unsafeUnwrapErr();
    expect(error).toBeInstanceOf(UnknownError);
  });
});
