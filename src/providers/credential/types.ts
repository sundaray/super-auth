import type { UserSession } from '../../core/session/types.js';

export interface User {
  email?: string | null;
  name?: string | null;
  image?: string | null;
  role?: string | null;
  [key: string]: unknown;
}

export type CheckUserExists =
  | { exists: false }
  | { exists: true; passwordHash: string };

export interface CredentialProviderConfig {
  onSignUp: {
    checkUserExists(email: string): Promise<boolean>;
    sendVerificationEmail(params: {
      email: string;
      url: string;
    }): Promise<void>;
    createUser(data: {
      email: string;
      hashedPassword: string;
      [key: string]: unknown;
    }): Promise<UserSession>;
  };
  onSignIn(data: {
    email: string;
  }): Promise<(User & { hashedPassword: string }) | null>;

  onPasswordReset: {
    checkUserExists(params: { email: string }): Promise<CheckUserExists>;
    sendPasswordResetEmail(params: {
      email: string;
      url: string;
    }): Promise<void>;
    updatePassword(params: {
      email: string;
      hashedPassword: string;
    }): Promise<void>;
    sendPasswordChangeEmail(params: { email: string }): Promise<void>;
    verifyPasswordResetTokenPath: string;
    redirects: {
      checkEmail: `/${string}`;
      resetForm: `/${string}`;
      resetPasswordSuccess: `/${string}`;
      resetPasswordError: `/${string}`;
    };
  };
}
