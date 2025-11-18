/**
 * API Response Utilities
 * Provides consistent response formatting across all endpoints
 */

import { Response } from 'express';
import { ApiSuccessResponse, ApiErrorResponse } from '../types/m365Api.types';

/**
 * Send successful API response
 */
export function sendSuccess<T>(
  res: Response,
  data: T,
  meta?: any,
  statusCode: number = 200
): void {
  const response: ApiSuccessResponse<T> = {
    success: true,
    data,
    ...(meta && { meta }),
  };

  res.status(statusCode).json(response);
}

/**
 * Send error API response
 */
export function sendError(
  res: Response,
  code: string,
  message: string,
  details?: any,
  statusCode: number = 400
): void {
  const response: ApiErrorResponse = {
    success: false,
    error: {
      code,
      message,
      ...(details && { details }),
    },
  };

  res.status(statusCode).json(response);
}

/**
 * Send validation error response
 */
export function sendValidationError(
  res: Response,
  message: string,
  details?: any
): void {
  sendError(res, 'VALIDATION_ERROR', message, details, 400);
}

/**
 * Send not found error response
 */
export function sendNotFoundError(
  res: Response,
  resource: string,
  id?: string
): void {
  const message = id
    ? `${resource} with ID '${id}' not found`
    : `${resource} not found`;
  sendError(res, 'NOT_FOUND', message, undefined, 404);
}

/**
 * Send internal server error response
 */
export function sendServerError(
  res: Response,
  error: Error,
  context?: string
): void {
  console.error(`Server error${context ? ` (${context})` : ''}:`, error);

  const message = process.env.NODE_ENV === 'production'
    ? 'An internal server error occurred'
    : error.message;

  sendError(
    res,
    'INTERNAL_ERROR',
    message,
    process.env.NODE_ENV !== 'production' ? { stack: error.stack } : undefined,
    500
  );
}
