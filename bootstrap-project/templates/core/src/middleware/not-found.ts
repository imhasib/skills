import type { Request, Response, NextFunction } from 'express';
import { ApiError } from '../errors/api-error.js';
import { ErrorCodes } from '../errors/codes.js';

/**
 * Catch-all 404. Mount AFTER all route handlers. The error-handler converts
 * the thrown ApiError into the flat error JSON.
 */
export function notFound(req: Request, _res: Response, _next: NextFunction): void {
  throw new ApiError(
    ErrorCodes.NOT_FOUND,
    `No route matches ${req.method} ${req.path}`,
    404,
  );
}
