import { describe, test, expect, vi, beforeEach } from 'vitest';
import { okAsync, errAsync } from 'neverthrow';
import { CredentialProvider } from '../provider';
import {
  createMockCredentialProviderConfig,
  testSecret,
  mockHashedPassword,
  mockToken,
  type MockCredentialProviderConfig,
} from './setup';
import {
  CallbackError,
  SuperAuthError,
  UnknownError,
} from '../../../core/errors';
import type { PasswordHash } from '../../../core/password/types';

// ============================================
// MOCK CORE MODULES
// ============================================

vi.mock('../../../core/password', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../../core/password')>();
  return {
    ...actual,
    verifyPasswordResetToken: vi.fn(),
  };
});

vi.mock('../../../core/password/hash', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../../core/password/hash')>();
  return {
    ...actual,
    hashPassword: vi.fn(),
  };
});

import {
  verifyPasswordResetToken,
  PasswordResetTokenAlreadyUsedError,
  UserNotFoundError,
} from '../../../core/password';
import { hashPassword } from '../../../core/password/hash';

describe('CredentialProvider.resetPassword', () => {
  let provider: CredentialProvider;
  let mockConfig: MockCredentialProviderConfig;

  const testEmail = 'test@example.com';
  const newPassword = 'newSecurePassword123';
  const newHashedPassword = 'new-hashed-password-value';

  const mockTokenPayload = {
    email: testEmail,
    passwordHash: mockHashedPassword,
  };

  beforeEach(() => {
    vi.resetAllMocks();
    mockConfig = createMockCredentialProviderConfig();
    provider = new CredentialProvider(mockConfig);
  });

  test('should return redirectTo on successful password reset', async () => {
    vi.mocked(verifyPasswordResetToken).mockReturnValue(
      okAsync(mockTokenPayload),
    );
    mockConfig.onPasswordReset.checkUserExists.mockResolvedValue({
      exists: true,
      passwordHash: mockHashedPassword,
    });
    vi.mocked(hashPassword).mockReturnValue(
      okAsync(newHashedPassword as PasswordHash),
    );
    mockConfig.onPasswordReset.updatePassword.mockResolvedValue(undefined);
    mockConfig.onPasswordReset.sendPasswordUpdateEmail.mockResolvedValue(
      undefined,
    );

    const result = await provider.resetPassword(
      mockToken,
      { newPassword },
      testSecret,
    );

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toEqual({
      redirectTo: mockConfig.onPasswordReset.redirects.resetPasswordSuccess,
    });
  });

  test('should return CallbackError when checkUserExists throws', async () => {
    vi.mocked(verifyPasswordResetToken).mockReturnValue(
      okAsync(mockTokenPayload),
    );

    const callbackError = new Error('Database connection failed');
    mockConfig.onPasswordReset.checkUserExists.mockRejectedValue(callbackError);

    const result = await provider.resetPassword(
      mockToken,
      { newPassword },
      testSecret,
    );

    expect(result.isErr()).toBe(true);

    const error = result._unsafeUnwrapErr();
    expect(error).toBeInstanceOf(CallbackError);
  });

  test('should return CallbackError when updatePassword throws', async () => {
    vi.mocked(verifyPasswordResetToken).mockReturnValue(
      okAsync(mockTokenPayload),
    );
    mockConfig.onPasswordReset.checkUserExists.mockResolvedValue({
      exists: true,
      passwordHash: mockHashedPassword,
    });
    vi.mocked(hashPassword).mockReturnValue(
      okAsync(newHashedPassword as PasswordHash),
    );

    const callbackError = new Error('Database update failed');
    mockConfig.onPasswordReset.updatePassword.mockRejectedValue(callbackError);

    const result = await provider.resetPassword(
      mockToken,
      { newPassword },
      testSecret,
    );

    expect(result.isErr()).toBe(true);

    const error = result._unsafeUnwrapErr();
    expect(error).toBeInstanceOf(CallbackError);
  });

  test('should return CallbackError when sendPasswordUpdatedEmail throws', async () => {
    vi.mocked(verifyPasswordResetToken).mockReturnValue(
      okAsync(mockTokenPayload),
    );
    mockConfig.onPasswordReset.checkUserExists.mockResolvedValue({
      exists: true,
      passwordHash: mockHashedPassword,
    });
    vi.mocked(hashPassword).mockReturnValue(
      okAsync(newHashedPassword as PasswordHash),
    );
    mockConfig.onPasswordReset.updatePassword.mockResolvedValue(undefined);

    const callbackError = new Error('Email service failed');
    mockConfig.onPasswordReset.sendPasswordUpdateEmail.mockRejectedValue(
      callbackError,
    );

    const result = await provider.resetPassword(
      mockToken,
      { newPassword },
      testSecret,
    );

    expect(result.isErr()).toBe(true);

    const error = result._unsafeUnwrapErr();
    expect(error).toBeInstanceOf(CallbackError);
  });
});
