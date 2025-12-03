import { LucidAuthError } from '../errors.js';

export class AuthorizationCodeNotFoundError extends LucidAuthError {
  constructor(options: { message?: string; cause?: unknown } = {}) {
    super({
      message: options.message || 'Missing authorization code in URL.',
      cause: options.cause,
    });
    this.name = 'AuthorizationCodeNotFoundError';
  }
}

export class StateNotFoundError extends LucidAuthError {
  constructor(options: { message?: string; cause?: unknown } = {}) {
    super({
      message: options.message || 'Missing state in URL.',
      cause: options.cause,
    });
    this.name = 'StateNotFoundError';
  }
}

export class OAuthStateCookieNotFoundError extends LucidAuthError {
  constructor(options: { message?: string; cause?: unknown } = {}) {
    super({
      message: options.message || 'OAuth state cookie not found',
      cause: options.cause,
    });
    this.name = 'OAuthStateCookieNotFoundError';
  }
}

export class StateMismatchError extends LucidAuthError {
  constructor(options: { message?: string; cause?: unknown } = {}) {
    super({
      message: options.message || 'State parameter mismatch.',
      cause: options.cause,
    });
    this.name = 'StateMismatchError';
  }
}

export class InvalidTokenPayloadError extends LucidAuthError {
  constructor(options: { message?: string; cause?: unknown } = {}) {
    super({
      message: options.message || 'Invalid token payload.',
      cause: options.cause,
    });
    this.name = 'InvalidTokenPayloadError';
  }
}

export class EncryptOAuthStatePayloadError extends LucidAuthError {
  constructor(options: { message?: string; cause?: unknown } = {}) {
    super({
      message: options.message || 'Failed to encrypt OAuth state payload.',
      cause: options.cause,
    });
    this.name = 'EncryptOAuthStatePayloadError';
  }
}

export class CreateAuthorizationUrlError extends LucidAuthError {
  constructor(options: { message?: string; cause?: unknown } = {}) {
    super({
      message: options.message || 'Failed to create authorization URL.',
      cause: options.cause,
    });
    this.name = 'CreateAuthorizationUrlError';
  }
}

export class ProviderNotFoundError extends LucidAuthError {
  constructor(options: { providerId: string; cause?: unknown }) {
    super({
      message: `'${options.providerId}' provider was not found.`,
      cause: options.cause,
    });
    this.name = 'ProviderNotFoundError';
  }
}

export class InvalidProviderTypeError extends LucidAuthError {
  constructor(options: { providerId: string; cause?: unknown }) {
    super({
      message: `'${options.providerId}' provider type is not supported.`,
      cause: options.cause,
    });
    this.name = 'InvalidProviderTypeError';
  }
}

export class ExpiredOAuthStateError extends LucidAuthError {
  constructor(options: { message?: string; cause?: unknown } = {}) {
    super({
      message: options.message || 'OAuth state has expired.',
      cause: options.cause,
    });
    this.name = 'ExpiredOAuthStateError';
  }
}

export class InvalidOAuthStateError extends LucidAuthError {
  constructor(options: { message?: string; cause?: unknown } = {}) {
    super({
      message: options.message || 'Invalid OAuth state.',
      cause: options.cause,
    });
    this.name = 'InvalidOAuthStateError';
  }
}
