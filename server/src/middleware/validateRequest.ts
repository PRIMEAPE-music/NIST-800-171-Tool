/**
 * Request Validation Middleware
 * Uses Zod schemas to validate request data
 */

import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';
import { sendValidationError } from '../utils/apiResponse';

/**
 * Validate request body against Zod schema
 */
export function validateBody<T extends ZodSchema>(schema: T) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        sendValidationError(res, 'Invalid request body', {
          errors: error.errors.map(e => ({
            path: e.path.join('.'),
            message: e.message,
          })),
        });
      } else {
        sendValidationError(res, 'Request validation failed');
      }
    }
  };
}

/**
 * Validate request query parameters against Zod schema
 */
export function validateQuery<T extends ZodSchema>(schema: T) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.query = schema.parse(req.query) as any;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        sendValidationError(res, 'Invalid query parameters', {
          errors: error.errors.map(e => ({
            path: e.path.join('.'),
            message: e.message,
          })),
        });
      } else {
        sendValidationError(res, 'Query validation failed');
      }
    }
  };
}

/**
 * Validate request params against Zod schema
 */
export function validateParams<T extends ZodSchema>(schema: T) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.params = schema.parse(req.params);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        sendValidationError(res, 'Invalid URL parameters', {
          errors: error.errors.map(e => ({
            path: e.path.join('.'),
            message: e.message,
          })),
        });
      } else {
        sendValidationError(res, 'Parameter validation failed');
      }
    }
  };
}
