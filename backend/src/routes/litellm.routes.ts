/**
 * LiteLLM Routes
 * API routes for LiteLLM integration
 */

import { Router } from 'express';
import { liteLLMController } from '../controllers/litellm.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Public route — any visitor can browse available models
router.get('/models', liteLLMController.getModels);

// Researcher-only routes — require JWT (config contains API keys)
router.get('/config', authenticate, liteLLMController.getConfig);
router.post('/config', authenticate, liteLLMController.updateConfig);
router.post('/test-connection', authenticate, liteLLMController.testConnection);

export default router;

