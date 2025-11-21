import { SuperAuthError } from '../../core/errors.js';

export class EncodeClientCredentialsError extends SuperAuthError {
  constructor(options: { message?: string; cause?: unknown } = {}) {
    super({
      message: options.message || 'Failed to encode client credentials',
      cause: options.cause,
    });
    this.name = 'EncodeClientCredentialsError';
  }
}

export class TokenFetchError extends SuperAuthError {
  constructor(options: { message?: string; cause?: unknown } = {}) {
    super({
      message: options.message || 'Failed to fetch tokens from provider',
      cause: options.cause,
    });
    this.name = 'TokenFetchError';
  }
}

export class TokenResponseError extends SuperAuthError {
  public status?: number;
  public statusText?: string;

  constructor(
    options: {
      message?: string;
      cause?: unknown;
      status?: number;
      statusText?: string;
    } = {},
  ) {
    super({
      message: options.message || 'Token endpoint returned an error response',
      cause: options.cause,
    });
    this.name = 'TokenResponseError';
    this.status = options.status;
    this.statusText = options.statusText;
  }
}

export class TokenParseError extends SuperAuthError {
  constructor(options: { message?: string; cause?: unknown } = {}) {
    super({
      message: options.message || 'Failed to parse token response',
      cause: options.cause,
    });
    this.name = 'TokenParseError';
  }
}

export class DecodeGoogleIdTokenError extends SuperAuthError {
  constructor(options: { message?: string; cause?: unknown } = {}) {
    super({
      message: options.message || 'Failed to decode Google ID token.',
      cause: options.cause,
    });
    this.name = 'DecodeGoogleIdTokenError';
  }
}
