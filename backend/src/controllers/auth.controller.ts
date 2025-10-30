import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthRequest, AuthResponse } from '../types';
import { AppError } from '../middleware/error.middleware';
import { v4 as uuidv4 } from 'uuid';

export const login = async (
  req: Request<{}, {}, AuthRequest>,
  res: Response<AuthResponse>,
  next: NextFunction
) => {
  try {
    const { researchKey } = req.body;

    if (!researchKey) {
      throw new AppError('Research key is required', 400);
    }

    // Validate research key
    const validKey = process.env.RESEARCH_KEY || 'admin123';
    
    if (researchKey !== validKey) {
      throw new AppError('Invalid research key', 401);
    }

    // Generate JWT token
    const userId = uuidv4();
    const jwtSecret = process.env.JWT_SECRET || 'fallback-secret-key';

    const token = jwt.sign({ id: userId }, jwtSecret, {
      expiresIn: '24h'
    });

    res.json({
      success: true,
      token,
      message: 'Login successful'
    });
  } catch (error) {
    next(error);
  }
};

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

