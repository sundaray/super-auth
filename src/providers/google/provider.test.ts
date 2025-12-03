import { describe, test, expect, vi, beforeEach } from 'vitest';
import { ok, err, okAsync, errAsync } from 'neverthrow';
import { GoogleProvider } from './provider';
import type { GoogleProviderConfig, GoogleUserClaims } from './types';
import type { OAuthState } from '../../core/oauth/types';
import { DecodeGoogleIdTokenError } from './errors';

// These are the functions we will mock
import { exchangeAuthorizationCodeForTokens } from './exchange-authorization-code-for-tokens';
import { decodeGoogleIdToken } from './decode-google-id-token';

// Define mocks
// We use vi.mock to intercept the imports
// When the Google Provider calls these functions, it gets our vi.fn() spies instead.
vi.mock('./exchange-authorization-code-for-tokens', () => ({
  exchangeAuthorizationCodeForTokens: vi.fn(),
}));

vi.mock('./decode-google-id-token', () => ({
  decodeGoogleIdToken: vi.fn(),
}));

describe('GoogleProvider', () => {
  const createMockConfig = (
    overrides?: Partial<GoogleProviderConfig>,
  ): GoogleProviderConfig => ({
    clientId: 'test-client-id',
    clientSecret: 'test-client-secret',
    onAuthentication: {
      createGoogleUser: vi.fn(),
      redirects: {
        error: '/auth/error',
      },
    },
    ...overrides,
  });

  let mockConfig: GoogleProviderConfig;
  let provider: GoogleProvider;

  beforeEach(() => {
    vi.resetAllMocks();
    mockConfig = createMockConfig();
    provider = new GoogleProvider(mockConfig);
  });

  describe('constructor', () => {
    test('should set id to "google', () => {
      expect(provider.id).toBe('google');
    });

    test('should set type to "oauth"', () => {
      expect(provider.type).toBe('oauth');
    });

    test('should store the config', () => {
      expect(provider.config).toBe(mockConfig);
    });
  });

  // --------------------------------------------
  // Get Authorization URL
  // --------------------------------------------
  describe('getAuthorizationUrl', () => {
    test('should generate a valid Google authorization URL', () => {
      const result = provider.getAuthorizationUrl({
        state: 'test-state-123',
        codeChallenge: 'test-code-challenge',
        baseUrl: 'https://myapp.com',
      });

      expect(result.isOk()).toBe(true);
      const url = new URL(result._unsafeUnwrap());

      expect(url.origin).toBe('https://accounts.google.com');
      expect(url.pathname).toBe('/o/oauth2/v2/auth');
      expect(url.searchParams.get('client_id')).toBe('test-client-id');
      expect(url.searchParams.get('redirect_uri')).toBe(
        'https://myapp.com/api/auth/callback/google',
      );
      expect(url.searchParams.get('scope')).toBe('openid email profile');
    });

    test('should use custom prompt when provided', () => {
      // Create a provider with custom prompt in config
      const configWithPrompt = createMockConfig({ prompt: 'consent' });
      const providerWithPrompt = new GoogleProvider(configWithPrompt);

      const result = providerWithPrompt.getAuthorizationUrl({
        state: 'test-state',
        codeChallenge: 'test-challenge',
        baseUrl: 'https://myapp.com',
      });

      expect(result.isOk()).toBe(true);

      const url = new URL(result._unsafeUnwrap());
      expect(url.searchParams.get('prompt')).toBe('consent');
    });

    // --------------------------------------------
    // Complete sign-in
    // --------------------------------------------
    describe('completeSignIn', () => {
      const mockOAuthState: OAuthState = {
        state: 'test-state',
        codeVerifier: 'test-code-verifier',
        redirectTo: '/dashboard',
        provider: 'google',
      };

      const mockUserClaims: GoogleUserClaims = {
        aud: 'test-client-id',
        exp: 12345,
        iat: 12345,
        iss: 'https://accounts.google.com',
        sub: '123456789',
        email: 'test@example.com',
        email_verified: true,
        name: 'Test User',
        picture: 'https://example.com/photo.jpg',
      };

      const mockTokenResponse = {
        access_token: 'access-token',
        id_token: 'valid-id-token',
        expires_in: 3600,
        token_type: 'Bearer',
        scope: 'openid email profile',
      };

      test.each([
        [
          'authorization code is missing',
          'https://myapp.com/api/auth/callback/google',
          'MissingAuthorizationCodeError',
        ],
        [
          'state is missing',
          'https://myapp.com/api/auth/callback/google?code=auth-code',
          'MissingStateError',
        ],
        [
          'state does not match',
          'https://myapp.com/api/auth/callback/google?code=auth-code&state=wrong-state',
          'StateMismatchError',
        ],
      ])('should return error when %s', async (_, url, expectedErrorName) => {
        const request = new Request(url);
        const result = await provider.completeSignin(
          request,
          mockOAuthState,
          'https://myapp.com',
        );

        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr().name).toBe(expectedErrorName);
      });

      test('should return error when token exchange fails', async () => {
        const request = new Request(
          'https://myapp.com/api/auth/callback/google?code=auth-code&state=test-state',
        );

        vi.mocked(exchangeAuthorizationCodeForTokens).mockReturnValue(
          errAsync(new Error('Network error')),
        );

        const result = await provider.completeSignin(
          request,
          mockOAuthState,
          'https://myapp.com',
        );

        expect((await result).isErr()).toBe(true);
        expect(exchangeAuthorizationCodeForTokens).toHaveBeenCalledTimes(1);
      });

      test('should return an error when ID token decoding fails', async () => {
        const request = new Request(
          'https://myapp.com/api/auth/callback/google?code=auth-code&state=test-state',
        );

        // Token exchange succeeds
        vi.mocked(exchangeAuthorizationCodeForTokens).mockReturnValue(
          okAsync(mockTokenResponse),
        );

        // Token decoding fails
        vi.mocked(decodeGoogleIdToken).mockReturnValue(
          err(new DecodeGoogleIdTokenError()),
        );

        const result = await provider.completeSignin(
          request,
          mockOAuthState,
          'https://myapp.com',
        );

        expect(result.isErr()).toBe(true);

        expect(decodeGoogleIdToken).toHaveBeenCalledWith('valid-id-token');
      });

      test('should return user claims on successful sign in', async () => {
        const request = new Request(
          'https://myapp.com/api/auth/callback/google?code=auth-code&state=test-state',
        );

        vi.mocked(exchangeAuthorizationCodeForTokens).mockReturnValue(
          okAsync(mockTokenResponse),
        );
        vi.mocked(decodeGoogleIdToken).mockReturnValue(ok(mockUserClaims));

        const result = await provider.completeSignin(
          request,
          mockOAuthState,
          'https://myapp.com',
        );

        expect(result.isOk()).toBe(true);
        expect(result._unsafeUnwrap()).toEqual(mockUserClaims);

        expect(exchangeAuthorizationCodeForTokens).toHaveBeenCalledWith({
          code: 'auth-code',
          clientId: 'test-client-id',
          clientSecret: 'test-client-secret',
          redirectUri: 'https://myapp.com/api/auth/callback/google',
          codeVerifier: 'test-code-verifier',
        });
      });
    });

    // --------------------------------------------
    // Execute user's onAuthenticated callback
    // --------------------------------------------
    describe('onAuthenticated', () => {
      const mockUserClaims: GoogleUserClaims = {
        aud: 'test-client-id',
        exp: 12345,
        iat: 12345,
        iss: 'https://accounts.google.com',
        sub: '123456789',
        email: 'test@example.com',
        name: 'Test User',
      };

      test('should call the user callback with user claims', async () => {
        const mockSessionData = { id: 'user-1', email: 'test@example.com' };

        vi.mocked(
          mockConfig.onAuthentication.createGoogleUser,
        ).mockResolvedValue(mockSessionData);

        const result = await provider.onAuthenticated(mockUserClaims);

        expect(result.isOk()).toBe(true);
        expect(
          mockConfig.onAuthentication.createGoogleUser,
        ).toHaveBeenCalledWith(mockUserClaims);
        expect(result._unsafeUnwrap()).toEqual(mockSessionData);
      });

      test('should wrap erros when user callback throws', async () => {
        vi.mocked(
          mockConfig.onAuthentication.createGoogleUser,
        ).mockRejectedValue(new Error('Database Error'));

        const result = await provider.onAuthenticated(mockUserClaims);

        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr().name).toBe(
          'OnAuthenticatedCallbackError',
        );
      });
    });
  });
});
