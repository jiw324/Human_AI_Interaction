USE human_ai_interaction;

-- Create configs table
CREATE TABLE IF NOT EXISTS configs (
  config_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `key` VARCHAR(255) NOT NULL UNIQUE,
  value TEXT NULL,
  description TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_key (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='System configuration table';

-- Add model parameters to tasks table (without IF NOT EXISTS)
-- If columns already exist, this will error but it's safe to ignore
ALTER TABLE tasks 
  ADD COLUMN model_id VARCHAR(255) NULL COMMENT 'AI model identifier',
  ADD COLUMN top_p FLOAT DEFAULT 1.0 COMMENT 'AI model top_p parameter',
  ADD COLUMN presence_penalty FLOAT DEFAULT 0.0 COMMENT 'AI model presence penalty',
  ADD COLUMN frequency_penalty FLOAT DEFAULT 0.0 COMMENT 'AI model frequency penalty';

-- Insert default configuration
INSERT INTO configs (`key`, value, description) VALUES
  ('LITELLM_API_BASE', 'http://localhost:8000', 'Base URL for LiteLLM service'),
  ('LITELLM_API_KEY', '', 'LiteLLM API Key'),
  ('OPENAI_API_KEY', '', 'OpenAI API Key'),
  ('ANTHROPIC_API_KEY', '', 'Anthropic API Key'),
  ('AUTO_UPDATE_MODELS', 'false', 'Auto-update models flag'),
  ('DEFAULT_AI_MODEL', 'gpt-3.5-turbo', 'Default AI model')
ON DUPLICATE KEY UPDATE description = VALUES(description);

-- Update existing tasks with default values
UPDATE tasks 
SET 
  model_id = 'gpt-3.5-turbo',
  top_p = 1.0,
  presence_penalty = 0.0,
  frequency_penalty = 0.0
WHERE model_id IS NULL;

SELECT 'LiteLLM migration completed successfully!' AS Status;