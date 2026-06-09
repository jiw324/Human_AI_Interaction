/**
 * Configuration Types
 * TypeScript interfaces for the generic key/value `configs` table
 * (`ConfigRow`/`ConfigUpdateDTO`) and the typed view of LiteLLM-related
 * settings (`LiteLLMConfig`) used by config.service.ts.
 */

// One row of the `configs` table — generic key/value config storage.
export interface ConfigRow {
  config_id: number;
  key: string;
  value: string | null;
  description: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface ConfigUpdateDTO {
  key: string;
  value: string;
  description?: string;
}

// Structured, typed view over the LITELLM_*/​*_API_KEY rows in `configs`,
// assembled by configService.getLiteLLMConfig().
export interface LiteLLMConfig {
  apiBaseUrl: string;
  apiKey?: string;
  openaiKey?: string;
  anthropicKey?: string;
  googleKey?: string;
  mistralKey?: string;
  cohereKey?: string;
  replicateKey?: string;
  huggingfaceKey?: string;
  autoUpdateModels: boolean;
  defaultModel: string;
}

