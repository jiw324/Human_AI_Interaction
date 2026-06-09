/**
 * Global error handling: a typed `AppError` for expected/operational
 * failures (bad input, auth, not found, etc.) and the Express error
 * middleware that converts any thrown error into a JSON response.
 * Must be registered last in the middleware chain (see server.ts).
 */
import { Request, Response, NextFunction } from 'express';

// Thrown by controllers/services for expected failures; carries the HTTP
// status code to send back. `isOperational` distinguishes these from bugs.
export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: Error | AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  if (err instanceof AppError) {
    // Known/expected error: trust its status code and message verbatim,
    // only leaking the stack trace outside production for debugging.
    return res.status(err.statusCode).json({
      success: false,
      error: err.message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
  }

  // Unknown errors — treat as 500 and avoid leaking internals in production
  console.error('Unexpected error:', err);
  return res.status(500).json({
    success: false,
    error: 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { 
      message: err.message,
      stack: err.stack 
    })
  });
};

