/**
 * Typed wrapper for backend error responses.
 *
 * Backend error body is **flat** — `{ code, message, details?, requestId? }`.
 * Discriminate specific errors via `code`; never parse `message`.
 */
export class ApiError extends Error {
  constructor(
    public readonly code: string,
    public override readonly message: string,
    public readonly statusCode: number,
    public readonly details?: Record<string, unknown>,
    public readonly requestId?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  static async fromResponse(res: Response): Promise<ApiError> {
    let code = 'UNKNOWN_ERROR';
    let message = res.statusText || 'Request failed';
    let details: Record<string, unknown> | undefined;
    let requestId: string | undefined;

    try {
      const body = (await res.json()) as {
        code?: unknown;
        message?: unknown;
        details?: unknown;
        requestId?: unknown;
      };
      if (typeof body.code === 'string') code = body.code;
      if (typeof body.message === 'string') message = body.message;
      if (body.details && typeof body.details === 'object') {
        details = body.details as Record<string, unknown>;
      }
      if (typeof body.requestId === 'string') requestId = body.requestId;
    } catch {
      // Response body was not JSON; fall back to the defaults above.
    }

    return new ApiError(code, message, res.status, details, requestId);
  }
}
