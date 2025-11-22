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
export class GeneratePasswordResetTokenError extends SuperAuthError {
  constructor(options: { message?: string; cause?: unknown } = {}) {
    super({
      message: options.message || 'Failed to generate password reset token.',
      cause: options.cause,
    });
    this.name = 'GeneratePasswordResetTokenError';
  }
}

export class BuildPasswordResetUrlError extends SuperAuthError {
  constructor(options: { message?: string; cause?: unknown } = {}) {
    super({
      message: options.message || 'Failed to build password reset URL.',
      cause: options.cause,
    });
    this.name = 'BuildPasswordResetUrlError';
  }
}

export class InvalidPasswordResetTokenError extends SuperAuthError {
  constructor(options: { message?: string; cause?: unknown } = {}) {
    super({
      message: options.message || 'Invalid password reset token.',
      cause: options.cause,
    });
    this.name = 'InvalidPasswordResetTokenError';
  }
}

export class PasswordResetTokenAlreadyUsedError extends SuperAuthError {
  constructor(options: { message?: string; cause?: unknown } = {}) {
    super({
      message: options.message || 'Password reset token has already been used.',
      cause: options.cause,
    });
    this.name = 'PasswordResetTokenAlreadyUsedError';
  }
}

export class VerifyPasswordResetTokenError extends SuperAuthError {
  constructor(options: { message?: string; cause?: unknown } = {}) {
    super({
      message: options.message || 'Failed to verify password reset token.',
      cause: options.cause,
    });
    this.name = 'VerifyPasswordresetTokenError';
  }
}
