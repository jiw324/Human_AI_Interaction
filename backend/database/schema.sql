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
-- Tasks Table (with System Configuration)
-- ============================================
CREATE TABLE tasks (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,

    -- AI Model Settings
    personality VARCHAR(50) DEFAULT 'friendly',
    response_speed DECIMAL(3,1) DEFAULT 1.0,
    creativity DECIMAL(3,2) DEFAULT 0.7,
    helpfulness DECIMAL(3,2) DEFAULT 0.9,
    verbosity DECIMAL(3,2) DEFAULT 0.6,
    temperature DECIMAL(3,2) DEFAULT 0.7,
    max_tokens INT DEFAULT 1000,
    system_prompt TEXT NOT NULL,
    -- NOTE: MySQL does not allow DEFAULT values on TEXT/BLOB columns.
    -- Store the default prompt in application code or set it explicitly in INSERT statements.
    task_prompt TEXT,

    -- System Configuration Settings (Task-specific)
    llama_base_url VARCHAR(500) DEFAULT 'https://llm-proxy.oai-at.org/',
    llama_service_url VARCHAR(500),
    llama_api_key VARCHAR(500),
    openai_api_key VARCHAR(500),
    anthropic_api_key VARCHAR(500),
    default_model VARCHAR(255),
    auto_update_robot_list BOOLEAN DEFAULT FALSE,

    -- Metadata
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_name (name),
    INDEX idx_active (is_active),
    UNIQUE KEY unique_user_task_name (user_id, name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci;

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

-- Insert default user — use a UUID so the study/research URLs are consistent with all other groups
SET @admin_id = UUID();
INSERT INTO users (id, username, email, research_key) VALUES
(@admin_id, 'admin', 'admin@example.com', 'research-key-123');

-- Insert default tasks for admin user (references @admin_id set above)
INSERT INTO tasks (
    id, user_id, name, personality, response_speed, creativity, helpfulness,
    verbosity, temperature, max_tokens, system_prompt, task_prompt,
    llama_base_url, llama_service_url, llama_api_key, openai_api_key,
    anthropic_api_key, default_model, auto_update_robot_list
) VALUES
(UUID(), @admin_id, 'Task 1', 'analytical', 1.0, 0.7, 0.9, 0.6, 0.7, 1000,
 'You are a helpful AI assistant. Be friendly, informative, and engaging in your responses.',
 'Focus on analytical and logical reasoning.',
 'https://llm-proxy.oai-at.org/', '', '', '', '', 'gpt-4o-2024-11-20', FALSE),
(UUID(), @admin_id, 'Task 2', 'creative', 1.0, 0.9, 0.9, 0.7, 0.8, 1500,
 'You are a creative AI assistant. Think outside the box and provide innovative solutions.',
 'Be imaginative and explore different perspectives.',
 'https://llm-proxy.oai-at.org/', '', '', '', '', 'claude-3-5-sonnet-20241022', FALSE),
(UUID(), @admin_id, 'Task 3', 'expert', 1.0, 0.5, 1.0, 0.8, 0.6, 2000,
 'You are an expert AI assistant. Provide authoritative and detailed information.',
 'Focus on accuracy and comprehensive explanations.',
 'https://llm-proxy.oai-at.org/', '', '', '', '', 'gpt-4o-2024-11-20', FALSE),
(UUID(), @admin_id, 'Task 4', 'friendly', 1.0, 0.7, 0.9, 0.6, 0.7, 1000,
 'You are a helpful AI assistant. Be friendly, informative, and engaging in your responses.',
 'Maintain a warm and approachable tone.',
 'https://llm-proxy.oai-at.org/', '', '', '', '', 'nova-pro-v1', FALSE);

-- ============================================
-- Indexes for Performance Optimization
-- ============================================

-- Additional composite index for common queries
CREATE INDEX idx_tasks_user_active ON tasks(user_id, is_active, created_at);
