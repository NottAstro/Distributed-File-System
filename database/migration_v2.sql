-- =============================================
-- DFS Auth Migration v2
-- Adds: Google OAuth, OTP Login, Password Reset
-- Run: mysql -u root -p distributed_fs < database/migration_v2.sql
-- Safe to run multiple times (uses IF NOT EXISTS)
-- =============================================

USE distributed_fs;

-- -----------------------------------------
-- Modify users table for Google OAuth
-- -----------------------------------------
-- Add google_id column (NULL for local users)
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = 'distributed_fs' AND TABLE_NAME = 'users' AND COLUMN_NAME = 'google_id');
SET @sql = IF(@col_exists = 0, 
    'ALTER TABLE users ADD COLUMN google_id VARCHAR(255) NULL UNIQUE AFTER email', 
    'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add auth_provider column
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = 'distributed_fs' AND TABLE_NAME = 'users' AND COLUMN_NAME = 'auth_provider');
SET @sql = IF(@col_exists = 0, 
    'ALTER TABLE users ADD COLUMN auth_provider ENUM(''local'', ''google'') DEFAULT ''local'' AFTER google_id', 
    'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add avatar_url column
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = 'distributed_fs' AND TABLE_NAME = 'users' AND COLUMN_NAME = 'avatar_url');
SET @sql = IF(@col_exists = 0, 
    'ALTER TABLE users ADD COLUMN avatar_url VARCHAR(500) NULL AFTER auth_provider', 
    'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Make password_hash nullable (Google OAuth users won't have one)
ALTER TABLE users MODIFY COLUMN password_hash VARCHAR(255) NULL;


-- -----------------------------------------
-- Table: otp_codes
-- Purpose: Stores hashed OTP codes for email-based login
-- Security: Codes are bcrypt-hashed, expire in 5 min,
--           max 5 verification attempts per code
-- -----------------------------------------
CREATE TABLE IF NOT EXISTS otp_codes (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    email           VARCHAR(100) NOT NULL,
    code_hash       VARCHAR(255) NOT NULL,
    purpose         ENUM('login', 'verify') DEFAULT 'login',
    attempts        INT DEFAULT 0,
    expires_at      TIMESTAMP NOT NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_otp_email (email),
    INDEX idx_otp_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- -----------------------------------------
-- Table: password_reset_tokens
-- Purpose: Stores hashed password-reset tokens
-- Security: Tokens are SHA-256 hashed, expire in 15 min,
--           single-use, old tokens invalidated on new request
-- -----------------------------------------
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    user_id         INT NOT NULL,
    token_hash      VARCHAR(255) NOT NULL,
    expires_at      TIMESTAMP NOT NULL,
    used            BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_reset_user (user_id),
    INDEX idx_reset_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
