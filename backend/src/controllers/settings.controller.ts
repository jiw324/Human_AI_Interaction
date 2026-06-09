/**
 * Per-user, per-model AI chat settings (system prompt, etc.).
 *
 * NOTE: storage is an in-memory Map, so settings are lost on server
 * restart and are not shared across server instances — fine for a
 * single-process dev/research deployment, but would need to move to
 * the database for production scale-out.
 */
import { Request, Response, NextFunction } from 'express';
import { AISettings } from '../types';
import { AppError } from '../middleware/error.middleware';

// userId -> (modelName -> settings)
const settingsStore: Map<string, Record<string, AISettings>> = new Map();

// GET /api/settings/:userId — returns all per-model settings for a user,
// or an empty object if none have been saved yet.
export const getSettings = async (
  req: Request<{ userId: string }>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      throw new AppError('User ID is required', 400);
    }

    const userSettings = settingsStore.get(userId) || {};

    res.json({
      success: true,
      settings: userSettings
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/settings/:userId/:modelName — replaces the settings for one
// model; requires a non-empty systemPrompt since that drives AI behavior.
export const updateSettings = async (
  req: Request<{ userId: string; modelName: string }, {}, AISettings>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { userId, modelName } = req.params;
    const settings = req.body;

    if (!userId || !modelName) {
      throw new AppError('User ID and model name are required', 400);
    }

    // Validate settings
    if (!settings.systemPrompt || settings.systemPrompt.trim() === '') {
      throw new AppError('System prompt is required', 400);
    }

    // Get or create user settings
    const userSettings = settingsStore.get(userId) || {};
    userSettings[modelName] = settings;
    settingsStore.set(userId, userSettings);

    res.json({
      success: true,
      message: 'Settings updated successfully',
      settings: settings
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/settings/:userId/:modelName — removes any saved override so
// the model falls back to its default settings.
export const resetSettings = async (
  req: Request<{ userId: string; modelName: string }>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { userId, modelName } = req.params;

    if (!userId || !modelName) {
      throw new AppError('User ID and model name are required', 400);
    }

    const userSettings = settingsStore.get(userId);
    if (userSettings && userSettings[modelName]) {
      delete userSettings[modelName];
      settingsStore.set(userId, userSettings);
    }

    res.json({
      success: true,
      message: 'Settings reset to defaults'
    });
  } catch (error) {
    next(error);
  }
};

