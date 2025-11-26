import { describe, test, expect, vi, beforeEach } from 'vitest';
import { ok, err, okAsync, errAsync } from 'neverthrow';
import { OAuthService } from './oauth-service';
import type { AuthConfig } from '../../types';
import type { SessionStorage } from '../session/types';
import type { OAuthProvider } from '../../providers/types';
import type { OAuthStatePayload, OAuthStateJWE } from '../oauth/types';
import { SuperAuthError, UnknownError } from '../errors';
import {
  GenerateStateError,
  GenerateCodeChallengeError,
  GenerateCodeVerifierError,
} from '../pkce';
import {
  OAuthStateCookieNotFoundError,
  DecryptOAuthStateJweError,
  EncryptOAuthStatePayloadError,
} from '../oauth/errors';

// ============================================
// MOCK DEPENDENCIES
// ============================================
vi.mock('../pkce', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../pkce')>();

  return {
    ...actual,
    generateState: vi.fn(),
    generateCodeVerifier: vi.fn(),
    generateCodeChallenge: vi.fn(),
  };
});

vi.mock('../oauth', () => ({
  encryptOAuthStatePayload: vi.fn(),
  decryptOAuthStateJWE: vi.fn(),
}));

import {
  generateState,
  generateCodeVerifier,
  generateCodeChallenge,
} from '../pkce';
import { encryptOAuthStatePayload, decryptOAuthStateJWE } from '../oauth';

describe('OAuthService', () => {
  // ============================================
  // TEST FIXTURES
  // ============================================
  const mockConfig: AuthConfig = {
    baseUrl: 'http://localhost:3000',
    session: {
      secret: '',
      maxAge: 3600,
    },
    providers: [],
  };

  const mockOAuthStatePayload: OAuthStatePayload = {
    state: 'random-state-string',
    codeVerifier: 'random-code-verifier',
    provider: 'google',
    redirectTo: '/dashboard',
  };

  function createMockSessionStorage(): SessionStorage<undefined> {
    return {
      getSession: vi.fn(),
      saveSession: vi.fn(),
      deleteSession: vi.fn(),
    };
  }

  function createMockOAuthProvider(): OAuthProvider {
    return {
      id: 'google',
      type: 'oauth',
      getAuthorizationUrl: vi.fn(),
      completeSignin: vi.fn(),
      onAuthenticated: vi.fn(),
    };
  }

  let oauthService: OAuthService<undefined>;
  let mockProvider: OAuthProvider;
  let mockStorage: SessionStorage<undefined>;

  beforeEach(() => {
    vi.resetAllMocks();
    mockStorage = createMockSessionStorage();
    mockProvider = createMockOAuthProvider();
    oauthService = new OAuthService<undefined>(mockConfig, mockStorage);
  });

  // ============================================
  // initiateSignIn()
  // ============================================
  describe('initiateSignIn', () => {
    const mockState = 'generated-state';
    const mockCodeVerifier = 'generated-code-verifier';
    const mockCodeChallenge = 'generated-code-challenge';
    const mockOAuthStateJWE = 'encrypted-oauth-state-jwe' as OAuthStateJWE;
    const mockAuthorizationURL = 'https://accounts.google.com/oauth?...';

    function setupSuccessfulPKCE() {
      vi.mocked(generateState).mockReturnValue(ok(mockState));
      vi.mocked(generateCodeVerifier).mockReturnValue(ok(mockCodeVerifier));
      vi.mocked(generateCodeChallenge).mockReturnValue(
        okAsync(mockCodeChallenge),
      );
    }

    test('should return authorization URL and OAuth state JWE on success', async () => {
      setupSuccessfulPKCE();
      vi.mocked(encryptOAuthStatePayload).mockReturnValue(
        okAsync(mockOAuthStateJWE),
      );
      vi.mocked(mockProvider.getAuthorizationUrl).mockReturnValue(
        ok(mockAuthorizationURL),
      );

      const result = await oauthService.initiateSignIn(mockProvider, {
        redirectTo: '/dashboard',
      });

      expect(result.isOk()).toBe(true);
      const value = result._unsafeUnwrap();
      expect(value.authorizationUrl).toBe(mockAuthorizationURL);
      expect(value.oauthStateJWE).toBe(mockOAuthStateJWE);
    });

    test('should encrypt OAuth state with correct parameters', async () => {
      setupSuccessfulPKCE();
      vi.mocked(encryptOAuthStatePayload).mockReturnValue(
        okAsync(mockOAuthStateJWE),
      );
      vi.mocked(mockProvider.getAuthorizationUrl).mockReturnValue(
        ok(mockAuthorizationURL),
      );

      await oauthService.initiateSignIn(mockProvider, {
        redirectTo: '/custom',
      });

      expect(encryptOAuthStatePayload).toHaveBeenCalledWith({
        oauthState: {
          state: mockState,
          codeVerifier: mockCodeVerifier,
          redirectTo: '/custom',
          provider: 'google',
        },
        secret: mockConfig.session.secret,
        maxAge: expect.any(Number),
      });
    });

    test('should call provider getAuthorizationUrl with correct parameters', async () => {
      setupSuccessfulPKCE();
      vi.mocked(encryptOAuthStatePayload).mockReturnValue(
        okAsync(mockOAuthStateJWE),
      );
      vi.mocked(mockProvider.getAuthorizationUrl).mockReturnValue(
        ok(mockAuthorizationURL),
      );

      await oauthService.initiateSignIn(mockProvider);

      expect(mockProvider.getAuthorizationUrl).toHaveBeenCalledWith({
        state: mockState,
        codeChallenge: mockCodeChallenge,
        baseUrl: mockConfig.baseUrl,
      });
    });

    test('should return error when generateState fails', async () => {
      const generateStateError = new GenerateStateError();
      vi.mocked(generateState).mockReturnValue(err(generateStateError));

      const result = await oauthService.initiateSignIn(mockProvider);

      if (result.isErr()) {
        console.log('genarate state error: ', result.error);
      }

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr()).toBe(generateStateError);
      expect(generateCodeVerifier).not.toHaveBeenCalled;
    });

    test('should return error when generateCodeVerifier fails', async () => {
      const generateCodeVerifierError = new GenerateCodeVerifierError();
      vi.mocked(generateState).mockReturnValue(ok(mockState));
      vi.mocked(generateCodeVerifier).mockReturnValue(
        err(generateCodeVerifierError),
      );

      const result = await oauthService.initiateSignIn(mockProvider);

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr()).toBe(generateCodeVerifierError);
      expect(generateCodeChallenge).not.toHaveBeenCalled();
    });

    test('should return error when generateCodeChallenge fails', async () => {
      const generateCodeChallengeError = new GenerateCodeChallengeError();
      vi.mocked(generateState).mockReturnValue(ok(mockState));
      vi.mocked(generateCodeVerifier).mockReturnValue(ok(mockCodeVerifier));
      vi.mocked(generateCodeChallenge).mockReturnValue(
        errAsync(generateCodeChallengeError),
      );

      const result = await oauthService.initiateSignIn(mockProvider);

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr()).toBe(generateCodeChallengeError);
    });

    test('should return error when encryptOAuthStatePayload fails', async () => {
      const encryptError = new EncryptOAuthStatePayloadError();
      setupSuccessfulPKCE();
      vi.mocked(encryptOAuthStatePayload).mockReturnValue(
        errAsync(encryptError),
      );

      const result = await oauthService.initiateSignIn(mockProvider);

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr()).toBe(encryptError);
    });

    test('should return error when provider getAuthorizationUrl fails', async () => {
      const authUrlError = new SuperAuthError({
        message: 'Failed to create URL',
      });
      setupSuccessfulPKCE();
      vi.mocked(encryptOAuthStatePayload).mockReturnValue(
        okAsync(mockOAuthStateJWE),
      );
      vi.mocked(mockProvider.getAuthorizationUrl).mockReturnValue(
        err(authUrlError),
      );

      const result = await oauthService.initiateSignIn(mockProvider);

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr()).toBe(authUrlError);
    });

    test('should wrap unknown errors in UnknownError', async () => {
      const unknownError = new Error('Unknown error');

      vi.mocked(generateState).mockReturnValue(err(unknownError));

      const result = await oauthService.initiateSignIn(mockProvider);

      expect(result.isErr()).toBe(true);
      const error = result._unsafeUnwrapErr();
      expect(error).toBeInstanceOf(UnknownError);
    });
  });

  // ============================================
  // completeSignIn()
  // ============================================
  describe('completeSignIn', () => {
    const mockOAuthStateJWE = 'encrypted-oauth-state-jwe';
    const mockUserClaims = {
      email: 'test@example.com',
      name: 'Test User',
      sub: '12345',
    };
    const mockSessionData = {
      id: 'user-1',
      email: 'test@example.com',
    };

    function createMockRequest(url: string): Request {
      return new Request(url);
    }
    test('should complete sign-in and return session data with redirectTo', async () => {
      const request = createMockRequest(
        'https://myapp.com/api/auth/callback/google?code=auth-code&state=random-state',
      );

      vi.mocked(mockStorage.getSession).mockReturnValue(
        okAsync(mockOAuthStateJWE),
      );
      vi.mocked(decryptOAuthStateJWE).mockReturnValue(
        okAsync(mockOAuthStatePayload),
      );
      vi.mocked(mockProvider.completeSignin).mockReturnValue(
        okAsync(mockUserClaims),
      );
      vi.mocked(mockProvider.onAuthenticated).mockReturnValue(
        okAsync(mockSessionData),
      );

      const result = await oauthService.completeSignIn(
        request,
        undefined,
        mockProvider,
      );

      expect(result.isOk()).toBe(true);
      const value = result._unsafeUnwrap();
      expect(value.sessionData).toEqual(mockSessionData);
      expect(value.redirectTo).toBe(mockOAuthStatePayload.redirectTo);
    });

    test('should use default redirectTo when not in OAuth state', async () => {
      const request = createMockRequest(
        'https://myapp.com/api/auth/callback/google?code=auth-code&state=random-state',
      );
      const oauthStateWithoutRedirect: OAuthStatePayload = {
        ...mockOAuthStatePayload,
        redirectTo: undefined,
      };

      vi.mocked(mockStorage.getSession).mockReturnValue(
        okAsync(mockOAuthStateJWE),
      );
      vi.mocked(decryptOAuthStateJWE).mockReturnValue(
        okAsync(oauthStateWithoutRedirect),
      );
      vi.mocked(mockProvider.completeSignin).mockReturnValue(
        okAsync(mockUserClaims),
      );
      vi.mocked(mockProvider.onAuthenticated).mockReturnValue(
        okAsync(mockSessionData),
      );

      const result = await oauthService.completeSignIn(
        request,
        undefined,
        mockProvider,
      );

      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap().redirectTo).toBe('/');
    });

    test('should call storage getSession with context', async () => {
      const request = createMockRequest(
        'https://myapp.com/callback?code=test&state=test',
      );

      vi.mocked(mockStorage.getSession).mockReturnValue(
        okAsync(mockOAuthStateJWE),
      );
      vi.mocked(decryptOAuthStateJWE).mockReturnValue(
        okAsync(mockOAuthStatePayload),
      );
      vi.mocked(mockProvider.completeSignin).mockReturnValue(
        okAsync(mockUserClaims),
      );
      vi.mocked(mockProvider.onAuthenticated).mockReturnValue(
        okAsync(mockSessionData),
      );

      await oauthService.completeSignIn(request, undefined, mockProvider);

      expect(mockStorage.getSession).toHaveBeenCalledWith(undefined);
    });

    test('should call decryptOAuthStateJWE with correct parameters', async () => {
      const request = createMockRequest(
        'https://myapp.com/callback?code=test&state=test',
      );

      vi.mocked(mockStorage.getSession).mockReturnValue(
        okAsync(mockOAuthStateJWE),
      );
      vi.mocked(decryptOAuthStateJWE).mockReturnValue(
        okAsync(mockOAuthStatePayload),
      );
      vi.mocked(mockProvider.completeSignin).mockReturnValue(
        okAsync(mockUserClaims),
      );
      vi.mocked(mockProvider.onAuthenticated).mockReturnValue(
        okAsync(mockSessionData),
      );

      await oauthService.completeSignIn(request, undefined, mockProvider);

      expect(decryptOAuthStateJWE).toHaveBeenCalledWith({
        jwe: mockOAuthStateJWE,
        secret: mockConfig.session.secret,
      });
    });

    test('should call provider completeSignin with correct parameters', async () => {
      const request = createMockRequest(
        'https://myapp.com/callback?code=test&state=test',
      );

      vi.mocked(mockStorage.getSession).mockReturnValue(
        okAsync(mockOAuthStateJWE),
      );
      vi.mocked(decryptOAuthStateJWE).mockReturnValue(
        okAsync(mockOAuthStatePayload),
      );
      vi.mocked(mockProvider.completeSignin).mockReturnValue(
        okAsync(mockUserClaims),
      );
      vi.mocked(mockProvider.onAuthenticated).mockReturnValue(
        okAsync(mockSessionData),
      );

      await oauthService.completeSignIn(request, undefined, mockProvider);

      expect(mockProvider.completeSignin).toHaveBeenCalledWith(
        request,
        mockOAuthStatePayload,
        mockConfig.baseUrl,
      );
    });

    test('should call provider onAuthenticated with user claims', async () => {
      const request = createMockRequest(
        'https://myapp.com/callback?code=test&state=test',
      );

      vi.mocked(mockStorage.getSession).mockReturnValue(
        okAsync(mockOAuthStateJWE),
      );
      vi.mocked(decryptOAuthStateJWE).mockReturnValue(
        okAsync(mockOAuthStatePayload),
      );
      vi.mocked(mockProvider.completeSignin).mockReturnValue(
        okAsync(mockUserClaims),
      );
      vi.mocked(mockProvider.onAuthenticated).mockReturnValue(
        okAsync(mockSessionData),
      );

      await oauthService.completeSignIn(request, undefined, mockProvider);

      expect(mockProvider.onAuthenticated).toHaveBeenCalledWith(mockUserClaims);
    });

    test('should return OAuthStateCookieNotFoundError when no OAuth state cookie', async () => {
      const request = createMockRequest(
        'https://myapp.com/callback?code=test&state=test',
      );

      vi.mocked(mockStorage.getSession).mockReturnValue(okAsync(null));

      const result = await oauthService.completeSignIn(
        request,
        undefined,
        mockProvider,
      );

      expect(result.isErr()).toBe(true);
      const error = result._unsafeUnwrapErr();
      expect(error).toBeInstanceOf(OAuthStateCookieNotFoundError);
      expect(decryptOAuthStateJWE).not.toHaveBeenCalled();
    });

    test('should return error when storage getSession fails', async () => {
      const request = createMockRequest(
        'https://myapp.com/callback?code=test&state=test',
      );
      const storageError = new SuperAuthError({ message: 'Storage error' });

      vi.mocked(mockStorage.getSession).mockReturnValue(errAsync(storageError));

      const result = await oauthService.completeSignIn(
        request,
        undefined,
        mockProvider,
      );

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr()).toBe(storageError);
    });

    test('should return error when decryptOAuthStateJWE fails', async () => {
      const request = createMockRequest(
        'https://myapp.com/callback?code=test&state=test',
      );
      const decryptError = new DecryptOAuthStateJweError();

      vi.mocked(mockStorage.getSession).mockReturnValue(
        okAsync(mockOAuthStateJWE),
      );
      vi.mocked(decryptOAuthStateJWE).mockReturnValue(errAsync(decryptError));

      const result = await oauthService.completeSignIn(
        request,
        undefined,
        mockProvider,
      );

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr()).toBe(decryptError);
    });

    test('should return error when provider completeSignin fails', async () => {
      const request = createMockRequest(
        'https://myapp.com/callback?code=test&state=test',
      );
      const completeSigninError = new SuperAuthError({
        message: 'OAuth failed',
      });

      vi.mocked(mockStorage.getSession).mockReturnValue(
        okAsync(mockOAuthStateJWE),
      );
      vi.mocked(decryptOAuthStateJWE).mockReturnValue(
        okAsync(mockOAuthStatePayload),
      );
      vi.mocked(mockProvider.completeSignin).mockReturnValue(
        errAsync(completeSigninError),
      );

      const result = await oauthService.completeSignIn(
        request,
        undefined,
        mockProvider,
      );

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr()).toBe(completeSigninError);
    });

    test('should return error when provider onAuthenticated fails', async () => {
      const request = createMockRequest(
        'https://myapp.com/callback?code=test&state=test',
      );
      const authError = new SuperAuthError({ message: 'Auth callback failed' });

      vi.mocked(mockStorage.getSession).mockReturnValue(
        okAsync(mockOAuthStateJWE),
      );
      vi.mocked(decryptOAuthStateJWE).mockReturnValue(
        okAsync(mockOAuthStatePayload),
      );
      vi.mocked(mockProvider.completeSignin).mockReturnValue(
        okAsync(mockUserClaims),
      );
      vi.mocked(mockProvider.onAuthenticated).mockReturnValue(
        errAsync(authError),
      );

      const result = await oauthService.completeSignIn(
        request,
        undefined,
        mockProvider,
      );

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr()).toBe(authError);
    });

    test('should wrap unknown errors in UnknownError', async () => {
      const request = createMockRequest(
        'https://myapp.com/callback?code=test&state=test',
      );
      const unknownError = new Error('Unknown error');

      vi.mocked(mockStorage.getSession).mockReturnValue(
        errAsync(unknownError as any),
      );

      const result = await oauthService.completeSignIn(
        request,
        undefined,
        mockProvider,
      );

      expect(result.isErr()).toBe(true);
      const error = result._unsafeUnwrapErr();
      expect(error).toBeInstanceOf(UnknownError);
    });
  });
});
