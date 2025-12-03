import { vi, type Mock } from 'vitest';
import type { OAuthProvider, CredentialProvider } from '../../providers/types';
import type { CredentialProviderConfig } from '../../providers/credential/types';
import type { AuthConfig } from '../../types';
import type { SessionStorage } from '../session/types';
import type { User, UserSessionPayload } from '../session/types';

// ============================================
// MOCK CONFIG
// ============================================
export const mockConfig: AuthConfig = {
  baseUrl: 'https://myapp.com',
  session: {
    secret: 'test-secret-key-base64-encoded-value',
    maxAge: 3600,
  },
  providers: [],
};

// ============================================
// MOCK PROVIDERS
// ============================================

export function createMockOAuthProvider(): OAuthProvider {
  return {
    id: 'google',
    type: 'oauth',
    getAuthorizationUrl: vi.fn(),
    completeSignin: vi.fn(),
    onAuthenticated: vi.fn(),
    getErrorRedirectPath: vi.fn().mockReturnValue('/auth/error'),
  };
}
export function createMockCredentialProvider(): CredentialProvider {
  return {
    id: 'credential',
    type: 'credential',
    config: {} as CredentialProviderConfig,
    signUp: vi.fn(),
    signIn: vi.fn(),
    verifyEmail: vi.fn(),
    forgotPassword: vi.fn(),
    resetPassword: vi.fn(),
    verifyPasswordResetToken: vi.fn(),
  };
}

// ============================================
// MOCK SESSION STORAGE
// ============================================
interface MockSessionStorage<TContext> extends SessionStorage<TContext> {
  getSession: Mock;
  saveSession: Mock;
  deleteSession: Mock;
}

export function createMockSessionStorage<
  TContext,
>(): MockSessionStorage<TContext> {
  return {
    getSession: vi.fn(),
    saveSession: vi.fn(),
    deleteSession: vi.fn(),
  };
}

// ============================================
// MOCK SERVICE CLASSES
// ============================================

interface MockProviderRegistry {
  get: Mock;
  getCredentialProvider: Mock;
  getAllOAuthProviders: Mock;
}

interface MockOAuthService {
  initiateSignIn: Mock;
  completeSignIn: Mock;
}

interface MockCredentialService {
  signIn: Mock;
  signUp: Mock;
  verifyEmail: Mock;
  forgotPassword: Mock;
  resetPassword: Mock;
  verifyPasswordResetToken: Mock;
}

interface MockSessionService {
  createSession: Mock;
  getSession: Mock;
  deleteSession: Mock;
}

export function createMockProviderRegistry(): MockProviderRegistry {
  return {
    get: vi.fn(),
    getCredentialProvider: vi.fn(),
    getAllOAuthProviders: vi.fn(),
  };
}

export function createMockOAuthService(): MockOAuthService {
  return {
    initiateSignIn: vi.fn(),
    completeSignIn: vi.fn(),
  };
}

export function createMockCredentialService(): MockCredentialService {
  return {
    signUp: vi.fn(),
    signIn: vi.fn(),
    verifyEmail: vi.fn(),
    forgotPassword: vi.fn(),
    verifyPasswordResetToken: vi.fn(),
    resetPassword: vi.fn(),
  };
}

export function createMockSessionService(): MockSessionService {
  return {
    createSession: vi.fn(),
    getSession: vi.fn(),
    deleteSession: vi.fn(),
  };
}

// ============================================
// MOCK DATA
// ============================================
export const mockUserSessionPayload: UserSessionPayload = {
  user: {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
  },
  provider: 'google',
};

export const mockUser: User = {
  id: 'user-123',
  email: 'test@example.com',
  name: 'Test User',
};

// ============================================
// TEST CONTEXT
// ============================================
export type TestContext = undefined;
export const testContext: TestContext = undefined;
