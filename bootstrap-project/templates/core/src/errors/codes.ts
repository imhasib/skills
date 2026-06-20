/**
 * Canonical error code taxonomy. SCREAMING_SNAKE_CASE.
 *
 * Codes are part of the public API contract — never rename, only deprecate.
 * Add domain-specific codes alongside their feature module if they don't fit
 * the universal categories here.
 */
export const ErrorCodes = {
  // Generic
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  CONFLICT: 'CONFLICT',

  // API contract
  MISSING_API_VERSION: 'MISSING_API_VERSION',
  UNSUPPORTED_API_VERSION: 'UNSUPPORTED_API_VERSION',

  // Auth
  AUTH_MISSING_TOKEN: 'AUTH_MISSING_TOKEN',
  AUTH_TOKEN_EXPIRED: 'AUTH_TOKEN_EXPIRED',
  AUTH_TOKEN_INVALID: 'AUTH_TOKEN_INVALID',
  AUTH_FORBIDDEN: 'AUTH_FORBIDDEN',

  // Rate limiting / idempotency
  RATE_LIMITED: 'RATE_LIMITED',
  IDEMPOTENCY_KEY_CONFLICT: 'IDEMPOTENCY_KEY_CONFLICT',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];
