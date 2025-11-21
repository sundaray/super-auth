import { SuperAuthError } from '../errors';

export class HashPasswordError extends SuperAuthError {
  constructor(options: { message?: string; cause?: unknown } = {}) {
    super({
      message: options.message || 'Failed to hash password',
      cause: options.cause,
    });
    this.name = 'HashPasswordError';
  }
}

export class VerifyPasswordError extends SuperAuthError {
  constructor(options: { message?: string; cause?: unknown } = {}) {
    super({
      message: options.message || 'Failed to verify password',
      cause: options.cause,
    });
    this.name = 'VerifyPasswordError';
  }
}

export class InvalidPasswordHashFormatError extends SuperAuthError {
  constructor(options: { message?: string; cause?: unknown } = {}) {
    super({
      message: options.message || 'Invalid password hash format.',
      cause: options.cause,
    });
    this.name = 'InvalidPasswordHashFormatError';
  }
}
