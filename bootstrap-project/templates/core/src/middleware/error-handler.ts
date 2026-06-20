import type { Request, Response, NextFunction } from 'express';
import { ApiError } from '../errors/api-error.js';
import { ErrorCodes } from '../errors/codes.js';
import { logger } from '../logger.js';

/**
 * Final middleware. Converts thrown errors into the flat error JSON:
 *   { code, message, details?, requestId }
 *
 * No `success` field, no `error` wrapper — HTTP status carries success/failure.
 * Unknown errors become `500 INTERNAL_ERROR` and DO NOT leak internals/stacks.
 */
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof ApiError) {
    logger.warn(
      { requestId: req.requestId, code: err.code, statusCode: err.statusCode },
      err.message,
    );
    res.status(err.statusCode).json({
      code: err.code,
      message: err.message,
      ...(err.details ? { details: err.details } : {}),
      requestId: req.requestId,
    });
    return;
  }

  logger.error({ requestId: req.requestId, err }, 'Unhandled error');
  res.status(500).json({
    code: ErrorCodes.INTERNAL_ERROR,
    message: 'Something went wrong',
    requestId: req.requestId,
  });
}
