import type { Request, Response, NextFunction, RequestHandler } from 'express';
import type { Schema, ValidationError } from 'joi';
import { ApiError } from '../errors/api-error.js';
import { ErrorCodes } from '../errors/codes.js';

export interface ValidateSchemas {
  body?: Schema;
  query?: Schema;
  params?: Schema;
}

/**
 * Run Joi schemas against any combination of req.body, req.query, req.params.
 * On failure, throws `400 VALIDATION_FAILED` with a structured `details.fields`
 * map keyed by field path.
 *
 *   router.post('/', validate({ body: createSchema }), controller.create);
 */
export function validate(schemas: ValidateSchemas): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const fields: Record<string, string> = {};

    for (const source of ['body', 'query', 'params'] as const) {
      const schema = schemas[source];
      if (!schema) continue;
      const result = schema.validate(req[source], {
        abortEarly: false,
        stripUnknown: true,
        convert: true,
      }) as { value: unknown; error?: ValidationError };
      if (result.error) {
        Object.assign(fields, joiToFieldMap(result.error, source));
      } else {
        // Replace with the coerced/stripped value
        if (source === 'query') {
          // Express 4 query is read-only in some cases; assign properties
          (req as unknown as Record<string, unknown>).query = result.value;
        } else if (source === 'body') {
          req.body = result.value;
        } else {
          (req as unknown as Record<string, unknown>).params = result.value;
        }
      }
    }

    if (Object.keys(fields).length > 0) {
      throw new ApiError(ErrorCodes.VALIDATION_FAILED, 'Request validation failed', 400, {
        fields,
      });
    }

    next();
  };
}

function joiToFieldMap(error: ValidationError, source: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const detail of error.details) {
    const path = detail.path.length > 0 ? detail.path.join('.') : source;
    const key = `${source}.${path}`;
    out[key] ??= detail.message.replace(/"/g, '');
  }
  return out;
}
