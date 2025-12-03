import { describe, test, expect, vi, beforeEach } from 'vitest';
import { ok, okAsync, errAsync } from 'neverthrow';
import { CredentialProvider } from '../provider';
import {
  createMockCredentialProviderConfig,
  testSecret,
  testBaseUrl,
  testUserData,
  testUserDataWithAdditionalFields,
  mockHashedPassword,
  mockToken,
  mockVerificationUrl,
  type MockCredentialProviderConfig,
} from './setup';
import { AccountAlreadyExistsError } from '../errors';
import {
  LucidAuthError,
  CallbackError,
  UnknownError,
} from '../../../core/errors';
import type { PasswordHash } from '../../../core/password/types';
import type { EmailVerificationToken } from '../../../core/verification';
import type { EmailVerificationUrl } from '../../../core/verification/types';

// ============================================
// MOCK CORE MODULES
// ============================================

vi.mock('../../../core/password/hash', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../../core/password/hash')>();

  return {
    ...actual,
    hashPassword: vi.fn(),
  };
});

vi.mock('../../../core/verification', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../../core/verification')>();
  return {
    ...actual,
    generateEmailVerificationToken: vi.fn(),
    buildEmailVerificationUrl: vi.fn(),
  };
});

import { hashPassword } from '../../../core/password/hash';
import {
  generateEmailVerificationToken,
  buildEmailVerificationUrl,
} from '../../../core/verification';

describe('CredentialProvider.signUp', () => {
  let provider: CredentialProvider;
  let mockConfig: MockCredentialProviderConfig;

  beforeEach(() => {
    vi.resetAllMocks();
    mockConfig = createMockCredentialProviderConfig();
    provider = new CredentialProvider(mockConfig);
  });

  test('should return email and redirectTo on successful signUp', async () => {
    mockConfig.onSignUp.checkCredentialUserExists.mockResolvedValue({
      exists: false,
    });
    vi.mocked(hashPassword).mockReturnValue(
      okAsync(mockHashedPassword as PasswordHash),
    );
    vi.mocked(generateEmailVerificationToken).mockReturnValue(
      okAsync(mockToken as EmailVerificationToken),
    );
    vi.mocked(buildEmailVerificationUrl).mockReturnValue(
      ok(mockVerificationUrl as EmailVerificationUrl),
    );

    mockConfig.onSignUp.sendVerificationEmail.mockResolvedValue(undefined);

    const result = await provider.signUp(testUserData, testSecret, testBaseUrl);

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toEqual({
      email: testUserData.email,
      redirectTo: mockConfig.onSignUp.redirects.signUpSuccess,
    });
  });

  test('should return AccountAlreadyExistsError when user exists', async () => {
    mockConfig.onSignUp.checkCredentialUserExists.mockResolvedValue({
      exists: true,
    });

    const result = await provider.signUp(testUserData, testSecret, testBaseUrl);

    expect(result.isErr()).toBe(true);

    const error = result._unsafeUnwrapErr();
    expect(error).toBeInstanceOf(AccountAlreadyExistsError);
  });

  test('should return CallbackError when checkUserExists throws', async () => {
    const callbackError = new Error('Database connection failed');
    mockConfig.onSignUp.checkCredentialUserExists.mockRejectedValue(
      callbackError,
    );

    const result = await provider.signUp(testUserData, testSecret, testBaseUrl);

    expect(result.isErr()).toBe(true);

    const error = result._unsafeUnwrapErr();
    expect(error).toBeInstanceOf(CallbackError);
  });

  test('should return CallbackError when sendVerificationEmail throws', async () => {
    const callbackError = new Error('Email service unavailable');

    mockConfig.onSignUp.checkCredentialUserExists.mockResolvedValue({
      exists: false,
    });
    vi.mocked(hashPassword).mockReturnValue(
      okAsync(mockHashedPassword as PasswordHash),
    );
    vi.mocked(generateEmailVerificationToken).mockReturnValue(
      okAsync(mockToken as EmailVerificationToken),
    );
    vi.mocked(buildEmailVerificationUrl).mockReturnValue(
      ok(mockVerificationUrl as EmailVerificationUrl),
    );
    mockConfig.onSignUp.sendVerificationEmail.mockRejectedValue(callbackError);

    const result = await provider.signUp(testUserData, testSecret, testBaseUrl);

    expect(result.isErr()).toBe(true);

    const error = result._unsafeUnwrapErr();
    expect(error).toBeInstanceOf(CallbackError);
  });
});
