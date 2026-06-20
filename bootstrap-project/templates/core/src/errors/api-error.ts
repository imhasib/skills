/**
 * Operational error thrown by controllers/services. The error-handler middleware
 * converts these to the flat error JSON: `{ code, message, details?, requestId }`.
 * Anything else thrown becomes 500 INTERNAL_ERROR with no leaked internals.
 */
export class ApiError extends Error {
  readonly code: string;
  readonly statusCode: number;
  readonly details?: Record<string, unknown> | undefined;

  constructor(
    code: string,
    message: string,
    statusCode = 400,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}
