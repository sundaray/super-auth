import { GoogleProvider } from './provider.js';
import type { GoogleProviderConfig } from './types.js';
import type { OAuthProvider } from '../types.js';

export function Google(config: GoogleProviderConfig): OAuthProvider {
  return new GoogleProvider(config);
}

export type { GoogleProviderConfig };
