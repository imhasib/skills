import type { Request, Response, NextFunction, RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { ApiError } from '../errors/api-error.js';
import { ErrorCodes } from '../errors/codes.js';
import { config } from '../config.js';
import { logger } from '../logger.js';

interface JwtPayload {
  userId?: string;
  email?: string;
  name?: string;
  role?: string;
  iat?: number;
  exp?: number;
  iss?: string;
  aud?: string;
}

/**
 * Verify a Bearer JWT issued by user-service (HS256).
 *
 * user-service signs tokens with `{ userId, email, name, role }` and sets
 * `iss=karigor` / `aud=karigor-users` (configurable via JWT_ISSUER /
 * JWT_AUDIENCE). The same three env vars must be set here so verification
 * matches. Sets `req.user = { userId, role, ... }`.
 */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.header('authorization');
  if (!header) {
    throw new ApiError(ErrorCodes.AUTH_MISSING_TOKEN, 'Authorization header is required', 401);
  }

  const [scheme, token] = header.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    throw new ApiError(
      ErrorCodes.AUTH_TOKEN_INVALID,
      'Expected "Authorization: Bearer <token>"',
      401,
    );
  }

  let payload: JwtPayload;
  try {
    payload = jwt.verify(token, config.jwt.secret, {
      algorithms: ['HS256'],
      issuer: config.jwt.issuer,
      audience: config.jwt.audience,
    }) as JwtPayload;
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      throw new ApiError(ErrorCodes.AUTH_TOKEN_EXPIRED, 'Access token expired', 401);
    }
    throw new ApiError(ErrorCodes.AUTH_TOKEN_INVALID, 'Invalid access token', 401);
  }

  if (!payload.userId || typeof payload.userId !== 'string') {
    throw new ApiError(ErrorCodes.AUTH_TOKEN_INVALID, 'JWT missing userId claim', 401);
  }
  if (!payload.role || typeof payload.role !== 'string') {
    throw new ApiError(ErrorCodes.AUTH_TOKEN_INVALID, 'JWT missing role claim', 401);
  }

  req.user = {
    userId: payload.userId,
    role: payload.role,
    email: payload.email,
    name: payload.name,
  };
  next();
}

/**
 * Role-gated authorization placeholder. Apply AFTER `requireAuth`.
 * Real membership/role lookup lands when the firm/membership module ships.
 */
export function requireRole(roles: string[]): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new ApiError(ErrorCodes.AUTH_MISSING_TOKEN, 'Not authenticated', 401);
    }
    logger.debug(
      { requestId: req.requestId, requiredRoles: roles, userId: req.user.userId },
      'requireRole: membership resolution lands with feature modules',
    );
    next();
  };
}
