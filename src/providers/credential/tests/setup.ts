import { vi, type Mock } from 'vitest';
import type { CredentialProviderConfig } from '../types';

// ============================================
// MOCK CONFIG FACTORY
// ============================================

export interface MockCredentialProviderConfig extends CredentialProviderConfig {
  onSignUp: {
    checkCredentialUserExists: Mock;
    sendVerificationEmail: Mock;
    createCredentialUser: Mock;
    redirects: {
      signUpSuccess: `/${string}`;
      emailVerificationSuccess: `/${string}`;
      emailVerificationError: `/${string}`;
    };
  };
  onSignIn: {
    getCredentialUser: Mock;
  };
  onPasswordReset: {
    checkCredentialUserExists: Mock;
    sendPasswordResetEmail: Mock;
    updatePassword: Mock;
    sendPasswordUpdateEmail: Mock;
    redirects: {
      forgotPasswordSuccess: `/${string}`;
      tokenVerificationSuccess: `/${string}`;
      tokenVerificationError: `/${string}`;
      resetPasswordSuccess: `/${string}`;
    };
  };
}

export function createMockCredentialProviderConfig(): MockCredentialProviderConfig {
  return {
    onSignUp: {
      checkCredentialUserExists: vi.fn(),
      sendVerificationEmail: vi.fn(),
      createCredentialUser: vi.fn(),
      redirects: {
        signUpSuccess: '/check-email',
        emailVerificationSuccess: '/sign-in',
        emailVerificationError: '/sign-up/error',
      },
    },
    onSignIn: {
      getCredentialUser: vi.fn(),
    },
    onPasswordReset: {
      checkCredentialUserExists: vi.fn(),
      sendPasswordResetEmail: vi.fn(),
      updatePassword: vi.fn(),
      sendPasswordUpdateEmail: vi.fn(),
      redirects: {
        forgotPasswordSuccess: '/check-email',
        tokenVerificationSuccess: '/reset-password',
        tokenVerificationError: '/forgot-password/error',
        resetPasswordSuccess: '/sign-in',
      },
    },
  };
}

// ============================================
// COMMON TEST DATA
// ============================================

export const testSecret = 'test-secret-base64-encoded';
export const testBaseUrl = 'https://myapp.com';

export const testUserData = {
  email: 'test@example.com',
  password: 'securePassword123',
};

export const testUserDataWithAdditionalFields = {
  email: 'test@example.com',
  password: 'securePassword123',
  name: 'Test User',
  company: 'Acme Corp',
};

export const mockHashedPassword = 'hashed-password-value';

export const mockUserSession = {
  id: 'user-123',
  email: 'test@example.com',
  name: 'Test User',
  hashedPassword: mockHashedPassword,
};

export const mockToken = 'mock-jwt-token-value';

export const mockVerificationUrl =
  'https://myapp.com/api/auth/verify-email?token=mock-jwt-token-value';

export const mockPasswordResetUrl =
  'https://myapp.com/api/auth/verify-password-reset-token?token=mock-jwt-token-value';

// ============================================
// HELPER TO CREATE MOCK REQUEST
// ============================================

export function createMockRequest(url: string): Request {
  return new Request(url);
}
