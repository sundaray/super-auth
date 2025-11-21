import { SuperAuthError } from '../core/errors.js';

export class FetchUserSessionError extends SuperAuthError {
  constructor(options: { message?: string; cause?: unknown } = {}) {
    super({
      message: options.message || 'Failed to fetch user session',
      cause: options.cause,
    });
    this.name = 'FetchUserSessionError';
  }
}

export class MissingUserSessionProviderError extends SuperAuthError {
  constructor(options: { message?: string } = {}) {
    super({
      message:
        options.message ||
        'useUserSession must be used within a UserSessionProvider.',
    });
    this.name = 'MissingUserSessionProviderError';
  }
}
