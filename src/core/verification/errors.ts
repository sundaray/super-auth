import { SuperAuthError } from '../errors.js';

export class GenerateEmailVerificationTokenError extends SuperAuthError {
  constructor(options: { message?: string; cause?: unknown } = {}) {
    super({
      message:
        options.message || 'Failed to generate email verification token.',
      cause: options.cause,
    });
    this.name = 'GenerateEmailVerificationTokenError';
  }
}

export class VerifyEmailVerificationTokenError extends SuperAuthError {
  constructor(options: { message?: string; cause?: unknown } = {}) {
    super({
      message: options.message || 'Failed to verify email verification token.',
      cause: options.cause,
    });
    this.name = 'VerifyEmailVerificationTokenError';
  }
}

export class ExpiredEmailVerificationTokenError extends SuperAuthError {
  constructor(options: { message?: string; cause?: unknown } = {}) {
    super({
      message: options.message || 'Email verification token has expired.',
      cause: options.cause,
    });
    this.name = 'ExpiredEmailVerificationTokenError';
  }
}

export class InvalidEmailVerificationTokenError extends SuperAuthError {
  constructor(options: { message?: string; cause?: unknown } = {}) {
    super({
      message: options.message || 'Invalid email verification token.',
      cause: options.cause,
    });
    this.name = 'InvalidEmailVerificationTokenError';
  }
}

export class BuildEmailVerificationUrlError extends SuperAuthError {
  constructor(options: { message?: string; cause?: unknown } = {}) {
    super({
      message: options.message || 'Failed to build email verification URL.',
      cause: options.cause,
    });
    this.name = 'BuildEmailVerificationUrlError';
  }
}
