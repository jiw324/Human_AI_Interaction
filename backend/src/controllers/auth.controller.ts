/**
 * Researcher authentication: exchanges a `research_key` for a JWT, and
 * verifies an existing token. Mounted at /api/auth (see auth.routes.ts).
 * Unlike admin auth, the key is checked against the `users` table, not
 * an environment variable.
 */
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthRequest, AuthResponse } from '../types';
import { AppError } from '../middleware/error.middleware';
import db from '../config/database';

// POST /api/auth/login — looks up an active user by research_key and
// issues a 24h JWT containing their id/username/email.
export const login = async (
  req: Request<{}, {}, AuthRequest>,
  res: Response<AuthResponse>,
  next: NextFunction
) => {
  try {
    const { researchKey } = req.body;
    console.log('🔐 [Backend] Login attempt received');

    if (!researchKey) {
      console.log('❌ [Backend] No research key provided');
      throw new AppError('Research key is required', 400);
    }

    // Validate research key against database
    console.log('🔍 [Backend] Checking research key in database...');
    const user = await db.queryOne(
      'SELECT id, username, email, research_key FROM users WHERE research_key = ? AND is_active = TRUE',
      [researchKey]
    );

    if (!user) {
      console.log('❌ [Backend] Invalid research key - no matching user found');
      throw new AppError('Invalid research key', 401);
    }

    console.log(`✅ [Backend] User found: ${user.username} (${user.email})`);

    // Generate JWT token with user info
    const jwtSecret = process.env.JWT_SECRET || 'fallback-secret-key';

    const token = jwt.sign(
      { 
        id: user.id,
        username: user.username,
        email: user.email
      },
      jwtSecret,
      { expiresIn: '24h' }
    );

    console.log('✅ [Backend] Login successful, token generated');
    console.log(`👤 [Backend] User ID: ${user.id}`);

    res.json({
      success: true,
      token,
      message: 'Login successful'
    });
  } catch (error) {
    console.error('❌ [Backend] Login error:', error);
    next(error);
  }
};

// GET /api/auth/verify — gated by the `authenticate` middleware, so simply
// reaching this handler proves the bearer token is valid.
export const verify = async (
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // If this route is reached, the token is valid (checked by middleware)
    res.json({
      success: true,
      message: 'Token is valid'
    });
  } catch (error) {
    next(error);
  }
};

