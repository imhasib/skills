import type { Request, Response, NextFunction } from 'express';
import { newId } from '../lib/ulid.js';

/**
 * Attach a requestId to every request. Honors an inbound X-Request-Id (when it
 * looks safe) for cross-service tracing; otherwise mints a new prefixed id.
 * Echoed in `X-Request-Id` response header and embedded in logs + error bodies.
 */
export function requestId(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.header('x-request-id');
  req.requestId = incoming && /^[\w.-]+$/.test(incoming) ? incoming : newId('req');
  res.setHeader('X-Request-Id', req.requestId);
  next();
}
