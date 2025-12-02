import { LucidAuthError } from '../errors';

export class ProviderNotFoundError extends LucidAuthError {
  constructor(options: { providerId: string; cause?: unknown }) {
    super({
      message: `Provider '${options.providerId}' not found.`,
      cause: options.cause,
    });
    this.name = 'ProviderNotFoundError';
  }
}
