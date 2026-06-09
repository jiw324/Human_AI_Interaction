/**
 * JWT verification middleware.
 *
 * `authenticate` protects regular user routes and attaches the decoded
 * user id to `req.user`; `requireAdmin` additionally checks the token's
 * `role` claim equals 'admin'. Both expect a `Bearer <token>` header and
 * translate jsonwebtoken errors into `AppError`s for the global handler.
 */
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from './error.middleware';

// Extends Express's Request so downstream handlers can read `req.user.id`
// once `authenticate` has run.
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
  };
}

/**
 * Admin middleware — verifies the JWT carries role: 'admin'
 */
export const requireAdmin = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('No token provided', 401);
    }

    const token = authHeader.substring(7); // strip the "Bearer " prefix
    const jwtSecret = process.env.JWT_SECRET || 'fallback-secret-key';

    const decoded = jwt.verify(token, jwtSecret) as { role?: string };

    // Token must have been issued with role: 'admin' (see auth.controller)
    if (decoded.role !== 'admin') {
      throw new AppError('Admin access required', 403);
    }

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new AppError('Invalid token', 401));
    } else if (error instanceof jwt.TokenExpiredError) {
      next(new AppError('Token expired', 401));
    } else {
      next(error);
    }
  }
};

export const authenticate = (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('No token provided', 401);
    }

    const token = authHeader.substring(7);
    const jwtSecret = process.env.JWT_SECRET || 'fallback-secret-key';

    const decoded = jwt.verify(token, jwtSecret) as { id: string };
    req.user = decoded;

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new AppError('Invalid token', 401));
    } else if (error instanceof jwt.TokenExpiredError) {
      next(new AppError('Token expired', 401));
    } else {
      next(error);
    }
  }
};

