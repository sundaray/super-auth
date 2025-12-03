import { describe, test, expect, vi, beforeEach } from 'vitest';
import { okAsync } from 'neverthrow';
import { CredentialProvider } from '../provider';
import {
  createMockCredentialProviderConfig,
  testUserData,
  mockUserSession,
  type MockCredentialProviderConfig,
} from './setup';
import { AccountNotFoundError, InvalidCredentialsError } from '../errors';
import { CallbackError } from '../../../core/errors';

// ============================================
// MOCK CORE MODULES
// ============================================

vi.mock('../../../core/password/verify', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../../core/password/hash')>();

  return {
    ...actual,
    verifyPassword: vi.fn(),
  };
});

import { verifyPassword } from '../../../core/password/verify';

describe('CredentialProvider.signUp', () => {
  let provider: CredentialProvider;
  let mockConfig: MockCredentialProviderConfig;

  beforeEach(() => {
    vi.resetAllMocks();
    mockConfig = createMockCredentialProviderConfig();
    provider = new CredentialProvider(mockConfig);
  });

  test('should return user session on successful sign in', async () => {
    mockConfig.onSignIn.getCredentialUser.mockResolvedValue(mockUserSession);
    vi.mocked(verifyPassword).mockReturnValue(okAsync(true));

    const result = await provider.signIn(testUserData);

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toEqual(mockUserSession);
  });

  test('should return AccountNotFoundError when user does not exist', async () => {
    mockConfig.onSignIn.getCredentialUser.mockResolvedValue(null);

    const result = await provider.signIn(testUserData);

    expect(result.isErr()).toBe(true);

    const error = result._unsafeUnwrapErr();
    expect(error).toBeInstanceOf(AccountNotFoundError);
  });

  test('should return InvalidCredentialsError when password is invalid', async () => {
    mockConfig.onSignIn.getCredentialUser.mockResolvedValue(mockUserSession);
    vi.mocked(verifyPassword).mockReturnValue(okAsync(false));

    const result = await provider.signIn(testUserData);

    expect(result.isErr()).toBe(true);

    const error = result._unsafeUnwrapErr();
    expect(error).toBeInstanceOf(InvalidCredentialsError);
  });

  test('should return CallbackError when onSignIn throws', async () => {
    const callbackError = new Error('Database connection failed');
    mockConfig.onSignIn.getCredentialUser.mockRejectedValue(callbackError);

    const result = await provider.signIn(testUserData);

    expect(result.isErr()).toBe(true);

    const error = result._unsafeUnwrapErr();
    expect(error).toBeInstanceOf(CallbackError);
  });
});
