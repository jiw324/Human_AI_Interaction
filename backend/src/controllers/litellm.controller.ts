/**
 * LiteLLM Controller
 * API endpoints for LiteLLM configuration and model management.
 * Reads/writes proxy settings (base URL, provider keys, default model)
 * via `configService` and proxies model-list/connection checks to
 * `liteLLMService`, which talks to the actual LiteLLM proxy.
 */

import { Request, Response, NextFunction } from 'express';
import { liteLLMService } from '../services/litellm.service';
import { configService } from '../services/config.service';
import { AppError } from '../middleware/error.middleware';

interface LiteLLMConfigUpdateDTO {
  apiBaseUrl?: string;
  apiKey?: string;
  openaiKey?: string;
  anthropicKey?: string;
  autoUpdateModels?: boolean;
  defaultModel?: string;
}

export const liteLLMController = {
  /**
   * GET /api/litellm/models
   * Get available models from LiteLLM
   */
  async getModels(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      void req;
      console.log('📡 [LiteLLM] Fetching available models...');
      
      const response = await liteLLMService.getModelsList();

      if (response.success) {
        console.log(`✅ [LiteLLM] Found ${response.models.length} models`);
        res.json({
          success: true,
          models: response.models,
          count: response.models.length,
        });
      } else {
        console.error(`❌ [LiteLLM] Failed to get models: ${response.error}`);
        res.status(500).json({
          success: false,
          error: response.error || 'Failed to get model list',
          models: [],
        });
      }
    } catch (error) {
      console.error('❌ [LiteLLM] Error getting models:', error);
      next(new AppError(`Failed to get model list: ${(error as Error).message}`, 500));
    }
  },

  /**
   * GET /api/litellm/config
   * Get current LiteLLM configuration
   */
  async getConfig(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      void req;
      console.log('🔧 [LiteLLM] Fetching configuration...');
      
      const config = await configService.getLiteLLMConfig();

      // Truncate secrets before sending to the client — full keys never
      // leave the server once stored.
      const sanitizedConfig = {
        apiBaseUrl: config.apiBaseUrl,
        apiKey: config.apiKey ? `${config.apiKey.substring(0, 4)}...` : '',
        openaiKey: config.openaiKey ? `${config.openaiKey.substring(0, 7)}...` : '',
        anthropicKey: config.anthropicKey ? `${config.anthropicKey.substring(0, 7)}...` : '',
        autoUpdateModels: config.autoUpdateModels,
        defaultModel: config.defaultModel,
      };

      console.log('✅ [LiteLLM] Configuration retrieved');
      res.json({
        success: true,
        config: sanitizedConfig,
      });
    } catch (error) {
      console.error('❌ [LiteLLM] Error getting config:', error);
      next(new AppError(`Failed to get configuration: ${(error as Error).message}`, 500));
    }
  },

  /**
   * POST /api/litellm/config
   * Update LiteLLM configuration
   */
  async updateConfig(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const dto: LiteLLMConfigUpdateDTO = req.body;
      console.log('🔧 [LiteLLM] Updating configuration...');

      // Update configuration
      await configService.updateLiteLLMConfig(dto);

      // Test connection if API base URL was updated
      let connectionTest = null;
      if (dto.apiBaseUrl) {
        console.log('🔌 [LiteLLM] Testing connection to new API base URL...');
        connectionTest = await liteLLMService.testConnection();
      }

      console.log('✅ [LiteLLM] Configuration updated successfully');
      res.json({
        success: true,
        message: 'Configuration updated successfully',
        connectionTest,
      });
    } catch (error) {
      console.error('❌ [LiteLLM] Error updating config:', error);
      next(new AppError(`Failed to update configuration: ${(error as Error).message}`, 500));
    }
  },

  /**
   * POST /api/litellm/test-connection
   * Test connection to LiteLLM service
   */
  async testConnection(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      void req;
      console.log('🔌 [LiteLLM] Testing connection...');
      
      const result = await liteLLMService.testConnection();

      if (result.success) {
        console.log(`✅ [LiteLLM] Connection successful (${result.models} models available)`);
      } else {
        console.error(`❌ [LiteLLM] Connection failed: ${result.message}`);
      }

      res.json(result);
    } catch (error) {
      console.error('❌ [LiteLLM] Error testing connection:', error);
      next(new AppError(`Connection test failed: ${(error as Error).message}`, 500));
    }
  },
};

