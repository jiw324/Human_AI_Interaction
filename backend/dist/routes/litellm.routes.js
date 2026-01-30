"use strict";
/**
 * LiteLLM Routes
 * API routes for LiteLLM integration
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const litellm_controller_1 = require("../controllers/litellm.controller");
const router = (0, express_1.Router)();
// Public routes (no authentication required for now, can add later)
router.get('/models', litellm_controller_1.liteLLMController.getModels);
router.get('/config', litellm_controller_1.liteLLMController.getConfig);
router.post('/config', litellm_controller_1.liteLLMController.updateConfig);
router.post('/test-connection', litellm_controller_1.liteLLMController.testConnection);
exports.default = router;
