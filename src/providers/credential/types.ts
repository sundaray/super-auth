export interface User {
  email?: string | null;
  name?: string | null;
  image?: string | null;
  role?: string | null;
  [key: string]: unknown;
}

export interface CredentialProviderConfig {
  onSignUp: {
    checkUserExists(email: string): Promise<{ exists: boolean }>;
    sendVerificationEmail(params: {
      email: string;
      url: string;
    }): Promise<void>;
    createUser(data: {
      email: string;
      hashedPassword: string;
      [key: string]: unknown;
    }): Promise<void>;
    redirects: {
      checkEmail: `/${string}`;
      emailVerificationSuccess: `/${string}`;
      emailVerificationError: `/${string}`;
    };
  };
  onSignIn(data: {
    email: string;
  }): Promise<(User & { hashedPassword: string }) | null>;

  onPasswordReset: {
    checkUserExists(params: {
      email: string;
    }): Promise<{ exists: false } | { exists: true; passwordHash: string }>;
    sendPasswordResetEmail(params: {
      email: string;
      url: string;
    }): Promise<void>;
    updatePassword(params: {
      email: string;
      hashedPassword: string;
    }): Promise<void>;
    sendPasswordUpdatedEmail(params: { email: string }): Promise<void>;
    redirects: {
      checkEmail: `/${string}`;
      resetForm: `/${string}`;
      resetPasswordSuccess: `/${string}`;
      resetPasswordError: `/${string}`;
    };
  };
}
