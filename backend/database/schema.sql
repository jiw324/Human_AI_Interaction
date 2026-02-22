-- Create and select the database
CREATE DATABASE IF NOT EXISTS human_ai_interaction
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE human_ai_interaction;

-- ============================================
-- Users Table
-- ============================================
CREATE TABLE users (
    id VARCHAR(50) PRIMARY KEY DEFAULT (UUID()),
    username VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    research_key VARCHAR(255) UNIQUE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_username (username),
    INDEX idx_email (email),
    INDEX idx_research_key (research_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ============================================
-- Tasks Table (Simplified)
-- ============================================
CREATE TABLE tasks (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    system_prompt TEXT NOT NULL,
    task_prompt TEXT,
    default_model VARCHAR(255),
    chatbot_name VARCHAR(255),

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_name (name),
    UNIQUE KEY unique_user_task_name (user_id, name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ============================================
-- AI Models Table
-- ============================================
CREATE TABLE ai_models (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    name VARCHAR(255) NOT NULL,
    model_id VARCHAR(255) NOT NULL UNIQUE,
    provider VARCHAR(100) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'available',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_provider (provider),
    INDEX idx_model_id (model_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- System Configs Table (Key/Value Store)
-- ============================================
-- Required by backend config service. Kept separate from per-task settings.
CREATE TABLE IF NOT EXISTS configs (
    config_id INT AUTO_INCREMENT PRIMARY KEY,
    `key` VARCHAR(255) NOT NULL UNIQUE,
    value TEXT NULL,
    description TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_key (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Conversations Table (Hard deletes only)
-- ============================================
CREATE TABLE conversations (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    ai_model_name VARCHAR(255),
    ai_model_personality VARCHAR(50),
    ai_model_icon VARCHAR(10),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_message_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_last_message (last_message_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ============================================
-- Messages Table
-- ============================================
CREATE TABLE messages (
    id VARCHAR(36) PRIMARY KEY,
    conversation_id VARCHAR(36) NOT NULL,
    text TEXT NOT NULL,
    sender ENUM('user', 'ai') NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    INDEX idx_conversation_id (conversation_id),
    INDEX idx_timestamp (timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ============================================
-- Insert Default Data
-- ============================================

-- Insert default configurations
INSERT INTO configs (`key`, value, description) VALUES
('ADMIN_KEY', 'admin123', 'Admin panel access key'),
('LITELLM_BASE_URL', 'https://litellm.cloud.osu.edu', 'LiteLLM proxy base URL'),
('LITELLM_API_KEY', '', 'LiteLLM API key (optional)');

-- Insert AI models
INSERT INTO ai_models (name, model_id, provider, description, status) VALUES
('Claude V2.1', 'anthropic.claude-v2:1', 'Anthropic', 'Claude 2.1 - Enhanced reasoning and analysis', 'available'),
('Claude V3.5 Sonnet', 'anthropic.claude-3-5-sonnet-20241022-v2:0', 'Anthropic', 'Claude 3.5 Sonnet - Latest version', 'available'),
('Claude V3.7 Sonnet', 'anthropic.claude-3-sonnet-20240229-v1:0', 'Anthropic', 'Claude 3.7 Sonnet - Most recent model', 'available'),
('Claude V3', 'anthropic.claude-v3', 'Anthropic', 'Claude 3 - Base model', 'available'),
('Claude V2', 'anthropic.claude-v2', 'Anthropic', 'Claude 2 - Previous generation', 'available'),
('Meta Llama 3.3B', 'meta.llama3-3b-instruct-v1:0', 'Meta', 'Llama 3 - 3B parameter model', 'available'),
('Meta Llama 3.7B', 'meta.llama3-7b-instruct-v1:0', 'Meta', 'Llama 3 - 7B parameter model', 'available'),
('GPT-3.5 Turbo', 'gpt-3.5-turbo', 'OpenAI', 'GPT-3.5 Turbo - Fast and efficient', 'available'),
('GPT-4', 'gpt-4', 'OpenAI', 'GPT-4 - Most capable OpenAI model', 'available'),
('Amazon Titan Lite', 'amazon.titan-text-lite-v1', 'Amazon', 'Titan Text Lite - Lightweight model', 'available'),
('Amazon Titan Express', 'amazon.titan-text-express-v1', 'Amazon', 'Titan Text Express - Fast responses', 'available'),
('Mistral 7B Instruct', 'mistral.mistral-7b-instruct-v0:2', 'Mistral AI', 'Mistral 7B - Instruction-tuned model', 'available'),
('Mistral 8x7B', 'mistral.mixtral-8x7b-instruct-v0:1', 'Mistral AI', 'Mistral 8x7B - Mixture of experts', 'available'),
('Nova Pro', 'amazon.nova-pro-v1:0', 'Amazon', 'Nova Pro - Advanced reasoning', 'available'),
('Nova Lite', 'amazon.nova-lite-v1:0', 'Amazon', 'Nova Lite - Efficient processing', 'available'),
('Titan Text Embeddings V2', 'amazon.titan-embed-text-v2:0', 'Amazon', 'Text embeddings model', 'available');

-- Insert default user — use a UUID so the study/research URLs are consistent with all other groups
SET @admin_id = UUID();
INSERT INTO users (id, username, email, research_key) VALUES
(@admin_id, 'admin', 'admin@example.com', 'research-key-123');
