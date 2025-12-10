// -------------------------------------------
// COOKIE CONFIGURATION
// -------------------------------------------

const isProduction = process.env.NODE_ENV === 'production';

const COOKIE_PREFIX = isProduction ? '__Host-lucid_auth' : 'lucid_auth';

export const COOKIE_NAMES = {
  USER_SESSION: `${COOKIE_PREFIX}.user_session`,
  OAUTH_STATE: `${COOKIE_PREFIX}.oauth_state`,
} as const;

export const OAUTH_STATE_MAX_AGE = 60 * 10; // 10 minutes

// -------------------------------------------
// EMAIL VERIFICATION
// -------------------------------------------

export const EMAIL_VERIFICATION_TOKEN_EXPIRES_IN = 60 * 30; // 30 minutes
export const PASSWORD_RESET_TOKEN_EXPIRES_IN = 60 * 30; // 30 minutes

export const AUTH_ROUTES = {
  VERIFY_EMAIL: '/api/auth/verify-email',
  VERIFY_PASSWORD_RESET_TOKEN: '/api/auth/verify-password-reset-token',
  CALLBACK: '/api/auth/callback',
} as const;
