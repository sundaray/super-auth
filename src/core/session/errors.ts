import { SuperAuthError } from '../errors.js';

export class DeleteOauthStateCookieError extends SuperAuthError {
  constructor(options: { message?: string; cause?: unknown }) {
    super({
      message: options.message || 'Failed to delete the OAuth state cookie.',
      cause: options.cause,
    });
    this.name = 'DeleteOauthStateCookieError';
  }
}

export class EncryptUserSessionPayloadError extends SuperAuthError {
  constructor(options: { message?: string; cause?: unknown } = {}) {
    super({
      message: options.message || 'Failed to encrypt user session payload.',
      cause: options.cause,
    });
    this.name = 'EncryptUserSessionPayloadError';
  }
}

export class DecryptUserSessionError extends SuperAuthError {
  constructor(options: { message?: string; cause?: unknown } = {}) {
    super({
      message: options.message || 'Failed to decrypt user session JWE.',
      cause: options.cause,
    });
    this.name = 'DecryptUserSessionJweError';
  }
}

export class RunOAuthProviderSignInCallbackError extends SuperAuthError {
  constructor(options: { message?: string; cause?: unknown } = {}) {
    super({
      message:
        options.message || 'Failed to run OAuth provider sign-in callback.',
      cause: options.cause,
    });
    this.name = 'RunOAuthProviderSignInCallbackError';
  }
}

export class CreateUserSessionPayloadError extends SuperAuthError {
  constructor(options: { message?: string; cause?: unknown } = {}) {
    super({
      message: options.message || 'Failed to create user session payload.',
      cause: options.cause,
    });
    this.name = 'CreateUserSessionPayloadError';
  }
}

export class OnSignInCallbackError extends SuperAuthError {
  constructor(options: { message?: string; cause?: unknown } = {}) {
    super({
      message: options.message || 'User onSignIn callback failed to execute.',
      cause: options.cause,
    });
    this.name = 'OnSignInCallbackError';
  }
}

export class SetUserSessionCookieError extends SuperAuthError {
  constructor(options: { message?: string; cause?: unknown } = {}) {
    super({
      message: options.message || 'Failed to set the user session cookie.',
      cause: options.cause,
    });
    this.name = 'SetUserSessionCookieError';
  }
}

export class GetUserSessionError extends SuperAuthError {
  constructor(options: { message?: string; cause?: unknown } = {}) {
    super({
      message: options.message || 'Failed to get user session.',
      cause: options.cause,
    });
    this.name = 'GetUserSessionError';
  }
}

export class SaveUserSessionError extends SuperAuthError {
  constructor(options: { message?: string; cause?: unknown } = {}) {
    super({
      message: options.message || 'Failed to save user session.',
      cause: options.cause,
    });
    this.name = 'SaveUserSessionError';
  }
}

export class DeleteUserSessionError extends SuperAuthError {
  constructor(options: { message?: string; cause?: unknown } = {}) {
    super({
      message: options.message || 'Failed to delete user session.',
      cause: options.cause,
    });
    this.name = 'DeleteUserSessionError';
  }
}
