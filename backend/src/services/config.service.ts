/**
 * Configuration Service
 * Manages system configuration stored in the database
 */

import { query } from '../config/database';
import { ConfigRow, ConfigUpdateDTO, LiteLLMConfig } from '../types/config.types';
import { ResultSetHeader, RowDataPacket } from 'mysql2';

class ConfigService {
  /**
   * Ensure basic configuration exists on service initialization
   */
  async ensureBasicConfigExists(): Promise<void> {
    const basicConfigs: ConfigUpdateDTO[] = [
      {
        key: 'LITELLM_API_BASE',
        value: 'http://localhost:8000',
        description: 'Base URL for LiteLLM service',
      },
      {
        key: 'LITELLM_API_KEY',
        value: '',
        description: 'LiteLLM API Key (if required)',
      },
      {
        key: 'OPENAI_API_KEY',
        value: '',
        description: 'OpenAI API Key',
      },
      {
        key: 'ANTHROPIC_API_KEY',
        value: '',
        description: 'Anthropic API Key',
      },
      {
        key: 'AUTO_UPDATE_MODELS',
        value: 'false',
        description: 'Whether to automatically update model list from LiteLLM',
      },
      {
        key: 'DEFAULT_AI_MODEL',
        value: 'gpt-3.5-turbo',
        description: 'Default AI model to use if not specified in task',
      },
    ];

    for (const config of basicConfigs) {
      const existing = await this.getByKey(config.key);
      if (!existing) {
        await this.set(config.key, config.value, config.description);
        console.log(`✅ Created configuration: ${config.key}`);
      }
    }
  }

  /**
   * Get all configuration entries
   */
  async getAll(): Promise<ConfigRow[]> {
    const sql = 'SELECT * FROM configs ORDER BY `key`';
    const results = await query<ConfigRow[]>(sql);
    return results;
  }

  /**
   * Get configuration by key
   */
  async getByKey(key: string): Promise<ConfigRow | null> {
    const sql = 'SELECT * FROM configs WHERE `key` = ?';
    const results = await query<ConfigRow[]>(sql, [key]);
    return results.length > 0 ? results[0] : null;
  }

  /**
   * Get configuration value by key
   */
  async getValueByKey(key: string): Promise<string | null> {
    const config = await this.getByKey(key);
    return config ? config.value : null;
  }

  /**
   * Set or update configuration
   */
  async set(key: string, value: string, description?: string): Promise<ConfigRow> {
    const existing = await this.getByKey(key);

    if (existing) {
      // Update existing config
      const sql = `
        UPDATE configs 
        SET value = ?, description = COALESCE(?, description), updated_at = CURRENT_TIMESTAMP 
        WHERE \`key\` = ?
      `;
      await query(sql, [value, description, key]);
    } else {
      // Insert new config
      const sql = `
        INSERT INTO configs (\`key\`, value, description) 
        VALUES (?, ?, ?)
      `;
      await query(sql, [key, value, description || null]);
    }

    // Return the updated/created config
    const result = await this.getByKey(key);
    if (!result) {
      throw new Error(`Failed to retrieve config after set: ${key}`);
    }
    return result;
  }

  /**
   * Batch update configurations
   */
  async batchUpdate(configs: ConfigUpdateDTO[]): Promise<ConfigRow[]> {
    const results: ConfigRow[] = [];

    for (const config of configs) {
      const result = await this.set(config.key, config.value, config.description);
      results.push(result);
    }

    return results;
  }

  /**
   * Delete configuration by key
   */
  async delete(key: string): Promise<boolean> {
    const sql = 'DELETE FROM configs WHERE `key` = ?';
    const result = await query<ResultSetHeader>(sql, [key]);
    return result.affectedRows > 0;
  }

  /**
   * Get LiteLLM configuration as a structured object
   */
  async getLiteLLMConfig(): Promise<LiteLLMConfig> {
    const config: LiteLLMConfig = {
      apiBaseUrl: (await this.getValueByKey('LITELLM_API_BASE')) || 'http://localhost:8000',
      apiKey: (await this.getValueByKey('LITELLM_API_KEY')) || '',
      openaiKey: (await this.getValueByKey('OPENAI_API_KEY')) || '',
      anthropicKey: (await this.getValueByKey('ANTHROPIC_API_KEY')) || '',
      autoUpdateModels: (await this.getValueByKey('AUTO_UPDATE_MODELS')) === 'true',
      defaultModel: (await this.getValueByKey('DEFAULT_AI_MODEL')) || 'gpt-3.5-turbo',
    };

    return config;
  }

  /**
   * Update LiteLLM configuration
   */
  async updateLiteLLMConfig(config: Partial<LiteLLMConfig>): Promise<void> {
    const updates: ConfigUpdateDTO[] = [];

    if (config.apiBaseUrl !== undefined) {
      updates.push({ key: 'LITELLM_API_BASE', value: config.apiBaseUrl });
    }
    if (config.apiKey !== undefined) {
      updates.push({ key: 'LITELLM_API_KEY', value: config.apiKey });
    }
    if (config.openaiKey !== undefined) {
      updates.push({ key: 'OPENAI_API_KEY', value: config.openaiKey });
    }
    if (config.anthropicKey !== undefined) {
      updates.push({ key: 'ANTHROPIC_API_KEY', value: config.anthropicKey });
    }
    if (config.autoUpdateModels !== undefined) {
      updates.push({ key: 'AUTO_UPDATE_MODELS', value: config.autoUpdateModels ? 'true' : 'false' });
    }
    if (config.defaultModel !== undefined) {
      updates.push({ key: 'DEFAULT_AI_MODEL', value: config.defaultModel });
    }

    await this.batchUpdate(updates);
  }
}

// Export singleton instance
export const configService = new ConfigService();

