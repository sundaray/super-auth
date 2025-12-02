import { describe, expect, vi, test, beforeEach } from 'vitest';
import { okAsync, errAsync } from 'neverthrow';
import { CredentialService } from './';
import type { AuthConfig } from '../../types';
import type { CredentialProvider } from '../../providers/credential/provider';
import type { CredentialProviderConfig } from '../../providers/credential/types';
import { LucidAuthError, UnknownError } from '../errors';

describe('CredentialService', () => {
  // ============================================
  // TEST FIXTURES
  // ============================================
  const mockConfig: AuthConfig = {
    baseUrl: 'http://localhost:3000',
    session: {
      secret: 'test-secret-key-base64',
      maxAge: 3600,
    },
    providers: [],
  };

  function createMockCredentialProvider(): CredentialProvider {
    return {
      id: 'credential',
      type: 'credential',
      config: {} as CredentialProviderConfig,
      signUp: vi.fn(),
      signIn: vi.fn(),
      verifyEmail: vi.fn(),
      forgotPassword: vi.fn(),
      verifyPasswordResetToken: vi.fn(),
      resetPassword: vi.fn(),
    };
  }

  let credentialService: CredentialService;
  let mockProvider: CredentialProvider;

  beforeEach(() => {
    vi.resetAllMocks();
    mockProvider = createMockCredentialProvider();
    credentialService = new CredentialService(mockConfig);
  });

  // ============================================
  // signUp()
  // ============================================
  describe('signUp', () => {
    const signUpData = {
      email: 'test@example.com',
      password: 'securePassword123',
      name: 'Test User',
    };
    test('should sign up user and return redirectTo on success', async () => {
      const expectedRedirect = '/check-email' as const;

      vi.mocked(mockProvider.signUp).mockReturnValue(
        okAsync({ email: signUpData.email, redirectTo: expectedRedirect }),
      );

      const result = await credentialService.signUp(mockProvider, signUpData);

      if (result.isErr()) {
        console.log('Sign up error: ', result.error);
      }

      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()).toEqual({
        redirectTo: expectedRedirect,
      });
    });

    test('should call provider sign up with correct parameters', async () => {
      vi.mocked(mockProvider.signUp).mockReturnValue(
        okAsync({ email: signUpData.email, redirectTo: '/check-email' }),
      );

      await credentialService.signUp(mockProvider, signUpData);

      expect(mockProvider.signUp).toHaveBeenCalledWith(
        signUpData,
        mockConfig.session.secret,
        mockConfig.baseUrl,
      );
    });

    test('should return LucidAuthError when provider sign up fails with LucidAuthError', async () => {
      const signUpError = new LucidAuthError({
        message: 'Account already exists.',
      });

      vi.mocked(mockProvider.signUp).mockReturnValue(errAsync(signUpError));

      const result = await credentialService.signUp(mockProvider, signUpData);

      expect(result.isErr()).toBe(true);

      const error = result._unsafeUnwrapErr();

      expect(error).toBeInstanceOf(LucidAuthError);
    });

    test('should wrap unknown errors in UnknownError', async () => {
      const unknwonError = new Error('Unknown error');

      vi.mocked(mockProvider.signUp).mockReturnValue(errAsync(unknwonError));

      const result = await credentialService.signUp(mockProvider, signUpData);

      expect(result.isErr()).toBe(true);
      const error = result._unsafeUnwrapErr();
      expect(error).toBeInstanceOf(UnknownError);
    });
  });

  // ============================================
  // signIn()
  // ============================================
  describe('signIn', () => {
    const signInData = {
      email: 'test@example.com',
      password: 'securePassword123',
    };

    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      hashedPassword: 'hashed-password-value',
      role: 'user',
    };

    test('should sign in user and return session data without hashedPassword', async () => {
      vi.mocked(mockProvider.signIn).mockReturnValue(okAsync(mockUser));

      const result = await credentialService.signIn(mockProvider, signInData);

      expect(result.isOk()).toBe(true);
      const value = result._unsafeUnwrap();
      expect(value.user).toEqual({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'user',
      });
      expect(value.user).not.toHaveProperty('hashedPassword');
      expect(value.redirectTo).toBe('/');
    });

    test('should call provider signIn with email and password', async () => {
      vi.mocked(mockProvider.signIn).mockReturnValue(okAsync(mockUser));

      await credentialService.signIn(mockProvider, signInData);

      expect(mockProvider.signIn).toHaveBeenCalledWith(signInData);
    });

    test('should return LucidAuthError when provider signIn fails', async () => {
      const signInError = new LucidAuthError({
        message: 'Invalid credentials',
      });

      vi.mocked(mockProvider.signIn).mockReturnValue(errAsync(signInError));

      const result = await credentialService.signIn(mockProvider, signInData);

      expect(result.isErr()).toBe(true);

      const error = result._unsafeUnwrapErr();

      expect(error).toBeInstanceOf(LucidAuthError);
    });

    test('should wrap unknown errors in UnknownError', async () => {
      const unknownError = new Error('Unknown error');

      vi.mocked(mockProvider.signIn).mockReturnValue(
        errAsync(unknownError as any),
      );

      const result = await credentialService.signIn(mockProvider, signInData);

      expect(result.isErr()).toBe(true);
      const error = result._unsafeUnwrapErr();
      expect(error).toBeInstanceOf(UnknownError);
    });
  });

  // ============================================
  // verifyEmail()
  // ============================================

  describe('verifyEmail', () => {
    function createMockRequest(url: string): Request {
      return new Request(url);
    }

    test('should verify email and return redirectTo on success', async () => {
      const request = createMockRequest(
        'https://myapp.com/api/auth/verify-email?token=valid-token',
      );
      const expectedRedirect = '/login' as const;

      vi.mocked(mockProvider.verifyEmail).mockReturnValue(
        okAsync({ redirectTo: expectedRedirect }),
      );

      const result = await credentialService.verifyEmail(request, mockProvider);

      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()).toEqual({ redirectTo: expectedRedirect });
    });

    test('should call provider verifyEmail with request and secret', async () => {
      const request = createMockRequest(
        'https://myapp.com/api/auth/verify-email?token=valid-token',
      );

      vi.mocked(mockProvider.verifyEmail).mockReturnValue(
        okAsync({ redirectTo: '/login' }),
      );

      await credentialService.verifyEmail(request, mockProvider);

      expect(mockProvider.verifyEmail).toHaveBeenCalledWith(
        request,
        mockConfig.session.secret,
      );
    });

    test('should return LucidAuthError when provider verifyEmail fails', async () => {
      const request = createMockRequest(
        'https://myapp.com/api/auth/verify-email?token=invalid',
      );
      const verifyError = new LucidAuthError({
        message: 'Invalid token',
      });

      vi.mocked(mockProvider.verifyEmail).mockReturnValue(
        errAsync(verifyError),
      );

      const result = await credentialService.verifyEmail(request, mockProvider);

      const error = result._unsafeUnwrapErr();

      expect(error).toBeInstanceOf(LucidAuthError);
    });

    test('should wrap unknown errors in UnknownError', async () => {
      const request = createMockRequest(
        'https://myapp.com/api/auth/verify-email?token=test',
      );
      const unknownError = new Error('Unexpected');

      vi.mocked(mockProvider.verifyEmail).mockReturnValue(
        errAsync(unknownError),
      );

      const result = await credentialService.verifyEmail(request, mockProvider);

      expect(result.isErr()).toBe(true);
      const error = result._unsafeUnwrapErr();
      expect(error).toBeInstanceOf(UnknownError);
    });
  });

  // ============================================
  // forgotPassword()
  // ============================================

  describe('forgotPassword', () => {
    const forgotPasswordData = {
      email: 'test@example.com',
    };

    test('should initiate password reset and return redirectTo on success', async () => {
      const expectedRedirect = '/check-email' as const;

      vi.mocked(mockProvider.forgotPassword).mockReturnValue(
        okAsync({ redirectTo: expectedRedirect }),
      );

      const result = await credentialService.forgotPassword(
        mockProvider,
        forgotPasswordData,
      );

      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()).toEqual({ redirectTo: expectedRedirect });
    });

    test('should call provider forgotPassword with correct parameters', async () => {
      vi.mocked(mockProvider.forgotPassword).mockReturnValue(
        okAsync({ redirectTo: '/check-email' }),
      );

      await credentialService.forgotPassword(mockProvider, forgotPasswordData);

      expect(mockProvider.forgotPassword).toHaveBeenCalledWith(
        forgotPasswordData,
        mockConfig.session.secret,
        mockConfig.baseUrl,
      );
    });

    test('should return LucidAuthError when provider forgotPassword fails', async () => {
      const forgotPasswordError = new LucidAuthError({
        message: 'Failed to send reset email',
      });

      vi.mocked(mockProvider.forgotPassword).mockReturnValue(
        errAsync(forgotPasswordError),
      );

      const result = await credentialService.forgotPassword(
        mockProvider,
        forgotPasswordData,
      );

      expect(result.isErr()).toBe(true);
      const error = result._unsafeUnwrapErr();

      expect(error).toBeInstanceOf(LucidAuthError);
    });

    test('should wrap unknown errors in UnknownError', async () => {
      const unknownError = new Error('Unknown error');

      vi.mocked(mockProvider.forgotPassword).mockReturnValue(
        errAsync(unknownError as any),
      );

      const result = await credentialService.forgotPassword(
        mockProvider,
        forgotPasswordData,
      );

      expect(result.isErr()).toBe(true);
      const error = result._unsafeUnwrapErr();
      expect(error).toBeInstanceOf(UnknownError);
    });
  });

  // ============================================
  // verifyPasswordResetToken()
  // ============================================

  describe('verifyPasswordResetToken', () => {
    function createMockRequest(url: string): Request {
      return new Request(url);
    }

    test('should verify token and return email, passwordHash, and redirectTo', async () => {
      const request = createMockRequest(
        'https://myapp.com/api/auth/verify-password-reset-token?token=valid-token',
      );
      const expectedResult = {
        email: 'test@example.com',
        passwordHash: 'hashed-password',
        redirectTo: '/reset-password?token=valid-token' as const,
      };

      vi.mocked(mockProvider.verifyPasswordResetToken).mockReturnValue(
        okAsync(expectedResult),
      );

      const result = await credentialService.verifyPasswordResetToken(
        request,
        mockProvider,
      );

      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()).toEqual(expectedResult);
    });

    test('should call provider verifyPasswordResetToken with request and secret', async () => {
      const request = createMockRequest(
        'https://myapp.com/api/auth/verify-password-reset-token?token=valid-token',
      );

      vi.mocked(mockProvider.verifyPasswordResetToken).mockReturnValue(
        okAsync({
          email: 'test@example.com',
          passwordHash: 'hash',
          redirectTo: '/reset-password',
        }),
      );

      await credentialService.verifyPasswordResetToken(request, mockProvider);

      expect(mockProvider.verifyPasswordResetToken).toHaveBeenCalledWith(
        request,
        mockConfig.session.secret,
      );
    });

    test('should return LucidAuthError when token verification fails', async () => {
      const request = createMockRequest(
        'https://myapp.com/api/auth/verify-password-reset-token?token=expired',
      );
      const verifyError = new LucidAuthError({
        message: 'Token expired',
      });

      vi.mocked(mockProvider.verifyPasswordResetToken).mockReturnValue(
        errAsync(verifyError),
      );

      const result = await credentialService.verifyPasswordResetToken(
        request,
        mockProvider,
      );

      expect(result.isErr()).toBe(true);
      const error = result._unsafeUnwrapErr();

      expect(error).toBeInstanceOf(LucidAuthError);
    });

    test('should wrap unknown errors in UnknownError', async () => {
      const request = createMockRequest(
        'https://myapp.com/api/auth/verify-password-reset-token?token=test',
      );
      const unknownError = new Error('Unknown error');

      vi.mocked(mockProvider.verifyPasswordResetToken).mockReturnValue(
        errAsync(unknownError as any),
      );

      const result = await credentialService.verifyPasswordResetToken(
        request,
        mockProvider,
      );

      expect(result.isErr()).toBe(true);
      const error = result._unsafeUnwrapErr();
      expect(error).toBeInstanceOf(UnknownError);
    });
  });

  // ============================================
  // resetPassword()
  // ============================================

  describe('resetPassword', () => {
    const resetPasswordData = {
      newPassword: 'newSecurePassword123',
    };
    const token = 'valid-reset-token';

    test('should reset password and return redirectTo on success', async () => {
      const expectedRedirect = '/login' as const;

      vi.mocked(mockProvider.resetPassword).mockReturnValue(
        okAsync({ redirectTo: expectedRedirect }),
      );

      const result = await credentialService.resetPassword(
        mockProvider,
        token,
        resetPasswordData,
      );

      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()).toEqual({ redirectTo: expectedRedirect });
    });

    test('should call provider resetPassword with correct parameters', async () => {
      vi.mocked(mockProvider.resetPassword).mockReturnValue(
        okAsync({ redirectTo: '/login' }),
      );

      await credentialService.resetPassword(
        mockProvider,
        token,
        resetPasswordData,
      );

      expect(mockProvider.resetPassword).toHaveBeenCalledWith(
        token,
        resetPasswordData,
        mockConfig.session.secret,
      );
    });

    test('should return LucidAuthError when provider resetPassword fails', async () => {
      const resetError = new LucidAuthError({
        message: 'Invalid reset password token.',
      });

      vi.mocked(mockProvider.resetPassword).mockReturnValue(
        errAsync(resetError),
      );

      const result = await credentialService.resetPassword(
        mockProvider,
        token,
        resetPasswordData,
      );

      expect(result.isErr()).toBe(true);
      const error = result._unsafeUnwrapErr();

      expect(error).toBeInstanceOf(LucidAuthError);
    });

    test('should wrap unknown errors in UnknownError', async () => {
      const unknownError = new Error('Unknown error');

      vi.mocked(mockProvider.resetPassword).mockReturnValue(
        errAsync(unknownError as any),
      );

      const result = await credentialService.resetPassword(
        mockProvider,
        token,
        resetPasswordData,
      );

      if (result.isErr()) {
        console.log('Reset password error: ', result.error);
      }

      expect(result.isErr()).toBe(true);
      const error = result._unsafeUnwrapErr();
      expect(error).toBeInstanceOf(UnknownError);
    });
  });
});
